'use client';

import { useState, useEffect } from 'react';
import type { WrittenQuestion, FigureQuestion } from '@/lib/types';
import { useLang } from '@/context/LangContext';
import { FigureView } from './FigureView';

const LETTERS = ['A', 'B', 'C', 'D'];

function hasImg(q: WrittenQuestion | FigureQuestion): q is FigureQuestion {
  return typeof (q as FigureQuestion).img === 'string';
}

/**
 * Tarjeta de pregunta de opción múltiple.
 * - immediate=true (estudio): al elegir, marca correcto/incorrecto al instante.
 * - immediate=false (examen): solo registra la selección; el examen revela al final.
 */
export function QuestionCard({
  question,
  index,
  total,
  immediate,
  selected,
  onSelect,
  reveal,
}: {
  question: WrittenQuestion | FigureQuestion;
  index: number;
  total: number;
  immediate: boolean;
  selected: number | null;
  onSelect: (idx: number) => void;
  reveal?: boolean; // fuerza mostrar la respuesta (repaso de examen)
}) {
  const { lang } = useLang();
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setLocked(immediate && selected !== null);
  }, [immediate, question._id, selected]);

  const stem = lang === 'es' ? question.q_es : question.q_en;
  const opts = lang === 'es' ? question.opts_es : question.opts_en;
  const answered = selected !== null;
  const showResult = reveal || (immediate && locked);

  const choose = (i: number) => {
    if (immediate && locked) return;
    if (immediate) setLocked(true);
    onSelect(i);
  };

  const optionClass = (i: number): string => {
    if (!showResult) {
      return selected === i
        ? 'option-selected'
        : '';
    }
    if (i === question.correct) return 'option-correct';
    if (i === selected && i !== question.correct) return 'option-wrong';
    return 'option-muted';
  };

  return (
    <div className="card question-card">
      <div className="mb-5 flex items-center justify-between gap-3 text-xs question-meta">
        <span>
          {index + 1} / {total}
        </span>
        <span className="question-subject">{question.subject}</span>
      </div>

      {hasImg(question) && <FigureView src={question.img} alt={question.subject} />}

      <p className="mb-6 text-base font-semibold leading-7 text-slate-800">{stem}</p>

      <div className="space-y-2">
        {opts.map((opt, i) => (
          <button
            key={i}
            onClick={() => choose(i)}
            disabled={immediate && locked}
            className={`question-option flex w-full items-start gap-3 px-3.5 py-3 text-left text-sm leading-6 transition ${optionClass(
              i
            )}`}
          >
            <span className="question-option-mark mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold">
              {LETTERS[i]}
            </span>
            <span>{opt}</span>
          </button>
        ))}
      </div>

      {showResult && answered && (
        <p
          className={`mt-3 text-sm font-semibold ${
            selected === question.correct ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {selected === question.correct
            ? lang === 'es'
              ? '✓ Correcto'
              : '✓ Correct'
            : lang === 'es'
              ? `✗ Incorrecto — la respuesta es ${LETTERS[question.correct]}`
              : `✗ Incorrect — the answer is ${LETTERS[question.correct]}`}
        </p>
      )}
    </div>
  );
}
