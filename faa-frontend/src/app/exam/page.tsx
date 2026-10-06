'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Clock3, ListChecks, Play, RotateCcw, Shuffle } from 'lucide-react';
import { Protected } from '@/components/Protected';
import { Spinner } from '@/components/Spinner';
import { RatingPicker } from '@/components/RatingPicker';
import { QuestionCard } from '@/components/QuestionCard';
import { useLang } from '@/context/LangContext';
import { api } from '@/lib/api';
import { EXAM_SIZE } from '@/lib/types';
import type {
  FigureQuestion,
  PracticeSession,
  PracticeSessionInput,
  Rating,
  SessionMode,
  WrittenQuestion,
} from '@/lib/types';

type AnyQ = WrittenQuestion | FigureQuestion;

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function examSnapshot(
  rating: Rating,
  mode: SessionMode,
  questions: AnyQ[],
  answers: Record<string, number>,
  currentIndex: number,
  remainingSeconds: number | null,
): PracticeSessionInput {
  return {
    rating,
    sessionType: 'exam',
    mode,
    subject: null,
    questionIds: questions.map((question) => question._id),
    answers,
    currentIndex,
    remainingSeconds,
  };
}

function ExamInner() {
  const { lang } = useLang();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialRating = searchParams.get('rating') as Rating | null;
  const sessionMode = (searchParams.get('mode') as SessionMode | null) ?? 'exam';
  const isPractice = sessionMode === 'practice';

  const [rating, setRating] = useState<Rating | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [questionCount, setQuestionCount] = useState(EXAM_SIZE.AMG);
  const [timerMinutes, setTimerMinutes] = useState(120);
  const [availableQuestionCount, setAvailableQuestionCount] = useState<number | null>(null);
  const [questions, setQuestions] = useState<AnyQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [savedSession, setSavedSession] = useState<PracticeSession | null>(null);
  const [showResume, setShowResume] = useState(false);
  const sessionQueue = useRef<Promise<void>>(Promise.resolve());

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
        setSavedSession(result.session);
      });
    return sessionQueue.current;
  }, []);

  const removeSession = useCallback((selectedRating: Rating, mode: SessionMode = sessionMode): Promise<void> => {
    sessionQueue.current = sessionQueue.current
      .catch(() => undefined)
      .then(async () => {
        try {
          await api.sessions.remove({ rating: selectedRating, sessionType: 'exam', mode, subject: null });
        } catch {
          // Allow a new attempt to start even if an old remote session could
          // not be removed because of a transient connection failure.
        }
        setSavedSession(null);
      });
    return sessionQueue.current;
  }, [sessionMode]);

  const start = useCallback(async (
    selectedRating: Rating,
    selectedCount = questionCount,
    selectedTimerMinutes = timerMinutes,
  ) => {
    setRating(selectedRating);
    setLoading(true);
    setIdx(0);
    setAnswers({});
    setSubmitted(false);
    setShowResume(false);
    setShowSetup(false);
    await removeSession(selectedRating);

    try {
      const requestedCount = availableQuestionCount
        ? Math.min(selectedCount, availableQuestionCount)
        : selectedCount;
      const result = await api.exam(selectedRating, requestedCount);
      const initialSeconds = isPractice || selectedTimerMinutes === 0
        ? null
        : selectedTimerMinutes * 60;
      setQuestions(result.questions);
      setSeconds(initialSeconds);
      if (isPractice) void persistSession(examSnapshot(selectedRating, sessionMode, result.questions, {}, 0, initialSeconds));
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [availableQuestionCount, isPractice, persistSession, questionCount, removeSession, sessionMode, timerMinutes]);

  useEffect(() => {
    if (!initialRating) return;
    let cancelled = false;

    const loadInitialSession = async () => {
      setRating(initialRating);
      setSavedSession(null);
      setShowResume(false);
      setLoading(true);
      try {
        const result = await api.sessions.list({ rating: initialRating, sessionType: 'exam', mode: sessionMode });
        if (cancelled) return;
        const saved = result.sessions.find((session) => session.subject === null) ?? null;
        if (saved && isPractice) {
          setSavedSession(saved);
          setShowResume(true);
          setShowSetup(false);
          setLoading(false);
          return;
        }
        if (saved) await removeSession(initialRating, saved.mode);
        setQuestionCount(EXAM_SIZE[initialRating]);
        setTimerMinutes(120);
        setShowSetup(true);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setQuestionCount(EXAM_SIZE[initialRating]);
          setTimerMinutes(120);
          setShowSetup(true);
          setLoading(false);
        }
      }
    };

    void loadInitialSession();
    return () => { cancelled = true; };
  }, [initialRating, isPractice, removeSession, sessionMode]);

  useEffect(() => {
    if (!rating || !showSetup) return;
    let cancelled = false;
    setAvailableQuestionCount(null);

    void api.subjects(rating)
      .then((result) => {
        if (cancelled) return;
        const available = result.subjects.reduce((total, subject) => total + subject.count, 0);
        setAvailableQuestionCount(available);
        setQuestionCount((current) => Math.min(Math.max(current, 1), available));
      })
      .catch(() => {
        if (!cancelled) setAvailableQuestionCount(null);
      });

    return () => { cancelled = true; };
  }, [rating, showSetup]);

  useEffect(() => {
    if (isPractice || !rating || questions.length === 0 || submitted) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isPractice, questions.length, rating, submitted]);

  const resumeSession = async () => {
    if (!isPractice || !rating || !savedSession) return;
    setShowResume(false);
    setLoading(true);
    try {
      const result = await api.resolveWritten(savedSession.questionIds);
      if (result.questions.length !== savedSession.questionIds.length) {
        await removeSession(rating, savedSession.mode);
        await start(rating);
        return;
      }
      setQuestions(result.questions);
      setIdx(Math.min(Math.max(savedSession.currentIndex, 0), result.questions.length - 1));
      setAnswers(savedSession.answers);
      setSeconds(isPractice ? null : savedSession.remainingSeconds);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const submit = useCallback(async () => {
    if (!rating) return;
    setSubmitted(true);
    await removeSession(rating);
  }, [rating, removeSession]);

  useEffect(() => {
    if (isPractice || seconds === null || !rating || submitted || questions.length === 0) return undefined;
    if (seconds <= 0) {
      void submit();
      return undefined;
    }
    const timer = window.setTimeout(() => setSeconds((value) => value === null ? null : value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [isPractice, questions.length, rating, seconds, submitted, submit]);

  const handleAnswer = (choice: number) => {
    const current = questions[idx];
    if (!current || !rating) return;
    const nextAnswers = { ...answers, [current._id]: choice };
    setAnswers(nextAnswers);
    if (isPractice) void persistSession(examSnapshot(rating, sessionMode, questions, nextAnswers, idx, seconds));
  };

  const navigate = (nextIndex: number) => {
    if (!rating) return;
    setIdx(nextIndex);
    if (isPractice) void persistSession(examSnapshot(rating, sessionMode, questions, answers, nextIndex, seconds));
  };

  if (!rating) {
    return (
      <section className="page-heading space-y-5">
        <p className="section-eyebrow">Exam simulator</p>
        <h1>{lang === 'es' ? 'Examen escrito' : 'Written exam'}</h1>
        <p className="text-sm text-slate-500">
          {lang === 'es'
            ? 'Simulacro cronometrado del tamaño oficial (AMG 60 · AMA 100 · AMP 100). Aprobar: 70%.'
            : 'Timed mock of official size (AMG 60 · AMA 100 · AMP 100). Pass: 70%.'}
        </p>
        <RatingPicker
          value={rating}
          onChange={(selectedRating) => {
            setRating(selectedRating);
            setQuestionCount(EXAM_SIZE[selectedRating]);
            setTimerMinutes(120);
            setShowSetup(true);
          }}
        />
      </section>
    );
  }

  if (showSetup && rating) {
    const officialCount = EXAM_SIZE[rating];
    const questionOptions = [...new Set([20, 40, officialCount, availableQuestionCount ?? officialCount])]
      .filter((count) => count > 0 && (availableQuestionCount === null || count <= availableQuestionCount))
      .sort((a, b) => a - b);

    return (
      <section className="exam-setup mx-auto max-w-2xl">
        <button onClick={() => router.push(`/certification/${rating.toLowerCase()}`)} className="back-link text-sm">
          <ArrowLeft className="h-4 w-4" /> {lang === 'es' ? 'Volver a la especialidad' : 'Back to specialty'}
        </button>
        <header className="exam-setup-heading">
          <span className="status-chip"><Shuffle className="h-3.5 w-3.5" /> {isPractice ? (lang === 'es' ? 'Modo práctica' : 'Practice mode') : (lang === 'es' ? 'Modo examen' : 'Exam mode')}</span>
          <h1>{lang === 'es' ? 'Configura tu examen' : 'Set up your exam'}</h1>
          <p>
            {lang === 'es'
              ? `Cada intento mezcla nuevas preguntas de ${rating}. Elige cómo quieres practicar antes de comenzar.`
              : `Every attempt mixes a new set of ${rating} questions. Choose how you want to practice before you begin.`}
          </p>
        </header>

        <div className="card exam-setup-panel">
          <div className="exam-setup-panel-title">
            <span className="exam-setup-icon"><ListChecks aria-hidden="true" /></span>
            <div>
              <h2>{lang === 'es' ? 'Tu simulacro' : 'Your simulation'}</h2>
              <p>{lang === 'es' ? 'Las preguntas se seleccionan al azar cada vez que generas un examen.' : 'Questions are selected at random every time you generate an exam.'}</p>
            </div>
          </div>

          <div className="exam-setup-fields">
            <label className="exam-setup-field">
              <span>{lang === 'es' ? 'Número de preguntas' : 'Number of questions'}</span>
              <select className="input" value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))}>
                {questionOptions.map((count) => (
                  <option key={count} value={count}>
                    {count === officialCount
                      ? `${count} · ${lang === 'es' ? 'formato FAA' : 'FAA format'}`
                      : count === availableQuestionCount
                        ? `${count} · ${lang === 'es' ? 'todas disponibles' : 'all available'}`
                        : `${count} ${lang === 'es' ? 'preguntas' : 'questions'}`}
                  </option>
                ))}
              </select>
              {availableQuestionCount !== null && <small>{availableQuestionCount} {lang === 'es' ? 'preguntas disponibles' : 'questions available'}</small>}
            </label>

            {!isPractice && (
              <label className="exam-setup-field">
                <span>{lang === 'es' ? 'Límite de tiempo' : 'Time limit'}</span>
                <select className="input" value={timerMinutes} onChange={(event) => setTimerMinutes(Number(event.target.value))}>
                  <option value={0}>{lang === 'es' ? 'Sin límite' : 'No limit'}</option>
                  <option value={30}>30 {lang === 'es' ? 'minutos' : 'minutes'}</option>
                  <option value={60}>60 {lang === 'es' ? 'minutos' : 'minutes'}</option>
                  <option value={120}>120 {lang === 'es' ? 'minutos · formato FAA' : 'minutes · FAA format'}</option>
                </select>
                <small>{timerMinutes === 0 ? (lang === 'es' ? 'Puedes terminar cuando quieras.' : 'Finish whenever you are ready.') : (lang === 'es' ? 'El examen se entregará al terminar el tiempo.' : 'The exam submits when time expires.')}</small>
              </label>
            )}
          </div>

          <div className="exam-setup-actions">
            <button onClick={() => void start(rating, questionCount, timerMinutes)} className="btn-primary">
              <Shuffle className="h-4 w-4" /> {lang === 'es' ? 'Generar examen' : 'Generate exam'}
            </button>
            <span>{questionCount} {lang === 'es' ? 'preguntas' : 'questions'} · {isPractice || timerMinutes === 0 ? (lang === 'es' ? 'sin límite de tiempo' : 'no time limit') : `${timerMinutes} ${lang === 'es' ? 'minutos' : 'minutes'}`}</span>
          </div>
        </div>
      </section>
    );
  }

  if (isPractice && showResume && savedSession) {
    const answered = Object.keys(savedSession.answers).length;
    const percent = savedSession.questionIds.length ? Math.round((answered / savedSession.questionIds.length) * 100) : 0;
    return (
      <section className="mx-auto max-w-md space-y-4">
        <div className="study-resume-callout study-exam-resume-callout">
          <div className="study-resume-icon"><Play aria-hidden="true" /></div>
          <div className="study-resume-content">
            <h2>{lang === 'es' ? 'Continúa tu examen guardado' : 'Continue your saved exam'}</h2>
            <p>{rating} · {isPractice ? (lang === 'es' ? 'Práctica' : 'Practice') : (lang === 'es' ? 'Examen' : 'Exam')} · {savedSession.questionIds.length} {lang === 'es' ? 'preguntas' : 'questions'}{!isPractice && ` · ${savedSession.remainingSeconds === null ? (lang === 'es' ? 'sin límite' : 'no limit') : formatTime(savedSession.remainingSeconds)}`}</p>
            <div className="study-resume-progress-copy">
              <span>{answered}/{savedSession.questionIds.length} {lang === 'es' ? 'respondidas' : 'answered'}</span>
              <strong>{percent}%</strong>
            </div>
            <div className="progress-track study-resume-progress" role="progressbar" aria-valuemin={0} aria-valuemax={savedSession.questionIds.length} aria-valuenow={answered} aria-label={lang === 'es' ? 'Progreso del examen guardado' : 'Saved exam progress'}>
              <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>
          </div>
          <div className="study-resume-actions">
            <button onClick={() => void resumeSession()} className="btn-primary"><Play aria-hidden="true" /> {lang === 'es' ? 'Continuar' : 'Continue'}</button>
            <button onClick={() => void start(rating)} className="btn-ghost"><RotateCcw aria-hidden="true" /> {lang === 'es' ? 'Empezar de nuevo' : 'Start fresh'}</button>
          </div>
        </div>
      </section>
    );
  }

  if (loading) return <Spinner label={lang === 'es' ? 'Generando examen…' : 'Generating exam…'} />;

  if (submitted) {
    const score = questions.length ? Math.round((questions.filter((question) => answers[question._id] === question.correct).length / questions.length) * 100) : 0;
    const passed = score >= 70;
    return (
      <section className="space-y-6">
        <div className="card mx-auto max-w-lg text-center">
          <div className="text-5xl">{passed ? '🎉' : '📕'}</div>
          <h2 className="mt-2 text-xl font-bold text-slate-800">{rating} · {lang === 'es' ? 'Resultado' : 'Result'}</h2>
          <p className="mt-1 text-4xl font-extrabold text-brand-700">{score}%</p>
          <p className="text-sm text-slate-500">{Object.keys(answers).filter((questionId) => questions.find((question) => question._id === questionId)?.correct === answers[questionId]).length} / {questions.length} {lang === 'es' ? 'correctas' : 'correct'}</p>
          <p className={`mt-2 font-semibold ${passed ? 'text-green-600' : 'text-red-500'}`}>{passed ? (lang === 'es' ? 'APROBADO (≥70%)' : 'PASSED (≥70%)') : (lang === 'es' ? 'No aprobado (necesitas 70%)' : 'Not passed (need 70%)')}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => void start(rating)} className="btn-primary">{lang === 'es' ? 'Otro examen' : 'New exam'}</button>
            <button onClick={() => router.push(`/certification/${rating.toLowerCase()}`)} className="btn-ghost">{lang === 'es' ? 'Cambiar rating' : 'Change rating'}</button>
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-800">{lang === 'es' ? 'Repaso' : 'Review'}</h3>
        <div className="space-y-4">
          {questions.map((question, index) => <QuestionCard key={question._id} question={question} index={index} total={questions.length} immediate={false} reveal selected={answers[question._id] ?? null} onSelect={() => {}} />)}
        </div>
      </section>
    );
  }

  const current = questions[idx];
  if (!current) return <p className="text-sm text-slate-500">{lang === 'es' ? 'Sin preguntas.' : 'No questions.'}</p>;

  const answeredCount = Object.keys(answers).length;
  const percent = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      {isPractice && (
        <button onClick={() => router.push(`/certification/${rating.toLowerCase()}`)} className="practice-session-return-button">
          <span className="practice-session-return-icon"><ArrowLeft className="h-4 w-4" /></span>
          <span>{lang === 'es' ? 'Volver a la especialidad' : 'Back to specialty'}</span>
        </button>
      )}

      <div className="session-progress-bar study-session-progress">
        <div className="study-session-progress-copy">
          <span>{isPractice ? (lang === 'es' ? 'Progreso de práctica' : 'Practice progress') : (lang === 'es' ? 'Progreso del examen' : 'Exam progress')}</span>
          <strong>{answeredCount}/{questions.length} {lang === 'es' ? 'respondidas' : 'answered'} · {percent}%</strong>
        </div>
        <div className="progress-track study-session-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answeredCount} aria-label={lang === 'es' ? 'Progreso del examen' : 'Exam progress'}><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
      </div>

      <div className="flex items-center justify-between">
        <span className="status-chip">{answeredCount}/{questions.length} {lang === 'es' ? 'respondidas' : 'answered'}</span>
        {!isPractice && (seconds === null ? (
          <span className="status-chip"><Clock3 className="h-3.5 w-3.5" /> {lang === 'es' ? 'Sin límite' : 'No limit'}</span>
        ) : (
          <span className={`rounded-full border px-3 py-1 text-sm font-bold ${seconds < 120 ? 'border-red-200 bg-red-50 text-red-600' : 'border-slate-200 bg-slate-100 text-[var(--text)]'}`}>⏱ {formatTime(seconds)}</span>
        ))}
      </div>

      <QuestionCard question={current} index={idx} total={questions.length} immediate={false} selected={answers[current._id] ?? null} onSelect={handleAnswer} />

      <div className="flex items-center justify-between">
        <button onClick={() => navigate(Math.max(0, idx - 1))} className="btn-ghost" disabled={idx === 0}><ArrowLeft className="h-4 w-4" /> {lang === 'es' ? 'Anterior' : 'Prev'}</button>
        {idx < questions.length - 1 ? (
          <button onClick={() => navigate(idx + 1)} className="btn-primary">{lang === 'es' ? 'Siguiente' : 'Next'} <ArrowRight className="h-4 w-4" /></button>
        ) : (
          <button onClick={() => void submit()} className="btn-primary bg-green-600 hover:bg-green-700">{lang === 'es' ? 'Entregar examen' : 'Submit exam'}</button>
        )}
      </div>
    </section>
  );
}

export default function ExamPage() {
  return <Protected requireSubscription><ExamInner /></Protected>;
}
