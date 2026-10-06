import nodemailer from 'nodemailer';
import { env } from '../config/env';

const RESET_CODE_TTL_MINUTES = 10;
const INVITATION_TTL_DAYS = 7;
type ResetLocale = 'es' | 'en';

export function isMailerConfigured(): boolean {
  return Boolean(env.mailer.user && env.mailer.password && env.mailer.from);
}

export async function sendPasswordResetCode(email: string, code: string, locale: ResetLocale): Promise<void> {
  const copy = locale === 'es'
    ? {
        subject: 'Tu código para restablecer la contraseña de SkyMentor',
        title: 'Restablece tu contraseña',
        intro: 'Usa este código de seguridad para restablecer tu contraseña. Vence en 10 minutos.',
        footer: 'Si no solicitaste este cambio, puedes ignorar este correo con seguridad.',
        text: [
          'Recibimos una solicitud para restablecer tu contraseña de SkyMentor.',
          '',
          `Tu código de seis dígitos es: ${code}`,
          '',
          `Este código vence en ${RESET_CODE_TTL_MINUTES} minutos. Si no solicitaste un restablecimiento de contraseña, puedes ignorar este correo con seguridad.`,
        ].join('\n'),
      }
    : {
        subject: 'Your SkyMentor password reset code',
        title: 'Reset your password',
        intro: 'Use this security code to reset your password. It expires in 10 minutes.',
        footer: 'If you did not request this, you can safely ignore this email.',
        text: [
          'We received a request to reset your SkyMentor password.',
          '',
          `Your six-digit code is: ${code}`,
          '',
          `This code expires in ${RESET_CODE_TTL_MINUTES} minutes. If you did not request a password reset, you can safely ignore this email.`,
        ].join('\n'),
      };

  const transporter = nodemailer.createTransport({
    host: env.mailer.host,
    port: env.mailer.port,
    secure: env.mailer.secure,
    requireTLS: !env.mailer.secure,
    auth: {
      user: env.mailer.user,
      pass: env.mailer.password,
    },
    tls: {
      minVersion: 'TLSv1.2',
    },
  });

  const info = await transporter.sendMail({
    from: `SkyMentor <${env.mailer.from}>`,
    to: email,
    subject: copy.subject,
    text: copy.text,
    html: `
      <div style="margin:0;padding:32px 20px;background:#f3f8fc;color:#102238;font-family:Arial,sans-serif;line-height:1.5">
        <div style="max-width:520px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #d8e6ef;border-radius:16px">
          <p style="margin:0;color:#087fa1;font-size:12px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase">SkyMentor</p>
          <h1 style="margin:20px 0 12px;font-size:26px;line-height:1.2;color:#071827">${copy.title}</h1>
          <p style="margin:0;color:#50677d">${copy.intro}</p>
          <p style="margin:28px 0;padding:18px;border-radius:12px;background:#edf6fb;color:#071827;font-size:30px;font-weight:700;letter-spacing:8px;text-align:center">${code}</p>
          <p style="margin:0;color:#61758a;font-size:14px">${copy.footer}</p>
        </div>
      </div>
    `,
  });

  if (info.rejected.length > 0) {
    throw new Error('The SMTP server rejected the password reset recipient.');
  }
}

export interface AccountInvitationInput {
  email: string;
  name: string;
  token: string;
  accessEndsAt?: Date;
  locale: ResetLocale;
}

function formatInvitationDate(accessEndsAt: Date, locale: ResetLocale): string {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-VE' : 'en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(accessEndsAt);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character]!));
}

export function getAccountInvitationCopy(accessEndsAt: Date | undefined, locale: ResetLocale) {
  const accessDate = accessEndsAt ? formatInvitationDate(accessEndsAt, locale) : undefined;
  return locale === 'es'
    ? {
        subject: 'Tu invitación a SkyMentor',
        title: 'Configura tu cuenta',
        intro: accessDate
          ? `Un administrador creó tu cuenta de SkyMentor. Tu suscripción manual vence el ${accessDate}.`
          : 'Un administrador creó tu cuenta de SkyMentor. Cuando configures tu contraseña, podrás suscribirte para acceder al contenido.',
        action: 'Elegir mi contraseña',
        expiry: `Este enlace vence en ${INVITATION_TTL_DAYS} días y solo puede usarse una vez.`,
        footer: 'Si no esperabas esta invitación, puedes ignorar este correo con seguridad.',
      }
    : {
        subject: 'Your SkyMentor invitation',
        title: 'Set up your account',
        intro: accessDate
          ? `An administrator created your SkyMentor account. Your manual subscription expires on ${accessDate}.`
          : 'An administrator created your SkyMentor account. Once you set your password, you can subscribe to access the content.',
        action: 'Choose my password',
        expiry: `This link expires in ${INVITATION_TTL_DAYS} days and can only be used once.`,
        footer: 'If you were not expecting this invitation, you can safely ignore this email.',
      };
}

export async function sendAccountInvitation({
  email,
  name,
  token,
  accessEndsAt,
  locale,
}: AccountInvitationInput): Promise<void> {
  const invitationUrl = new URL('/accept-invitation', `${env.appUrl}/`);
  invitationUrl.searchParams.set('token', token);
  const copy = getAccountInvitationCopy(accessEndsAt, locale);
  const safeInvitationUrl = escapeHtml(invitationUrl.toString());

  const transporter = nodemailer.createTransport({
    host: env.mailer.host,
    port: env.mailer.port,
    secure: env.mailer.secure,
    requireTLS: !env.mailer.secure,
    auth: { user: env.mailer.user, pass: env.mailer.password },
    tls: { minVersion: 'TLSv1.2' },
  });

  const info = await transporter.sendMail({
    from: `SkyMentor <${env.mailer.from}>`,
    to: email,
    subject: copy.subject,
    text: [
      `Hola ${name},`,
      '',
      copy.intro,
      '',
      `${copy.action}: ${invitationUrl.toString()}`,
      '',
      copy.expiry,
      copy.footer,
    ].join('\n'),
    html: `
      <div style="margin:0;padding:32px 20px;background:#f3f8fc;color:#102238;font-family:Arial,sans-serif;line-height:1.5">
        <div style="max-width:520px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #d8e6ef;border-radius:16px">
          <p style="margin:0;color:#087fa1;font-size:12px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase">SkyMentor</p>
          <h1 style="margin:20px 0 12px;font-size:26px;line-height:1.2;color:#071827">${escapeHtml(copy.title)}</h1>
          <p style="margin:0;color:#50677d">${escapeHtml(copy.intro)}</p>
          <p style="margin:26px 0"><a href="${safeInvitationUrl}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#087fa1;color:#ffffff;font-weight:700;text-decoration:none">${escapeHtml(copy.action)}</a></p>
          <p style="margin:0;color:#61758a;font-size:14px">${escapeHtml(copy.expiry)}</p>
          <p style="margin:12px 0 0;color:#61758a;font-size:14px">${escapeHtml(copy.footer)}</p>
        </div>
      </div>
    `,
  });

  if (info.rejected.length > 0) {
    throw new Error('The SMTP server rejected the invitation recipient.');
  }
}

export { INVITATION_TTL_DAYS, RESET_CODE_TTL_MINUTES };
