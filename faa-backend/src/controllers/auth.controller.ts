import { Request, Response } from 'express';
import { createHash, randomBytes, randomInt } from 'crypto';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { User, hashPassword } from '../models/User';
import { signToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { isMailerConfigured, RESET_CODE_TTL_MINUTES, sendPasswordResetCode } from '../services/mailer';
import { getAccessSource } from '../services/entitlements';
import { hashInvitationToken, isInvitationUsable } from '../services/invitations';

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const resetLocaleSchema = z.enum(['es', 'en']);
export type ResetLocale = z.infer<typeof resetLocaleSchema>;

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
  locale: resetLocaleSchema.default('es'),
});

export const passwordResetVerificationSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  locale: resetLocaleSchema.default('es'),
});

export const passwordResetSchema = z.object({
  resetToken: z.string().regex(/^[a-f0-9]{64}$/),
  password: z.string().min(8).max(100),
  locale: resetLocaleSchema.default('es'),
});

export const invitationAcceptanceSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: z.string().min(8).max(100),
});

const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_TOKEN_TTL_MINUTES = 10;

const passwordResetMessages = {
  es: {
    request: 'Si existe una cuenta con ese correo, recibirás un código para restablecer tu contraseña.',
    unavailable: 'El correo de restablecimiento no está disponible en este momento. Intenta de nuevo más tarde.',
    sendFailed: 'No fue posible enviar el correo de restablecimiento. Intenta de nuevo más tarde.',
    invalidCode: 'El código es inválido o ha vencido. Solicita uno nuevo.',
    verified: 'Código verificado. Ahora puedes elegir una nueva contraseña.',
    expired: 'La sesión de restablecimiento venció. Solicita un código nuevo.',
    updated: 'Tu contraseña se actualizó correctamente.',
  },
  en: {
    request: 'If an account exists for that email, you will receive a password reset code.',
    unavailable: 'Password reset email is unavailable right now. Please try again later.',
    sendFailed: 'We could not send the password reset email. Please try again later.',
    invalidCode: 'The code is invalid or has expired. Request a new one.',
    verified: 'Code verified. You can now choose a new password.',
    expired: 'Your password reset session has expired. Request a new code.',
    updated: 'Your password was updated successfully.',
  },
} as const;

function getPasswordResetMessages(locale: ResetLocale) {
  return passwordResetMessages[locale];
}

function clearPasswordResetCode(user: InstanceType<typeof User>): void {
  user.passwordResetCodeHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.passwordResetAttempts = 0;
}

function clearPasswordResetToken(user: InstanceType<typeof User>): void {
  user.passwordResetTokenHash = undefined;
  user.passwordResetTokenExpiresAt = undefined;
}

function serializeUser(user: InstanceType<typeof User>) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    currentPeriodEnd: user.currentPeriodEnd,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
    manualAccessEndsAt: user.manualAccessEndsAt,
    accessSource: getAccessSource(user),
    createdAt: user.createdAt,
  };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body as z.infer<typeof registerSchema>;

  const exists = await User.findOne({ email });
  if (exists) throw ApiError.conflict('Ya existe una cuenta con ese correo.');

  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email, passwordHash, role: 'student' });

  const token = signToken({ sub: user._id.toString(), role: user.role, email: user.email });
  res.status(201).json({
    ok: true,
    token,
    user: serializeUser(user),
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.active) throw ApiError.unauthorized('Credenciales inválidas.');

  const match = await user.comparePassword(password);
  if (!match) throw ApiError.unauthorized('Credenciales inválidas.');

  const token = signToken({ sub: user._id.toString(), role: user.role, email: user.email });
  res.json({
    ok: true,
    token,
    user: serializeUser(user),
  });
});

export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email, locale } = req.body as z.infer<typeof passwordResetRequestSchema>;
  const messages = getPasswordResetMessages(locale);
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  // The response is intentionally identical for existing and unknown email
  // addresses so this endpoint cannot be used to enumerate accounts.
  if (!user || !user.active) {
    res.json({ ok: true, message: messages.request });
    return;
  }

  if (!isMailerConfigured()) {
    throw new ApiError(503, messages.unavailable);
  }

  const code = String(randomInt(100_000, 1_000_000));
  user.passwordResetCodeHash = await bcrypt.hash(code, 10);
  user.passwordResetExpiresAt = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);
  user.passwordResetAttempts = 0;
  clearPasswordResetToken(user);
  await user.save();

  try {
    await sendPasswordResetCode(user.email, code, locale);
  } catch (error) {
    clearPasswordResetCode(user);
    await user.save();
    const mailError = error as { code?: string; responseCode?: number };
    // Keep the response generic, but leave enough context in production logs
    // to distinguish SMTP authentication, TLS, and recipient errors.
    // eslint-disable-next-line no-console
    console.error('[password-reset] Unable to send reset email', {
      code: mailError.code,
      responseCode: mailError.responseCode,
    });
    throw new ApiError(503, messages.sendFailed);
  }

  res.json({ ok: true, message: messages.request });
});

export const verifyPasswordResetCode = asyncHandler(async (req: Request, res: Response) => {
  const { email, code, locale } = req.body as z.infer<typeof passwordResetVerificationSchema>;
  const messages = getPasswordResetMessages(locale);
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select(
    '+passwordResetCodeHash +passwordResetExpiresAt +passwordResetAttempts'
  );

  const now = new Date();
  const canUseCode = Boolean(
    user?.active
      && user.passwordResetCodeHash
      && user.passwordResetExpiresAt
      && user.passwordResetExpiresAt > now
      && user.passwordResetAttempts < PASSWORD_RESET_MAX_ATTEMPTS
  );

  if (!canUseCode || !user) {
    throw ApiError.badRequest(messages.invalidCode);
  }

  const codeMatches = await bcrypt.compare(code, user.passwordResetCodeHash!);
  if (!codeMatches) {
    user.passwordResetAttempts += 1;
    if (user.passwordResetAttempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
      clearPasswordResetCode(user);
    }
    await user.save();
    throw ApiError.badRequest(messages.invalidCode);
  }

  const resetToken = randomBytes(32).toString('hex');
  user.passwordResetTokenHash = createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetTokenExpiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  clearPasswordResetCode(user);
  await user.save();

  res.json({ ok: true, resetToken, message: messages.verified });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { resetToken, password, locale } = req.body as z.infer<typeof passwordResetSchema>;
  const messages = getPasswordResetMessages(locale);
  const tokenHash = createHash('sha256').update(resetToken).digest('hex');
  const user = await User.findOne({ passwordResetTokenHash: tokenHash }).select(
    '+passwordResetTokenHash +passwordResetTokenExpiresAt'
  );

  if (!user || !user.active || !user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt <= new Date()) {
    throw ApiError.badRequest(messages.expired);
  }

  user.passwordHash = await hashPassword(password);
  clearPasswordResetCode(user);
  clearPasswordResetToken(user);
  await user.save();

  res.json({ ok: true, message: messages.updated });
});

export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body as z.infer<typeof invitationAcceptanceSchema>;
  const tokenHash = hashInvitationToken(token);
  const user = await User.findOne({ invitationTokenHash: tokenHash }).select(
    '+invitationTokenHash +passwordHash'
  );

  if (!user || !user.active || !isInvitationUsable({
    tokenHash: user.invitationTokenHash,
    expiresAt: user.invitationExpiresAt,
    acceptedAt: user.invitationAcceptedAt,
  })) {
    throw ApiError.badRequest('La invitación es inválida o venció. Solicita una nueva invitación al administrador.');
  }

  user.passwordHash = await hashPassword(password);
  user.invitationTokenHash = undefined;
  user.invitationExpiresAt = undefined;
  user.invitationAcceptedAt = new Date();
  await user.save();

  res.json({ ok: true, message: 'Tu cuenta está lista. Ahora puedes iniciar sesión.' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.sub);
  if (!user) throw ApiError.notFound('Usuario no encontrado.');
  res.json({
    ok: true,
    user: serializeUser(user),
  });
});
