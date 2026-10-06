'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const { lang } = useLang();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(name, email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card w-full">
        <p className="auth-logo">SkyMentor</p>
        <h1 className="mb-1 mt-4 text-3xl font-bold tracking-tight text-slate-800">
          {lang === 'es' ? 'Crear cuenta' : 'Create account'}
        </h1>
        <p className="mb-7 text-sm leading-6 text-slate-500">
          {lang === 'es' ? 'Empieza a practicar hoy.' : 'Start practicing today.'}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">{lang === 'es' ? 'Nombre' : 'Name'}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">{lang === 'es' ? 'Contraseña (mín. 8)' : 'Password (min. 8)'}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[var(--muted)] transition hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={
                  showPassword
                    ? lang === 'es'
                      ? 'Ocultar contraseña'
                      : 'Hide password'
                    : lang === 'es'
                      ? 'Mostrar contraseña'
                      : 'Show password'
                }
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className="legal-consent">
            <div className="legal-consent-control">
              <input
                id="legal-consent"
                type="checkbox"
                checked={acceptedLegal}
                onChange={(event) => setAcceptedLegal(event.target.checked)}
                required
              />
              <div>
                <label htmlFor="legal-consent" className="legal-consent-label">
                  {lang === 'es' ? 'Confirmo que he leído y acepto los documentos legales.' : 'I confirm that I have read and accept the legal documents.'}
                </label>
                <p className="legal-consent-links">
                  <Link href="/terminos-y-condiciones" target="_blank" rel="noopener noreferrer">
                    {lang === 'es' ? 'Términos y Condiciones' : 'Terms and Conditions'}
                  </Link>
                  <span aria-hidden="true"> y </span>
                  <Link href="/politica-de-privacidad" target="_blank" rel="noopener noreferrer">
                    {lang === 'es' ? 'Política de Privacidad' : 'Privacy Policy'}
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-500">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={busy || !acceptedLegal}>
            {busy ? '…' : lang === 'es' ? 'Registrarme' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
          {lang === 'es' ? '¿Ya tienes cuenta?' : 'Already have an account?'}{' '}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            {lang === 'es' ? 'Inicia sesión' : 'Log in'}
          </Link>
        </p>
      </div>
    </div>
  );
}
