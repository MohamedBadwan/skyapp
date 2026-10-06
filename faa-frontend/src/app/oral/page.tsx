'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookmarkCheck, Mic, Play, RotateCcw, Square, Volume2 } from 'lucide-react';
import { Protected } from '@/components/Protected';
import { Spinner } from '@/components/Spinner';
import { RatingPicker } from '@/components/RatingPicker';
import { useLang } from '@/context/LangContext';
import { api } from '@/lib/api';
import {
  OralQuestion,
  PracticeSession,
  PracticeSessionInput,
  Rating,
  SessionMode,
  SubjectInfo,
} from '@/lib/types';
import {
  speak,
  stopSpeaking,
  createRecognizer,
  isSpeechRecognitionSupported,
  scoreAnswer,
} from '@/lib/speech';

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function hasSubject(session: PracticeSession): session is PracticeSession & { subject: string } {
  return Boolean(session.subject && session.questionIds.length > 0);
}

function getSpeechErrorMessage(errorCode: string, lang: 'es' | 'en'): string {
  const messages = {
    'not-allowed': [
      'Permite el acceso al micrófono para responder por voz.',
      'Allow microphone access to answer by voice.',
    ],
    'audio-capture': [
      'No se encontró un micrófono disponible.',
      'No microphone is available.',
    ],
    network: [
      'No se pudo conectar al servicio de reconocimiento de voz. Verifica tu conexión a internet e inténtalo de nuevo.',
      'Could not connect to the speech-recognition service. Check your internet connection and try again.',
    ],
    'service-not-allowed': [
      'El navegador bloqueó el servicio de reconocimiento de voz. Prueba con Chrome o Edge y verifica sus permisos.',
      'Your browser blocked the speech-recognition service. Try Chrome or Edge and check its permissions.',
    ],
    'language-not-supported': [
      'Tu navegador no admite el reconocimiento de voz en inglés.',
      'Your browser does not support speech recognition in English.',
    ],
    aborted: [
      'El reconocimiento de voz se interrumpió antes de finalizar.',
      'Speech recognition was interrupted before it finished.',
    ],
  } as const;

  const message = messages[errorCode as keyof typeof messages];
  if (message) return lang === 'es' ? message[0] : message[1];

  return lang === 'es'
    ? `No se pudo reconocer tu voz. Código del navegador: ${errorCode}.`
    : `Could not recognize your voice. Browser error code: ${errorCode}.`;
}

function isBraveBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return Boolean((navigator as Navigator & { brave?: unknown }).brave);
}

function oralSnapshot(
  rating: Rating,
  mode: SessionMode,
  subject: string,
  questions: OralQuestion[],
  answers: Record<string, number>,
  currentIndex: number,
): PracticeSessionInput {
  return {
    rating,
    sessionType: 'oral',
    mode,
    subject,
    questionIds: questions.map((question) => question._id),
    answers,
    currentIndex,
    remainingSeconds: null,
  };
}

function OralInner() {
  const { lang } = useLang();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialRating = searchParams.get('rating') as Rating | null;
  const mode = (searchParams.get('mode') as SessionMode | null) ?? 'practice';
  const isPractice = mode === 'practice';

  const [rating, setRating] = useState<Rating | null>(initialRating);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [savedSessions, setSavedSessions] = useState<PracticeSession[]>([]);
  const [subject, setSubject] = useState<string | null>(null);

  const [pool, setPool] = useState<OralQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const [heard, setHeard] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [scorePct, setScorePct] = useState<number | null>(null);
  const [passes, setPasses] = useState(0);
  const [isBrave, setIsBrave] = useState(isBraveBrowser);
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);
  const transcriptRef = useRef('');
  const keepListeningRef = useRef(false);
  const speechRequestRef = useRef(0);
  const sessionQueue = useRef<Promise<void>>(Promise.resolve());
  const micSupported = isSpeechRecognitionSupported();
  const micOk = micSupported && !isBrave;

  useEffect(() => {
    const brave = (navigator as Navigator & {
      brave?: { isBrave?: () => Promise<boolean> };
    }).brave;

    if (!brave?.isBrave) return;
    void brave.isBrave().then(setIsBrave).catch(() => setIsBrave(false));
  }, []);

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
          // A later save will reconcile a temporary network failure.
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
    if (!isPractice) {
      setSavedSessions([]);
      return;
    }
    try {
      const result = await api.sessions.list({ rating: selectedRating, sessionType: 'oral', mode });
      setSavedSessions(result.sessions.filter(hasSubject));
    } catch {
      setSavedSessions([]);
    }
  }, [isPractice, mode]);

  useEffect(() => {
    if (!rating) return;
    setLoadingSubjects(true);
    setSubject(null);
    setPool([]);
    setAnswers({});
    setPasses(0);
    void Promise.all([
      api.oralSubjects(rating),
      isPractice
        ? api.sessions.list({ rating, sessionType: 'oral', mode })
        : Promise.resolve({ ok: true, sessions: [] as PracticeSession[] }),
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
  }, [isPractice, mode, rating]);

  // Exam mode: warn on exit
  useEffect(() => {
    if (!isPractice && subject && pool.length > 0 && idx < pool.length) {
      const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [isPractice, subject, pool.length, idx]);

  const resumeSession = async (saved: PracticeSession) => {
    if (!isPractice || !rating || !saved.subject) return;
    setSubject(saved.subject);
    setLoading(true);
    resetQuestion();
    try {
      const result = await api.oral({ rating, subject: saved.subject });
      const questionMap = new Map(result.questions.map((question) => [question._id, question]));
      const restored = saved.questionIds.map((questionId) => questionMap.get(questionId)).filter(Boolean) as OralQuestion[];

      if (restored.length !== saved.questionIds.length) {
        await removeSession({ rating: saved.rating, sessionType: 'oral', mode: saved.mode, subject: saved.subject });
        setSubject(null);
        return;
      }

      const restoredAnswers = Object.fromEntries(
        Object.entries(saved.answers).filter(([questionId]) => questionMap.has(questionId))
      );
      setPool(restored);
      setAnswers(restoredAnswers);
      setPasses(Object.values(restoredAnswers).filter((value) => value === 1).length);
      setIdx(Math.min(Math.max(saved.currentIndex, 0), restored.length - 1));
    } catch {
      setSubject(null);
    } finally {
      setLoading(false);
    }
  };

  const startSubject = async (subj: string, restart = false) => {
    if (!rating) return;
    const existing = isPractice ? savedSessions.find((saved) => saved.subject === subj) : undefined;
    if (existing && !restart) {
      await resumeSession(existing);
      return;
    }
    if (existing) {
      await removeSession({ rating: existing.rating, sessionType: 'oral', mode: existing.mode, subject: existing.subject });
    }
    setSubject(subj);
    setLoading(true);
    setIdx(0);
    setAnswers({});
    setPasses(0);
    resetQuestion();
    try {
      const r = await api.oral({ rating, subject: subj });
      const selected = shuffle(r.questions);
      const sessionQuestions = isPractice ? selected : selected.slice(0, 4);
      setPool(sessionQuestions);
      if (isPractice) void persistSession(oralSnapshot(rating, mode, subj, sessionQuestions, {}, 0));
    } catch {
      setPool([]);
    } finally {
      setLoading(false);
    }
  };

  const resetQuestion = () => {
    keepListeningRef.current = false;
    const rec = recRef.current;
    recRef.current = null;
    try {
      rec?.abort();
    } catch {
      // Recognition may already have ended.
    }
    setRevealed(false);
    setHeard('');
    setSpeechError(null);
    setScorePct(null);
    setListening(false);
    speechRequestRef.current += 1;
    setSpeaking(false);
    stopSpeaking();
  };

  const current = pool[idx];

  const onListen = () => {
    if (!current) return;

    if (speaking) {
      speechRequestRef.current += 1;
      setSpeaking(false);
      stopSpeaking();
      return;
    }

    const requestId = speechRequestRef.current + 1;
    speechRequestRef.current = requestId;
    setSpeaking(true);
    speak(
      lang === 'es' ? current.q_es : current.q,
      lang === 'es' ? 'es-ES' : 'en-US',
      () => {
        if (speechRequestRef.current === requestId) setSpeaking(false);
      },
    );
  };

  const onMic = () => {
    if (!current) return;

    if (listening) {
      keepListeningRef.current = false;
      try {
        recRef.current?.stop();
      } catch {
        setListening(false);
      }
      return;
    }

    const rec = createRecognizer(lang === 'es' ? 'es-ES' : 'en-US');
    if (!rec) return;
    recRef.current = rec;
    transcriptRef.current = '';
    keepListeningRef.current = true;
    speechRequestRef.current += 1;
    setSpeaking(false);
    stopSpeaking();
    setHeard('');
    setSpeechError(null);
    setScorePct(null);
    setListening(true);

    const finishRecognition = () => {
      const text = transcriptRef.current.trim();
      if (text) {
        setHeard(text);
        setScorePct(Math.round(scoreAnswer(text, lang === 'es' ? current.a_es || current.a : current.a) * 100));
      }
      keepListeningRef.current = false;
      recRef.current = null;
      setListening(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let finalTranscript = transcriptRef.current;
      let interimTranscript = '';

      for (let resultIndex = e.resultIndex; resultIndex < e.results.length; resultIndex += 1) {
        const text = (e.results[resultIndex][0].transcript as string).trim();
        if (!text) continue;
        if (e.results[resultIndex].isFinal) {
          finalTranscript = [finalTranscript, text].filter(Boolean).join(' ');
        } else {
          interimTranscript = [interimTranscript, text].filter(Boolean).join(' ');
        }
      }

      transcriptRef.current = finalTranscript;
      setHeard([finalTranscript, interimTranscript].filter(Boolean).join(' '));
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (event: any) => {
      console.error('[SkyMentor] Speech recognition error', {
        error: event.error,
        message: event.message,
        event,
      });
      if (recRef.current !== rec) return;
      if (event.error === 'no-speech' && keepListeningRef.current) return;

      keepListeningRef.current = false;
      recRef.current = null;
      setListening(false);
      setSpeechError(getSpeechErrorMessage(String(event.error ?? 'unknown'), lang));
    };
    rec.onend = () => {
      if (recRef.current !== rec) return;
      if (!keepListeningRef.current) {
        finishRecognition();
        return;
      }

      window.setTimeout(() => {
        if (!keepListeningRef.current || recRef.current !== rec) return;
        try {
          rec.start();
        } catch {
          finishRecognition();
        }
      }, 120);
    };

    try {
      rec.start();
    } catch {
      keepListeningRef.current = false;
      recRef.current = null;
      setListening(false);
      setSpeechError(
        lang === 'es'
          ? 'No se pudo iniciar el micrófono. Revisa los permisos e inténtalo de nuevo.'
          : 'The microphone could not start. Check its permissions and try again.',
      );
    }
  };

  const nextQuestion = () => {
    if (!rating || !subject || !current) return;
    const nextAnswers = scorePct === null ? answers : {
      ...answers,
      [current._id]: scorePct >= 50 ? 1 : 0,
    };
    const nextPasses = Object.values(nextAnswers).filter((value) => value === 1).length;
    setAnswers(nextAnswers);
    setPasses(nextPasses);
    if (idx < pool.length - 1) {
      const newIdx = idx + 1;
      setIdx(newIdx);
      resetQuestion();
      if (isPractice) void persistSession(oralSnapshot(rating, mode, subject, pool, nextAnswers, newIdx));
    } else {
      setIdx(pool.length);
      if (isPractice) void removeSession({ rating, sessionType: 'oral', mode, subject });
    }
  };

  const returnToSubjects = () => {
    setSubject(null);
    if (isPractice && rating) {
      void sessionQueue.current
        .catch(() => undefined)
        .then(() => loadSavedSessions(rating));
    }
  };

  const feedback = (): { text: string; color: string } => {
    if (scorePct === null) return { text: '', color: '' };
    if (scorePct >= 50)
      return {
        text: lang === 'es' ? '✓ Tu respuesta parece correcta' : '✓ Your answer looks correct',
        color: 'text-green-600',
      };
    if (scorePct >= 25)
      return {
        text: lang === 'es' ? '~ Parcial, amplía tu respuesta' : '~ Partial, expand your answer',
        color: 'text-amber-600',
      };
    return {
      text: lang === 'es' ? '✗ Faltan conceptos clave' : '✗ Missing key concepts',
      color: 'text-red-500',
    };
  };

  // ---- Vistas ----
  if (!rating) {
    return (
      <section className="page-heading space-y-5">
        <p className="section-eyebrow">DME rehearsal</p>
        <h1>
          {lang === 'es' ? 'Examen oral (DME)' : 'Oral exam (DME)'}
        </h1>
        <p className="text-sm text-slate-500">
          {isPractice
            ? lang === 'es'
              ? 'Practica todas las preguntas de la materia que elijas. Escucha la pregunta en inglés, responde hablando y recibe feedback.'
              : 'Practice every question in the subject you choose. Listen to the question in English, answer by speaking, and get feedback.'
            : lang === 'es'
              ? 'Escucha la pregunta en inglés, respóndela hablando y recibe feedback. 4 preguntas por materia (3 de 4 para aprobar).'
              : 'Listen to the question in English, answer by speaking, and get feedback. 4 questions per subject (3 of 4 to pass).'}
        </p>
        <RatingPicker value={rating} onChange={setRating} />
      </section>
    );
  }

  if (!subject) {
    const latestSavedSession = savedSessions.filter(hasSubject)[0];
    const savedAnswered = latestSavedSession ? Object.keys(latestSavedSession.answers).length : 0;
    const savedPercent = latestSavedSession?.questionIds.length
      ? Math.round((savedAnswered / latestSavedSession.questionIds.length) * 100)
      : 0;
    return (
      <section className="space-y-5">
        <button onClick={() => router.push(`/certification/${rating!.toLowerCase()}`)} className="back-link text-sm">
          <ArrowLeft className="h-4 w-4" /> {lang === 'es' ? 'Cambiar especialidad' : 'Change specialty'}
        </button>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">
          {rating} · {lang === 'es' ? 'Elige materia' : 'Pick a subject'}
        </h1>
        {isPractice && latestSavedSession && (
          <section className="study-resume-list" aria-label={lang === 'es' ? 'Sesión oral guardada' : 'Saved oral session'}>
            <aside className="study-resume-callout">
              <div className="study-resume-icon"><BookmarkCheck aria-hidden="true" /></div>
              <div className="study-resume-content">
                <h2>{lang === 'es' ? 'Continúa donde te quedaste' : 'Continue where you left off'}</h2>
                <p>{latestSavedSession.subject} · {latestSavedSession.mode === 'practice' ? (lang === 'es' ? 'Modo práctica' : 'Practice mode') : (lang === 'es' ? 'Modo examen' : 'Exam mode')}</p>
                <div className="study-resume-progress-copy">
                  <span>{savedAnswered}/{latestSavedSession.questionIds.length} {lang === 'es' ? 'respondidas' : 'answered'}</span>
                  <strong>{savedPercent}%</strong>
                </div>
                <div className="progress-track study-resume-progress" role="progressbar" aria-valuemin={0} aria-valuemax={latestSavedSession.questionIds.length} aria-valuenow={savedAnswered} aria-label={lang === 'es' ? 'Progreso de la sesión oral guardada' : 'Saved oral session progress'}>
                  <div className="progress-fill" style={{ width: `${savedPercent}%` }} />
                </div>
              </div>
              <div className="study-resume-actions">
                <button onClick={() => void resumeSession(latestSavedSession)} className="btn-primary"><Play aria-hidden="true" /> {lang === 'es' ? 'Continuar' : 'Continue'}</button>
                <button onClick={() => void startSubject(latestSavedSession.subject, true)} className="btn-ghost"><RotateCcw aria-hidden="true" /> {lang === 'es' ? 'Empezar de nuevo' : 'Start fresh'}</button>
              </div>
            </aside>
          </section>
        )}
        {loadingSubjects ? (
          <Spinner variant="inline" />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {subjects.map((s) => (
              <button
                key={s.subject}
                onClick={() => startSubject(s.subject)}
                className="card subject-option flex items-center justify-between gap-4 text-left"
              >
                <span className="min-w-0 font-medium text-slate-700">{s.subject}</span>
                <span
                  className="study-subject-count"
                  aria-label={`${s.count} ${lang === 'es' ? 'preguntas' : 'questions'}`}
                >
                  {s.count} {lang === 'es' ? 'preguntas' : 'questions'}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (loading) return <Spinner label={lang === 'es' ? 'Cargando…' : 'Loading…'} />;

  if (idx >= pool.length && pool.length > 0) {
    const approved = passes >= 3;
    const resultMessage = isPractice
      ? lang === 'es'
        ? 'Práctica completada'
        : 'Practice complete'
      : approved
        ? lang === 'es'
          ? 'Materia aprobada (3 de 4)'
          : 'Subject passed (3 of 4)'
        : lang === 'es'
          ? 'Refuerza esta materia'
          : 'Reinforce this subject';
    return (
      <section className="mx-auto max-w-lg text-center">
        <div className="card">
          <div className="text-5xl">{isPractice || approved ? '🎖️' : '📖'}</div>
          <h2 className="mt-2 text-xl font-bold text-slate-800">{subject}</h2>
          <p className="mt-1 text-3xl font-extrabold text-brand-700">{passes}/{pool.length}</p>
          <p className={`mt-2 font-semibold ${isPractice || approved ? 'text-green-600' : 'text-slate-600'}`}>
            {resultMessage}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => void startSubject(subject, true)} className="btn-primary">
              {lang === 'es' ? 'Repetir' : 'Retry'}
            </button>
            <button onClick={returnToSubjects} className="btn-ghost">
              {lang === 'es' ? 'Otra materia' : 'Another subject'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!current) {
    return (
      <p className="text-sm text-slate-500">
        {lang === 'es' ? 'No hay preguntas orales para esta materia.' : 'No oral questions here.'}
      </p>
    );
  }

  const fb = feedback();

  const sessionPct = pool.length ? Math.round(((idx + 1) / pool.length) * 100) : 0;

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <div className="session-progress-bar">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-400">{idx + 1}/{pool.length}</span>
          <span className="font-bold text-slate-500">{sessionPct}%</span>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${sessionPct}%` }} /></div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button onClick={returnToSubjects} className="back-link">
          <ArrowLeft className="h-4 w-4" /> {subject}
        </button>
        <span className="status-chip">
          {idx + 1} / {pool.length} · {lang === 'es'
            ? isPractice ? 'Correctas' : 'Aprobadas'
            : isPractice ? 'Correct' : 'Passed'}: {passes}
        </span>
      </div>

      <div className="card">
        <p className="text-sm font-bold text-[var(--accent)]">
          {lang === 'es' ? `Pregunta ${idx + 1} de ${pool.length}` : `Question ${idx + 1} of ${pool.length}`}
        </p>
        <p className="mt-2 text-lg font-medium text-slate-800">{lang === 'es' ? current.q_es : current.q}</p>
        {lang === 'es' && (
          <p className="mt-1 text-sm italic text-slate-400">{current.q}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={onListen} className="btn-ghost" aria-pressed={speaking}>
            {speaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            {speaking ? (lang === 'es' ? 'Detener' : 'Stop') : lang === 'es' ? 'Escuchar' : 'Listen'}
          </button>
          <button
            onClick={onMic}
            className={`btn ${listening ? 'bg-red-500 text-white' : 'btn-primary'}`}
            disabled={!micOk}
            title={
              isBrave
                ? (lang === 'es' ? 'El reconocimiento de voz no es compatible con Brave' : 'Voice recognition is not supported in Brave')
                : !micSupported ? (lang === 'es' ? 'Usa Chrome o Edge' : 'Use Chrome or Edge') : ''
            }
            aria-pressed={listening}
          >
            <Mic aria-hidden="true" />
            {listening ? (lang === 'es' ? 'Terminar respuesta' : 'Finish answer') : lang === 'es' ? 'Responder' : 'Answer'}
          </button>
          <button onClick={() => setRevealed((v) => !v)} className="btn-ghost">
            {revealed ? (lang === 'es' ? 'Ocultar' : 'Hide') : lang === 'es' ? 'Ver respuesta' : 'Show answer'}
          </button>
        </div>

        {!micOk && (
          <p className="mt-2 text-xs text-amber-600">
            {isBrave
              ? (lang === 'es'
                ? 'Brave no admite de forma fiable el reconocimiento de voz. Abre esta página con Chrome o Edge para responder por voz.'
                : 'Brave does not reliably support speech recognition. Open this page in Chrome or Edge to answer by voice.')
              : (lang === 'es'
                ? 'El micrófono funciona en Chrome/Edge de escritorio.'
                : 'Microphone works in desktop Chrome/Edge.')}
          </p>
        )}

        {speechError && (
          <p className="mt-2 text-xs text-red-500" role="alert">
            {speechError}
          </p>
        )}

        {heard && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
            <span className="text-slate-400">{lang === 'es' ? 'Transcripción:' : 'Transcript:'} </span>
            <span className="text-slate-700">{heard}</span>
            {fb.text && <p className={`mt-1 font-semibold ${fb.color}`}>{fb.text}</p>}
          </div>
        )}

        {revealed && (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
            <span className="font-semibold text-green-700">R: </span>
            <span className="text-slate-700">{lang === 'es' ? current.a_es || current.a : current.a}</span>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={nextQuestion} className="btn-primary">
          {idx < pool.length - 1
            ? lang === 'es'
              ? 'Siguiente'
              : 'Next'
            : lang === 'es'
              ? 'Terminar'
              : 'Finish'}
          {idx < pool.length - 1 && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </section>
  );
}

export default function OralPage() {
  return (
    <Protected requireSubscription>
      <OralInner />
    </Protected>
  );
}
