'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { useLang } from '@/context/LangContext';

function InvitationAcceptanceContent() {
  const { lang } = useLang();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = (es: string, en: string) => (lang === 'es' ? es : en);
  const hasValidToken = /^[a-f0-9]{64}$/.test(token);

  const acceptInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t('Las contraseñas no coinciden.', 'Passwords do not match.'));
      return;
    }

    setBusy(true);
    try {
      const response = await api.acceptInvitation(token, password);
      setMessage(response.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('No se pudo aceptar la invitación.', 'We could not accept the invitation.'));
    } finally {
      setBusy(false);
    }
  };

  if (!hasValidToken) {
    return (
      <div className="auth-shell">
        <section className="card auth-card w-full invitation-card" aria-labelledby="invitation-invalid-title">
          <span className="invitation-card-icon invitation-card-icon-error"><Mail aria-hidden="true" /></span>
          <p className="auth-logo">SkyMentor</p>
          <h1 id="invitation-invalid-title">{t('Enlace de invitación inválido', 'Invalid invitation link')}</h1>
          <p>{t('Este enlace está incompleto o ya no es válido. Pide al administrador que te envíe una nueva invitación.', 'This link is incomplete or no longer valid. Ask your administrator to send a new invitation.')}</p>
          <Link href="/login" className="btn-primary w-full">{t('Ir a iniciar sesión', 'Go to log in')}</Link>
        </section>
      </div>
    );
  }

  if (message) {
    return (
      <div className="auth-shell">
        <section className="card auth-card w-full invitation-card" aria-labelledby="invitation-complete-title">
          <span className="invitation-card-icon"><CheckCircle2 aria-hidden="true" /></span>
          <p className="auth-logo">SkyMentor</p>
          <h1 id="invitation-complete-title">{t('Tu cuenta está lista', 'Your account is ready')}</h1>
          <p role="status">{message}</p>
          <Link href="/login" className="btn-primary w-full">{t('Iniciar sesión', 'Log in')}</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <section className="card auth-card w-full invitation-card" aria-labelledby="accept-invitation-title">
        <span className="invitation-card-icon"><KeyRound aria-hidden="true" /></span>
        <p className="auth-logo">SkyMentor</p>
        <h1 id="accept-invitation-title">{t('Elige tu contraseña', 'Choose your password')}</h1>
        <p>{t('Configura una contraseña para activar tu cuenta de SkyMentor.', 'Set a password to activate your SkyMentor account.')}</p>

        <form onSubmit={acceptInvitation} className="invitation-form">
          <label className="label" htmlFor="invitation-password">{t('Contraseña nueva (mín. 8)', 'New password (min. 8)')}</label>
          <PasswordInput id="invitation-password" value={password} onChange={setPassword} show={showPassword} onShowChange={setShowPassword} label={t('Mostrar contraseña', 'Show password')} hideLabel={t('Ocultar contraseña', 'Hide password')} />

          <label className="label" htmlFor="invitation-password-confirm">{t('Confirmar contraseña', 'Confirm password')}</label>
          <PasswordInput id="invitation-password-confirm" value={confirmPassword} onChange={setConfirmPassword} show={showPassword} onShowChange={setShowPassword} label={t('Mostrar contraseña', 'Show password')} hideLabel={t('Ocultar contraseña', 'Hide password')} />

          {error && <p className="invitation-error" role="alert">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={busy || password.length < 8 || confirmPassword.length < 8}>
            {busy ? '…' : t('Activar mi cuenta', 'Activate my account')}
          </button>
        </form>

        <p className="invitation-footer">{t('¿El enlace venció? Pide al administrador que lo reenvíe.', 'Did the link expire? Ask your administrator to resend it.')}</p>
      </section>
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onShowChange,
  label,
  hideLabel,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onShowChange: (show: boolean) => void;
  label: string;
  hideLabel: string;
}) {
  return (
    <div className="invitation-password-input">
      <input id={id} type={show ? 'text' : 'password'} className="input" value={value} onChange={(event) => onChange(event.target.value)} autoComplete="new-password" minLength={8} required />
      <button type="button" onClick={() => onShowChange(!show)} aria-label={show ? hideLabel : label} aria-pressed={show}>
        {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="auth-shell" aria-busy="true" />}>
      <InvitationAcceptanceContent />
    </Suspense>
  );
}
