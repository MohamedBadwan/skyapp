'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useLang } from '@/context/LangContext';

type ResetStage = 'request' | 'verify' | 'password' | 'complete';

export default function ForgotPasswordPage() {
  const { lang } = useLang();
  const [stage, setStage] = useState<ResetStage>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await api.requestPasswordReset(email, lang);
      setMessage(response.message);
      setCode('');
      setStage('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await api.verifyPasswordResetCode(email, code, lang);
      setResetToken(response.resetToken);
      setMessage(response.message);
      setStage('password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(lang === 'es' ? 'Las contraseñas no coinciden.' : 'Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const response = await api.resetPassword(resetToken, password, lang);
      setMessage(response.message);
      setStage('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await api.requestPasswordReset(email, lang);
      setCode('');
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card w-full" aria-labelledby="forgot-password-title">
        <p className="auth-logo">SkyMentor</p>

        {stage === 'request' && (
          <>
            <h1 id="forgot-password-title" className="mb-2 mt-4 text-3xl font-bold tracking-tight text-slate-800">
              {lang === 'es' ? 'Restablece tu contraseña' : 'Reset your password'}
            </h1>
            <p className="mb-7 text-sm leading-6 text-slate-500">
              {lang === 'es'
                ? 'Escribe el email de tu cuenta y te enviaremos un código de seis dígitos.'
                : 'Enter your account email and we’ll send you a six-digit code.'}
            </p>

            <form onSubmit={requestCode} className="space-y-5">
              <div>
                <label className="label" htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-500" role="alert">{error}</p>}

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? '…' : lang === 'es' ? 'Enviar código' : 'Send code'}
              </button>
            </form>
          </>
        )}

        {stage === 'verify' && (
          <>
            <h1 id="forgot-password-title" className="mb-2 mt-4 text-3xl font-bold tracking-tight text-slate-800">
              {lang === 'es' ? 'Ingresa tu código' : 'Enter your code'}
            </h1>
            <p className="mb-7 text-sm leading-6 text-slate-500">
              {lang === 'es'
                ? <>Enviamos un código de seis dígitos a <strong className="font-semibold text-[var(--text)]">{email}</strong>. Vence en 10 minutos.</>
                : <>We sent a six-digit code to <strong className="font-semibold text-[var(--text)]">{email}</strong>. It expires in 10 minutes.</>}
            </p>

            {message && <p className="mb-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-600" role="status">{message}</p>}

            <form onSubmit={verifyCode} className="space-y-5">
              <div>
                <label className="label" htmlFor="reset-code">{lang === 'es' ? 'Código de seis dígitos' : 'Six-digit code'}</label>
                <input
                  id="reset-code"
                  type="text"
                  className="input reset-code-input"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
              </div>

              {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-500" role="alert">{error}</p>}

              <button type="submit" className="btn-primary w-full" disabled={busy || code.length !== 6}>
                {busy ? '…' : lang === 'es' ? 'Verificar código' : 'Verify code'}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
              <p>{lang === 'es' ? '¿No recibiste el código?' : "Didn't receive the code?"}</p>
              <button type="button" onClick={resendCode} className="mt-2 font-semibold text-brand-600 hover:underline" disabled={busy}>
                {lang === 'es' ? 'Enviar otro código' : 'Send another code'}
              </button>
            </div>
          </>
        )}

        {stage === 'password' && (
          <>
            <h1 id="forgot-password-title" className="mb-2 mt-4 text-3xl font-bold tracking-tight text-slate-800">
              {lang === 'es' ? 'Elige una nueva contraseña' : 'Choose a new password'}
            </h1>
            <p className="mb-7 text-sm leading-6 text-slate-500" role="status">
              {message}
            </p>

            <form onSubmit={updatePassword} className="space-y-4">
              <div>
                <label className="label" htmlFor="reset-password">{lang === 'es' ? 'Nueva contraseña (mín. 8)' : 'New password (min. 8)'}</label>
                <div className="relative">
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-11"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[var(--muted)] transition hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? (lang === 'es' ? 'Ocultar contraseña' : 'Hide password') : (lang === 'es' ? 'Mostrar contraseña' : 'Show password')}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="reset-password-confirm">{lang === 'es' ? 'Confirmar nueva contraseña' : 'Confirm new password'}</label>
                <div className="relative">
                  <input
                    id="reset-password-confirm"
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-11"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[var(--muted)] transition hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? (lang === 'es' ? 'Ocultar contraseña' : 'Hide password') : (lang === 'es' ? 'Mostrar contraseña' : 'Show password')}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-500" role="alert">{error}</p>}

              <button type="submit" className="btn-primary w-full" disabled={busy || !resetToken}>
                {busy ? '…' : lang === 'es' ? 'Actualizar contraseña' : 'Update password'}
              </button>
            </form>
          </>
        )}

        {stage === 'complete' && (
          <>
            <h1 id="forgot-password-title" className="mb-2 mt-4 text-3xl font-bold tracking-tight text-slate-800">
              {lang === 'es' ? 'Contraseña actualizada' : 'Password updated'}
            </h1>
            <p className="mb-7 text-sm leading-6 text-slate-500" role="status">{message}</p>
            <Link href="/login" className="btn-primary w-full">
              {lang === 'es' ? 'Ir a iniciar sesión' : 'Go to log in'}
            </Link>
          </>
        )}

        {stage !== 'complete' && (
          <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              {lang === 'es' ? 'Volver a iniciar sesión' : 'Back to log in'}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
