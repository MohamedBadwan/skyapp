'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookmarkCheck, Play, RotateCcw } from 'lucide-react';
import { Protected } from '@/components/Protected';
import { Spinner } from '@/components/Spinner';
import { RatingPicker } from '@/components/RatingPicker';
import { QuestionCard } from '@/components/QuestionCard';
import { useLang } from '@/context/LangContext';
import { api } from '@/lib/api';
import type {
  FigureQuestion,
  PracticeSession,
  PracticeSessionInput,
  Rating,
  SessionMode,
  SubjectInfo,
  WrittenQuestion,
} from '@/lib/types';

type AnyQ = WrittenQuestion | FigureQuestion;

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function answeredQuestions(session: Pick<PracticeSession, 'answers'>): number {
  return Object.keys(session.answers).length;
}

function hasSubject(session: PracticeSession): session is PracticeSession & { subject: string } {
  return Boolean(session.subject && session.questionIds.length > 0);
}

function progressPercent(session: Pick<PracticeSession, 'answers' | 'questionIds'>): number {
  return session.questionIds.length
    ? Math.round((answeredQuestions(session) / session.questionIds.length) * 100)
    : 0;
}

function sessionSnapshot(
  rating: Rating,
  mode: SessionMode,
  subject: string,
  questions: AnyQ[],
  answers: Record<string, number>,
  currentIndex: number,
): PracticeSessionInput {
  return {
    rating,
    sessionType: 'study',
    mode,
    subject,
    questionIds: questions.map((question) => question._id),
    answers,
    currentIndex,
    remainingSeconds: null,
  };
}

function StudyInner() {
  const { lang } = useLang();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialRating = searchParams.get('rating') as Rating | null;
  const sessionMode = (searchParams.get('mode') as SessionMode | null) ?? 'practice';
  const isPractice = sessionMode === 'practice';

  const [rating, setRating] = useState<Rating | null>(initialRating);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [savedSessions, setSavedSessions] = useState<PracticeSession[]>([]);

  const [subject, setSubject] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AnyQ[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const sessionQueue = useRef<Promise<void>>(Promise.resolve());

  const replaceSavedSession = useCallback((saved: PracticeSession) => {
    setSavedSessions((current) => {
      const rest = current.filter((session) => session._id !== saved._id);
      return [saved, ...rest].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
  }, []);

  const persistSession = useCallback((snapshot: PracticeSessionInput): Promise<void> => {
    const stableSnapshot: PracticeSessionInput = {
      ...snapshot,
      questionIds: [...snapshot.questionIds],
      answers: { ...snapshot.answers },
    };
    sessionQueue.current = sessionQueue.current
      .catch(() => undefined)
      .then(async () => {
        const result = await api.sessions.save(stableSnapshot);
        replaceSavedSession(result.session);
      });
    return sessionQueue.current;
  }, [replaceSavedSession]);

  const removeSession = useCallback((saved: Pick<PracticeSessionInput, 'rating' | 'sessionType' | 'mode' | 'subject'>): Promise<void> => {
    sessionQueue.current = sessionQueue.current
      .catch(() => undefined)
      .then(async () => {
        try {
          await api.sessions.remove(saved);
        } catch {
          // Keep the current screen usable if the connection drops. The next
          // successful save will reconcile the server-side session.
        }
        setSavedSessions((current) => current.filter((session) => !(
          session.rating === saved.rating
          && session.sessionType === saved.sessionType
          && session.mode === saved.mode
          && session.subject === saved.subject
        )));
      });
    return sessionQueue.current;
  }, []);

  const loadSavedSessions = useCallback(async (selectedRating: Rating) => {
    try {
      const result = await api.sessions.list({ rating: selectedRating, sessionType: 'study', mode: sessionMode });
      setSavedSessions(result.sessions.filter(hasSubject));
    } catch {
      setSavedSessions([]);
    }
  }, [sessionMode]);

  useEffect(() => {
    if (!rating) return;
    setLoadingSubjects(true);
    setSubject(null);
    setQuestions([]);
    setAnswers({});
    setFinished(false);

    void Promise.all([
      api.subjects(rating),
      api.sessions.list({ rating, sessionType: 'study', mode: sessionMode }),
    ])
      .then(([subjectResult, sessionResult]) => {
        setSubjects(subjectResult.subjects);
        setSavedSessions(sessionResult.sessions.filter(hasSubject));
      })
      .catch(() => {
        setSubjects([]);
        setSavedSessions([]);
      })
      .finally(() => setLoadingSubjects(false));
  }, [rating, sessionMode]);

  useEffect(() => {
    if (isPractice || !subject || questions.length === 0 || finished) return undefined;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [finished, isPractice, questions.length, subject]);

  const resumeSession = async (saved: PracticeSession) => {
    if (!rating || !saved.subject) return;
    setSubject(saved.subject);
    setLoadingQuestions(true);
    setFinished(false);
    try {
      const [written, figures] = await Promise.all([
        api.written({ rating, subject: saved.subject, all: true }),
        api.figures({ rating, subject: saved.subject }),
      ]);
      const available = [...written.questions, ...figures.questions];
      const questionMap = new Map(available.map((question) => [question._id, question]));
      const restored = saved.questionIds.map((questionId) => questionMap.get(questionId)).filter(Boolean) as AnyQ[];

      if (restored.length !== saved.questionIds.length) {
        await removeSession({
          rating: saved.rating,
          sessionType: saved.sessionType,
          mode: saved.mode,
          subject: saved.subject,
        });
        setSubject(null);
        return;
      }

      setQuestions(restored);
      setAnswers(saved.answers);
      setIdx(Math.min(Math.max(saved.currentIndex, 0), restored.length - 1));
    } catch {
      setSubject(null);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const startSubject = async (subjectName: string, restart = false) => {
    if (!rating) return;
    const existing = savedSessions.find((saved) => saved.subject === subjectName);
    if (existing && !restart) {
      await resumeSession(existing);
      return;
    }
    if (existing) {
      await removeSession({
        rating: existing.rating,
        sessionType: existing.sessionType,
        mode: existing.mode,
        subject: existing.subject,
      });
    }

    setSubject(subjectName);
    setLoadingQuestions(true);
    setIdx(0);
    setAnswers({});
    setFinished(false);
    try {
      const [written, figures] = await Promise.all([
        api.written({ rating, subject: subjectName, all: true }),
        api.figures({ rating, subject: subjectName }),
      ]);
      const merged = shuffle<AnyQ>([...written.questions, ...figures.questions]);
      setQuestions(merged);
      void persistSession(sessionSnapshot(rating, sessionMode, subjectName, merged, {}, 0));
    } catch {
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const current = questions[idx];
  const correctCount = useMemo(
    () => questions.filter((question) => answers[question._id] === question.correct).length,
    [answers, questions]
  );

  const select = (choice: number) => {
    if (!current || !rating || !subject) return;
    const nextAnswers = { ...answers, [current._id]: choice };
    setAnswers(nextAnswers);
    void persistSession(sessionSnapshot(rating, sessionMode, subject, questions, nextAnswers, idx));
  };

  const next = async () => {
    if (!rating || !subject) return;
    const nextIndex = idx + 1;
    if (idx < questions.length - 1) {
      setIdx(nextIndex);
      void persistSession(sessionSnapshot(rating, sessionMode, subject, questions, answers, nextIndex));
      return;
    }

    setFinished(true);
    await removeSession({ rating, sessionType: 'study', mode: sessionMode, subject });
    try {
      await api.postProgress(rating, subject, correctCount, questions.length);
    } catch {
      /* Progress is independent from the already-completed session. */
    }
  };

  const returnToSubjects = () => {
    setSubject(null);
    if (rating) void loadSavedSessions(rating);
  };

  if (!rating) {
    return (
      <section className="page-heading space-y-5">
        <p className="section-eyebrow">Practice bay</p>
        <h1>{lang === 'es' ? 'Estudio por materia' : 'Study by subject'}</h1>
        <p className="text-sm text-slate-500">
          {lang === 'es' ? 'Elige una especialidad:' : 'Pick a specialty:'}
        </p>
        <RatingPicker value={rating} onChange={setRating} />
      </section>
    );
  }

  if (!subject) {
    const studySessions = savedSessions.filter(hasSubject);
    const latestStudySession = studySessions[0];
    const sessionsBySubject = new Map(studySessions.map((session) => [session.subject, session]));
    return (
      <section className="space-y-5">
        <button onClick={() => router.push(`/certification/${rating.toLowerCase()}`)} className="back-link text-sm">
          <ArrowLeft className="h-4 w-4" /> {lang === 'es' ? 'Cambiar especialidad' : 'Change specialty'}
        </button>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">
          {rating} · {lang === 'es' ? 'Elige materia' : 'Pick a subject'}
        </h1>

        {latestStudySession && (
          <section className="study-resume-list" aria-label={lang === 'es' ? 'Sesiones guardadas' : 'Saved sessions'}>
            <aside className="study-resume-callout">
              <div className="study-resume-icon"><BookmarkCheck aria-hidden="true" /></div>
              <div className="study-resume-content">
                <h2>{lang === 'es' ? 'Continúa donde te quedaste' : 'Continue where you left off'}</h2>
                <p>{latestStudySession.subject}</p>
                <div className="study-resume-progress-copy">
                  <span>{answeredQuestions(latestStudySession)}/{latestStudySession.questionIds.length} {lang === 'es' ? 'respondidas' : 'answered'}</span>
                  <strong>{progressPercent(latestStudySession)}%</strong>
                </div>
                <div className="progress-track study-resume-progress" role="progressbar" aria-valuemin={0} aria-valuemax={latestStudySession.questionIds.length} aria-valuenow={answeredQuestions(latestStudySession)} aria-label={lang === 'es' ? 'Progreso de la sesión guardada' : 'Saved session progress'}>
                  <div className="progress-fill" style={{ width: `${progressPercent(latestStudySession)}%` }} />
                </div>
              </div>
              <div className="study-resume-actions">
                <button onClick={() => void resumeSession(latestStudySession)} className="btn-primary">
                  <Play aria-hidden="true" /> {lang === 'es' ? 'Continuar' : 'Continue'}
                </button>
                <button onClick={() => void startSubject(latestStudySession.subject, true)} className="btn-ghost">
                  <RotateCcw aria-hidden="true" /> {lang === 'es' ? 'Empezar de nuevo' : 'Start fresh'}
                </button>
              </div>
            </aside>
          </section>
        )}

        {loadingSubjects ? (
          <Spinner variant="inline" />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {subjects.map((item) => {
              const saved = sessionsBySubject.get(item.subject);
              const completed = saved ? answeredQuestions(saved) : 0;
              const percent = saved ? progressPercent(saved) : 0;
              return (
                <button
                  key={item.subject}
                  onClick={() => saved ? void resumeSession(saved) : void startSubject(item.subject)}
                  className={`card subject-option study-subject-option flex items-center justify-between text-left ${saved ? 'study-subject-option-resume' : ''}`}
                >
                  <span className="study-subject-copy">
                    <span className="font-medium text-slate-700">{item.subject}</span>
                    {saved && (
                      <span className="study-subject-resume">
                        <span>{completed}/{saved.questionIds.length} {lang === 'es' ? 'respondidas' : 'answered'}</span>
                        <span className="study-subject-progress" aria-hidden="true"><span style={{ width: `${percent}%` }} /></span>
                      </span>
                    )}
                  </span>
                  <span className="study-subject-count">{saved ? (lang === 'es' ? 'Continuar' : 'Continue') : item.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  if (loadingQuestions) return <Spinner label={lang === 'es' ? 'Cargando preguntas…' : 'Loading…'} />;

  if (finished) {
    const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
    const mastered = score >= 80;
    return (
      <section className="mx-auto max-w-lg space-y-4 text-center">
        <div className="card">
          <div className="text-5xl">{mastered ? '🏆' : '📈'}</div>
          <h2 className="mt-2 text-xl font-bold text-slate-800">{subject}</h2>
          <p className="mt-1 text-3xl font-extrabold text-brand-700">{score}%</p>
          <p className="text-sm text-slate-500">{correctCount} / {questions.length} {lang === 'es' ? 'correctas' : 'correct'}</p>
          <p className={`mt-3 font-semibold ${mastered ? 'text-green-600' : 'text-slate-600'}`}>
            {mastered
              ? lang === 'es' ? '¡Materia dominada! (≥80%)' : 'Subject mastered! (≥80%)'
              : lang === 'es' ? 'Sigue practicando para llegar al 80%.' : 'Keep practicing to reach 80%.'}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => void startSubject(subject, true)} className="btn-primary">{lang === 'es' ? 'Repetir' : 'Retry'}</button>
            <button onClick={returnToSubjects} className="btn-ghost">{lang === 'es' ? 'Otra materia' : 'Another subject'}</button>
          </div>
        </div>
      </section>
    );
  }

  if (!current) {
    return <p className="text-sm text-slate-500">{lang === 'es' ? 'No hay preguntas para esta materia.' : 'No questions for this subject.'}</p>;
  }

  const answered = answers[current._id] !== undefined;
  const answeredCount = Object.keys(answers).length;
  const sessionPercent = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <div className="session-progress-bar study-session-progress">
        <div className="study-session-progress-copy">
          <span>{lang === 'es' ? 'Progreso de práctica' : 'Practice progress'}</span>
          <strong>{answeredCount}/{questions.length} {lang === 'es' ? 'respondidas' : 'answered'} · {sessionPercent}%</strong>
        </div>
        <div className="progress-track study-session-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answeredCount} aria-label={lang === 'es' ? 'Progreso de práctica' : 'Practice progress'}>
          <div className="progress-fill" style={{ width: `${sessionPercent}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button onClick={returnToSubjects} className="back-link"><ArrowLeft className="h-4 w-4" /> {subject}</button>
        <span className="status-chip">{lang === 'es' ? 'Aciertos' : 'Correct'}: {correctCount}</span>
      </div>

      <QuestionCard question={current} index={idx} total={questions.length} immediate selected={answers[current._id] ?? null} onSelect={select} />

      <div className="flex justify-end">
        <button onClick={() => void next()} className="btn-primary" disabled={!answered}>
          {idx < questions.length - 1 ? (lang === 'es' ? 'Siguiente' : 'Next') : (lang === 'es' ? 'Terminar' : 'Finish')}
          {idx < questions.length - 1 && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </section>
  );
}

export default function StudyPage() {
  return <Protected requireSubscription><StudyInner /></Protected>;
}
