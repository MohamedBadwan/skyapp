'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import { Spinner } from '@/components/Spinner';

export default function CheckoutSuccessPage() {
  const { user, loading, refreshUser } = useAuth();
  const { lang } = useLang();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const pollingStarted = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (pollingStarted.current) return;
    pollingStarted.current = true;

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      await refreshUser();
      attempts++;
      if (attempts >= 5 || cancelled) {
        if (!cancelled) setReady(true);
        return;
      }
      setTimeout(poll, 2000);
    };

    const timeout = setTimeout(poll, 1500);
    const maxWait = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 12000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      clearTimeout(maxWait);
    };
  }, [loading, user, router, refreshUser]);

  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => router.replace('/'), 3000);
      return () => clearTimeout(t);
    }
  }, [ready, router]);

  const t = (es: string, en: string) => (lang === 'es' ? es : en);

  if (loading) return <Spinner label="" />;

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--success)]">
        <CircleCheck className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold sm:text-3xl">
        {t('¡Pago exitoso!', 'Payment Successful!')}
      </h1>
      <p className="max-w-md text-sm opacity-70">
        {t(
          'Tu suscripción está activa. Ya puedes acceder a todas las funciones de estudio, examen y práctica oral.',
          'Your subscription is active. You can now access all study, exam, and oral practice features.',
        )}
      </p>
      {!ready && <Spinner variant="inline" label={t('Activando tu cuenta...', 'Activating your account...')} />}
      {ready && (
        <p className="text-sm opacity-50">
          {t('Redirigiendo al inicio...', 'Redirecting to home...')}
        </p>
      )}
    </div>
  );
}
