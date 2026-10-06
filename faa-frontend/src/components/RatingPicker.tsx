'use client';

import { RATINGS, Rating } from '@/lib/types';
import { useLang } from '@/context/LangContext';

export function RatingPicker({
  value,
  onChange,
}: {
  value: Rating | null;
  onChange: (r: Rating) => void;
}) {
  const { lang } = useLang();
  return (
    <div className="grid grid-cols-3 gap-3">
      {RATINGS.map((r) => (
        <button
          key={r.code}
          onClick={() => onChange(r.code)}
          className={`rating-option p-4 text-center ${
            value === r.code
              ? 'rating-option-active'
              : ''
            }`}
        >
          <div className="text-lg font-extrabold text-[var(--accent)]">{r.code}</div>
          <div className="mt-1 text-xs text-slate-500">{lang === 'es' ? r.es : r.en}</div>
        </button>
      ))}
    </div>
  );
}
