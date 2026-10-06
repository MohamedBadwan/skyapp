'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, Clock, FileText, MicVocal } from 'lucide-react';
import { Protected } from '@/components/Protected';
import { useLang } from '@/context/LangContext';
import { api } from '@/lib/api';
import type { ProgressResponse } from '@/lib/types';

const certMeta: Record<string, { title: string }> = {
  amg: { title: 'General' },
  ama: { title: 'Airframe' },
  amp: { title: 'Powerplant' },
};

type TabMode = 'practice' | 'exam';

function CertificationInner() {
  const { lang } = useLang();
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toLowerCase();
  const meta = certMeta[code];
  const [activeTab, setActiveTab] = useState<TabMode>('practice');
  const [progress, setProgress] = useState<ProgressResponse | null>(null);

  useEffect(() => {
    api.getProgress().then(setProgress).catch(() => setProgress(null));
  }, []);

  if (!meta) {
    router.replace('/');
    return null;
  }

  const rating = code.toUpperCase();

  const ratingProgress = progress?.summary?.[rating];
  const progressPct = ratingProgress
    ? Math.round((ratingProgress.mastered / ratingProgress.total) * 100)
    : 0;

  const modes = [
    {
      key: 'study',
      href: `/study?rating=${rating}&mode=${activeTab}`,
      icon: BookOpen,
      es: 'Estudio por materia',
      en: 'Study by subject',
    },
    {
      key: 'exam',
      href: `/exam?rating=${rating}&mode=${activeTab}`,
      icon: FileText,
      es: 'Examen escrito',
      en: 'Written exam',
    },
    {
      key: 'oral',
      href: `/oral?rating=${rating}&mode=${activeTab}`,
      icon: MicVocal,
      es: 'Examen oral (DME)',
      en: 'Oral exam (DME)',
    },
  ];
  const visibleModes = activeTab === 'exam'
    ? modes.filter((mode) => mode.key !== 'study')
    : modes;

  return (
    <div className="relative space-y-10">
      <section className="dashboard-hero">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.push('/')} className="back-link text-sm">
              <ArrowLeft className="h-4 w-4" /> {lang === 'es' ? 'Volver' : 'Back'}
            </button>
            <span className="status-chip"><span className="h-1.5 w-1.5 rounded-full bg-current" /> {rating}</span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-800 sm:text-5xl">
            {meta.title}
          </h1>
          {progress && ratingProgress && (
            <div className="mt-5 w-full">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400">{lang === 'es' ? 'Progreso general' : 'Overall progress'}</span>
                <span className="font-bold text-slate-500">{progressPct}%</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${progressPct}%` }} /></div>
            </div>
          )}
        </div>
      </section>

      <div>
        <div className="cert-tab-group mb-6">
          <button
            className={`cert-tab ${activeTab === 'practice' ? 'cert-tab-active' : ''}`}
            onClick={() => setActiveTab('practice')}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {lang === 'es' ? 'Práctica' : 'Practice'}
          </button>
          <button
            className={`cert-tab ${activeTab === 'exam' ? 'cert-tab-active' : ''}`}
            onClick={() => setActiveTab('exam')}
          >
            <Clock className="h-3.5 w-3.5" />
            {lang === 'es' ? 'Examen' : 'Exam'}
          </button>
        </div>

        <div className={`grid gap-4 ${activeTab === 'exam' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {visibleModes.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                onClick={() => router.push(m.href)}
                className="card mode-card"
              >
                <div className="mode-card-icon"><Icon aria-hidden="true" /></div>
                <span className="mode-card-mode">
                  {activeTab === 'practice'
                    ? (lang === 'es' ? 'Modo práctica' : 'Practice mode')
                    : (lang === 'es' ? 'Modo examen' : 'Exam mode')}
                </span>
                <h2 className="mode-card-title">{lang === 'es' ? m.es : m.en}</h2>
                <ArrowRight className="mode-card-arrow" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CertificationPage() {
  return (
    <Protected requireSubscription>
      <CertificationInner />
    </Protected>
  );
}
