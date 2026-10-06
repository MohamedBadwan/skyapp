// Utilidades de voz (Web Speech API). Solo en el navegador (Chrome/Edge para el micrófono).

export function speak(text: string, lang = 'en-US', onFinish?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onFinish?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onFinish?.();
  };
  u.onend = finish;
  u.onerror = finish;

  const pick = () => {
    const voices = window.speechSynthesis.getVoices();
    const locale = lang.toLowerCase();
    const language = locale.split('-')[0];
    const preferredName = language === 'es'
      ? /(Google|Natural|Microsoft|Monica|Elvira|Sabina|Helena|Laura|Pablo)/i
      : /(Google|Natural|Samantha|Aria|Jenny)/i;
    const isRequestedLocale = (voice: SpeechSynthesisVoice) => voice.lang.toLowerCase() === locale;
    const isRequestedLanguage = (voice: SpeechSynthesisVoice) =>
      voice.lang.toLowerCase().startsWith(`${language}-`);
    const preferred =
      voices.find((voice) => isRequestedLocale(voice) && preferredName.test(voice.name)) ||
      voices.find(isRequestedLocale) ||
      voices.find((voice) => isRequestedLanguage(voice) && preferredName.test(voice.name)) ||
      voices.find(isRequestedLanguage);
    if (preferred) u.voice = preferred;
    window.speechSynthesis.speak(u);
  };

  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = pick;
  } else {
    pick();
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Reconocimiento de voz — tipado mínimo (no está en las libs por defecto).
/* eslint-disable @typescript-eslint/no-explicit-any */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function createRecognizer(lang = 'en-US'): any | null {
  if (typeof window === 'undefined') return null;
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.continuous = true;
  return rec;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'be', 'by', 'with',
  'that', 'this', 'it', 'as', 'at', 'from', 'which', 'used', 'use', 'can',
]);

/**
 * Puntúa una respuesta hablada contra la respuesta modelo por solape de términos clave.
 * Devuelve 0..1. Sirve para dar feedback inmediato en el modo oral.
 */
export function scoreAnswer(said: string, answer: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const saidSet = new Set(norm(said));
  const keyTerms = norm(answer);
  if (keyTerms.length === 0 || saidSet.size === 0) return 0;

  const unique = Array.from(new Set(keyTerms));
  const hits = unique.filter((t) => saidSet.has(t)).length;
  return hits / unique.length;
}
