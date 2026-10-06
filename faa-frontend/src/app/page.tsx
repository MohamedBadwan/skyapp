'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Protected } from '@/components/Protected';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import { api } from '@/lib/api';
import type { PracticeSession, ProgressResponse } from '@/lib/types';

const RATING_PROGRESS_META = [
  { rating: 'AMG', title: 'General' },
  { rating: 'AMA', title: 'Airframe' },
  { rating: 'AMP', title: 'Powerplant' },
] as const;

const CAREER_OPTIONS = [
  { id: 'amt', title: 'Aviation Maintenance Technician', detail: 'A&P' },
] as const;

function Dashboard() {
  const { user } = useAuth();
  const { lang } = useLang();
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSessions, setActiveSessions] = useState<PracticeSession[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const [animating, setAnimating] = useState(false);
  const [isCarouselVisible, setIsCarouselVisible] = useState(true);
  const [careerMenuOpen, setCareerMenuOpen] = useState(false);
  const [selectedCareerId, setSelectedCareerId] = useState(CAREER_OPTIONS[0].id);
  const carouselRef = useRef<HTMLElement>(null);
  const careerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getProgress()
      .then(setProgress)
      .catch(() => setProgress(null))
      .finally(() => setLoading(false));
    api
      .sessions
      .list()
      .then((result) => setActiveSessions(result.sessions.filter((session) => session.mode === 'practice')))
      .catch(() => setActiveSessions([]));
  }, []);

  useEffect(() => {
    if (!careerMenuOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!careerMenuRef.current?.contains(event.target as Node)) setCareerMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCareerMenuOpen(false);
    };

    window.addEventListener('pointerdown', closeOnOutsidePress);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsidePress);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [careerMenuOpen]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsCarouselVisible(entry.isIntersecting);
    }, { threshold: 0.1 });

    observer.observe(carousel);
    return () => observer.disconnect();
  }, []);

  const certifications = [
    {
      code: 'AMG',
      title: 'General',
      image: '/images/general.webp',
    },
    {
      code: 'AMA',
      title: 'Airframe',
      image: '/images/airframe-high-altitude.webp',
    },
    {
      code: 'AMP',
      title: 'Powerplant',
      image: '/images/powerplant.webp',
    },
  ];
  const selectedCareer = CAREER_OPTIONS.find((career) => career.id === selectedCareerId) ?? CAREER_OPTIONS[0];

  function scrollGallery(dir: -1 | 1) {
    if (animating) return;
    setSlideDir(dir === 1 ? 'left' : 'right');
    setAnimating(true);
    setTimeout(() => {
      setGalleryIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return certifications.length - 1;
        if (next >= certifications.length) return 0;
        return next;
      });
      setSlideDir(null);
      setAnimating(false);
    }, 300);
  }

  return (
    <div className="relative space-y-10">
      <section className="dashboard-hero">
        <div className="relative z-10 flex items-start justify-between gap-6">
          <div className="min-w-0 max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 sm:text-5xl">
              {lang === 'es' ? `Listo para despegar, ${user?.name?.split(' ')[0] || ''}.` : `Ready for takeoff, ${user?.name?.split(' ')[0] || ''}.`}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-500 sm:text-lg">
              {lang === 'es'
                ? 'Entrena con intención, mide tu dominio y acércate a tu certificación A&P una sesión a la vez.'
                : 'Train with intent, measure your mastery, and move toward A&P certification one session at a time.'}
            </p>
          </div>

          <div ref={careerMenuRef} className="cert-dropdown-wrapper hidden lg:block">
            <button
              type="button"
              className={`cert-dropdown-trigger ${careerMenuOpen ? 'cert-dropdown-trigger-open' : ''}`}
              aria-expanded={careerMenuOpen}
              aria-controls="career-options"
              onClick={() => setCareerMenuOpen((open) => !open)}
            >
              <span className="cert-dropdown-copy">
                <span className="cert-dropdown-label">{lang === 'es' ? 'Certificación' : 'Certification'}</span>
                <span className="cert-dropdown-value">{selectedCareer.title}</span>
              </span>
              <ChevronDown className={`cert-dropdown-chevron ${careerMenuOpen ? 'cert-dropdown-chevron-open' : ''}`} aria-hidden="true" />
            </button>
            {careerMenuOpen && (
              <div id="career-options" className="cert-dropdown-menu" role="listbox" aria-label={lang === 'es' ? 'Carreras disponibles' : 'Available careers'}>
                {CAREER_OPTIONS.map((career) => {
                  const selected = career.id === selectedCareerId;
                  return (
                    <button
                      key={career.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`cert-dropdown-item ${selected ? 'cert-dropdown-item-active' : ''}`}
                      onClick={() => {
                        setSelectedCareerId(career.id);
                        setCareerMenuOpen(false);
                      }}
                    >
                      <span className="cert-dropdown-item-copy">
                        <span>{career.title}</span>
                        <span>{career.detail}</span>
                      </span>
                      {selected && <Check className="cert-dropdown-item-check" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <section ref={carouselRef} className={`cert-carousel ${isCarouselVisible ? '' : 'cert-carousel--paused'}`}>
        <h2 className="cert-carousel-title">
          {lang === 'es' ? 'Elige tu especialidad' : 'Choose your specialty'}
        </h2>

        {/* Preload all carousel images so transitions are instant */}
        <div aria-hidden="true" className="hidden">
          {certifications.map((c) => (
            <Image key={c.code} src={c.image} alt="" fill sizes="1px" priority />
          ))}
        </div>

        <div className="cert-carousel-stage">
          <button
            onClick={() => scrollGallery(-1)}
            className="cert-carousel-arrow cert-carousel-arrow--left"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            className={`cert-carousel-card ${slideDir === 'left' ? 'cert-carousel-card--exit-left' : ''} ${slideDir === 'right' ? 'cert-carousel-card--exit-right' : ''}`}
            onClick={() => router.push(`/certification/${certifications[galleryIndex].code.toLowerCase()}`)}
          >
            <div className="cert-carousel-card-img">
              <Image
                src={certifications[galleryIndex].image}
                alt={certifications[galleryIndex].title}
                fill
                sizes="(max-width: 640px) 85vw, 360px"
                className="object-cover"
                priority
              />
              <div className="cert-carousel-card-gradient" />
            </div>
            <div className="cert-carousel-card-content">
              <h3 className="cert-carousel-card-name">{certifications[galleryIndex].title}</h3>
              <span className="cert-carousel-card-cta">
                {lang === 'es' ? 'Comenzar' : 'Start'} <ArrowRight className="cert-carousel-card-cta-arrow h-5 w-5" />
              </span>
            </div>
          </button>

          <button
            onClick={() => scrollGallery(1)}
            className="cert-carousel-arrow cert-carousel-arrow--right"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        <div className="cert-carousel-dots">
          {certifications.map((c, i) => (
            <button
              key={c.code}
              className={`cert-carousel-dot ${i === galleryIndex ? 'cert-carousel-dot--active' : ''}`}
              onClick={() => setGalleryIndex(i)}
              aria-label={c.title}
            />
          ))}
        </div>
      </section>

      {activeSessions.length > 0 && (
        <div>
          <div className="mb-4">
            <p className="section-eyebrow">{lang === 'es' ? 'Sesiones activas' : 'Active sessions'}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-800">
              {lang === 'es' ? 'Continúa donde te quedaste' : 'Continue where you left off'}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeSessions.slice(0, 1).map((s) => {
              const answered = Object.keys(s.answers).length;
              const pct = s.questionIds.length ? Math.round((answered / s.questionIds.length) * 100) : 0;
              const sessionLabel = s.sessionType === 'study'
                ? (lang === 'es' ? 'Estudio' : 'Study')
                : s.sessionType === 'oral'
                  ? (lang === 'es' ? 'Oral' : 'Oral')
                  : (lang === 'es' ? 'Escrito' : 'Written');
              const modeLabel = s.mode === 'practice'
                ? (lang === 'es' ? 'Práctica' : 'Practice')
                : (lang === 'es' ? 'Examen' : 'Exam');
              const route = s.sessionType === 'study' ? 'study' : s.sessionType === 'oral' ? 'oral' : 'exam';
              const href = `/${route}?rating=${s.rating}&mode=${s.mode}`;
              return (
                <button
                  key={s._id}
                  className="card flex items-center gap-3 text-left"
                  onClick={() => router.push(href)}
                >
                  <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[var(--accent-soft)]">
                    <Play className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{s.rating}</span>
                      <span className="text-xs text-slate-400">· {sessionLabel} · {modeLabel}</span>
                    </div>
                    {s.subject && <p className="truncate text-xs text-slate-500">{s.subject}</p>}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="progress-track flex-1"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                      <span className="text-xs font-bold text-slate-400">{pct}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {lang === 'es' ? 'Tu progreso' : 'Your progress'}
            </h2>
          </div>
          <span className="hidden text-sm text-slate-500 sm:block">{lang === 'es' ? 'Objetivo de dominio: 80%' : 'Mastery target: 80%'}</span>
        </div>
        {loading ? (
          <Spinner variant="inline" />
        ) : !progress ? (
          <div className="card border-dashed text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--accent-soft)] text-xl">✦</div>
            <p className="mt-3 text-sm text-slate-500">{lang === 'es' ? 'Aún no hay progreso. Empieza en "Estudio por materia".' : 'No progress yet. Start with "Study by subject".'}</p>
          </div>
        ) : (
          <section className="progress-overview" aria-label={lang === 'es' ? 'Progreso general por especialidad' : 'Overall progress by specialty'}>
            {RATING_PROGRESS_META.map(({ rating, title }) => {
              const summary = progress.summary[rating] ?? { mastered: 0, total: 0 };
              const percent = summary.total ? Math.round((summary.mastered / summary.total) * 100) : 0;
              const practices = progress.items.filter((item) => item.rating === rating);

              return (
                <article key={rating} className="progress-rating-panel">
                  <header className="progress-rating-header">
                    <div>
                      <span className="progress-rating-code">{rating}</span>
                      <h3>{title}</h3>
                    </div>
                    <strong>{percent}%</strong>
                  </header>
                  <p className="progress-rating-summary">
                    {summary.mastered}/{summary.total} {lang === 'es' ? 'materias dominadas' : 'subjects mastered'}
                  </p>
                  <div className="progress-track progress-rating-track" role="progressbar" aria-valuemin={0} aria-valuemax={summary.total} aria-valuenow={summary.mastered} aria-label={`${title} ${lang === 'es' ? 'progreso general' : 'overall progress'}`}>
                    <div className="progress-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="progress-practice-heading">
                    <span>{lang === 'es' ? 'Práctica por materia' : 'Practice by subject'}</span>
                    <span>{practices.length}/{summary.total}</span>
                  </div>
                  {practices.length > 0 ? (
                    <ul className="progress-practice-list">
                      {practices.map((practice) => {
                        const practicePercent = Math.round(practice.mastery * 100);
                        return (
                          <li key={practice._id} className="progress-practice-row">
                            <div className="progress-practice-copy">
                              <span>{practice.subject}</span>
                              <strong>{practicePercent}%</strong>
                            </div>
                            <div className="progress-track"><div className="progress-fill" style={{ width: `${practicePercent}%` }} /></div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="progress-practice-empty">{lang === 'es' ? 'Aún no has practicado una materia.' : 'No subject practiced yet.'}</p>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Protected requireSubscription>
      <Dashboard />
    </Protected>
  );
}
