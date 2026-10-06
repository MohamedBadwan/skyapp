export interface PracticeSession {
  rating: string;
  modeType: 'study' | 'exam' | 'oral';
  subject: string | null;
  questionIds: string[];
  answers: Record<string, number>;
  currentIndex: number;
}

const PREFIX = 'practice-';

function key(rating: string, modeType: string): string {
  return `${PREFIX}${rating}-${modeType}`;
}

export function saveSession(session: PracticeSession): void {
  try {
    localStorage.setItem(key(session.rating, session.modeType), JSON.stringify(session));
  } catch { /* quota exceeded or unavailable */ }
}

export function loadSession(rating: string, modeType: string): PracticeSession | null {
  try {
    const raw = localStorage.getItem(key(rating, modeType));
    if (!raw) return null;
    return JSON.parse(raw) as PracticeSession;
  } catch {
    return null;
  }
}

export function deleteSession(rating: string, modeType: string): void {
  try {
    localStorage.removeItem(key(rating, modeType));
  } catch { /* noop */ }
}

export function listSessions(): PracticeSession[] {
  const sessions: PracticeSession[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw) as PracticeSession;
          if (parsed.questionIds?.length > 0) {
            sessions.push(parsed);
          }
        }
      }
    }
  } catch { /* noop */ }
  return sessions;
}

export function validateSession(session: PracticeSession, availableIds: string[]): boolean {
  const idSet = new Set(availableIds);
  return session.questionIds.every((id) => idSet.has(id));
}
