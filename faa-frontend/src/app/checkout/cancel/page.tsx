'use client';

import Link from 'next/link';
import { Undo2 } from 'lucide-react';
import { useLang } from '@/context/LangContext';

export default function CheckoutCancelPage() {
  const { lang } = useLang();
  const t = (es: string, en: string) => (lang === 'es' ? es : en);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
        <Undo2 className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold sm:text-3xl">
        {t('Pago cancelado', 'Payment Cancelled')}
      </h1>
      <p className="max-w-md text-sm opacity-70">
        {t(
          'No se realizó ningún cargo. Puedes intentar suscribirte de nuevo cuando quieras.',
          'No charges were made. You can try subscribing again whenever you\'re ready.',
        )}
      </p>
      <div className="flex gap-3">
        <Link
          href="/profile"
          className="btn-primary rounded-lg px-6 py-2.5 text-sm font-semibold transition"
        >
          {t('Volver al perfil', 'Back to Profile')}
        </Link>
        <Link
          href="/"
          className="rounded-lg border px-6 py-2.5 text-sm font-medium transition hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {t('Ir al inicio', 'Go to Home')}
        </Link>
      </div>
    </div>
  );
}
