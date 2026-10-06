import { Request, Response } from 'express';
import { z } from 'zod';
import { WrittenQuestion, Rating } from '../models/WrittenQuestion';
import { FigureQuestion } from '../models/FigureQuestion';
import { OralQuestion } from '../models/OralQuestion';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

const RATINGS: Rating[] = ['AMG', 'AMA', 'AMP'];

export const resolveWrittenSchema = z.object({
  questionIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(500),
});

function parseRating(value?: unknown): Rating | undefined {
  if (typeof value !== 'string') return undefined;
  const r = value.toUpperCase();
  if (RATINGS.includes(r as Rating)) return r as Rating;
  throw ApiError.badRequest(`rating inválido. Usa uno de: ${RATINGS.join(', ')}`);
}

function parseLimit(value: unknown, def: number, max: number): number {
  const n = parseInt(String(value ?? def), 10);
  if (Number.isNaN(n) || n < 1) return def;
  return Math.min(n, max);
}

/**
 * GET /api/questions/written?rating=AMP&subject=...&limit=50&random=true&all=true
 * Devuelve preguntas escritas de texto (sin filtrar la respuesta correcta: la app
 * necesita 'correct' para calificar localmente; las rutas están protegidas por JWT).
 */
export const listWritten = asyncHandler(async (req: Request, res: Response) => {
  const rating = parseRating(req.query.rating);
  const subject = typeof req.query.subject === 'string' ? req.query.subject : undefined;
  const limit = parseLimit(req.query.limit, 100, 500);
  const random = req.query.random === 'true';
  const all = req.query.all === 'true';

  const filter: Record<string, unknown> = {};
  if (rating) filter.rating = rating;
  if (subject) filter.subject = subject;

  const questions = random
    ? await WrittenQuestion.aggregate([{ $match: filter }, { $sample: { size: limit } }])
    : await (all ? WrittenQuestion.find(filter) : WrittenQuestion.find(filter).limit(limit)).lean();

  res.json({ ok: true, count: questions.length, questions });
});

/** GET /api/questions/figures?rating=AMG&subject=... */
export const listFigures = asyncHandler(async (req: Request, res: Response) => {
  const rating = parseRating(req.query.rating);
  const subject = typeof req.query.subject === 'string' ? req.query.subject : undefined;

  const filter: Record<string, unknown> = {};
  if (rating) filter.rating = rating;
  if (subject) filter.subject = subject;

  const questions = await FigureQuestion.find(filter).lean();
  res.json({ ok: true, count: questions.length, questions });
});

/** POST /api/questions/resolve — recupera preguntas guardadas, en el mismo orden. */
export const resolveWritten = asyncHandler(async (req: Request, res: Response) => {
  const { questionIds } = req.body as z.infer<typeof resolveWrittenSchema>;
  const [written, figures] = await Promise.all([
    WrittenQuestion.find({ _id: { $in: questionIds } }).lean(),
    FigureQuestion.find({ _id: { $in: questionIds } }).lean(),
  ]);
  const byId = new Map([...written, ...figures].map((question) => [String(question._id), question]));
  const questions = questionIds.map((id) => byId.get(id)).filter(Boolean);

  res.json({ ok: true, count: questions.length, questions });
});

/** GET /api/questions/oral?rating=AMP&subject=... */
export const listOral = asyncHandler(async (req: Request, res: Response) => {
  const rating = parseRating(req.query.rating);
  const subject = typeof req.query.subject === 'string' ? req.query.subject : undefined;

  const filter: Record<string, unknown> = {};
  if (rating) filter.rating = rating;
  if (subject) filter.subject = subject;

  const questions = await OralQuestion.find(filter).lean();
  res.json({ ok: true, count: questions.length, questions });
});

/** GET /api/questions/oral/subjects?rating=AMP — materias del examen oral con sus conteos exactos. */
export const listOralSubjects = asyncHandler(async (req: Request, res: Response) => {
  const rating = parseRating(req.query.rating);
  const match = rating ? { rating } : {};

  type SubjectCount = { _id: { rating: Rating; subject: string }; count: number };
  const subjects = await OralQuestion.aggregate<SubjectCount>([
    { $match: match },
    { $group: { _id: { rating: '$rating', subject: '$subject' }, count: { $sum: 1 } } },
    { $sort: { '_id.rating': 1, '_id.subject': 1 } },
  ]);

  res.json({
    ok: true,
    subjects: subjects.map((subject) => ({
      rating: subject._id.rating,
      subject: subject._id.subject,
      count: subject.count,
    })),
  });
});

/** GET /api/questions/subjects?rating=AMP — lista de materias con conteos, incluidas las figuras. */
export const listSubjects = asyncHandler(async (req: Request, res: Response) => {
  const rating = parseRating(req.query.rating);
  const match = rating ? { rating } : {};

  type SubjectCount = { _id: { rating: Rating; subject: string }; count: number };
  const pipeline = [
    { $match: match },
    { $group: { _id: { rating: '$rating', subject: '$subject' }, count: { $sum: 1 } } },
  ];
  const [writtenSubjects, figureSubjects] = await Promise.all([
    WrittenQuestion.aggregate<SubjectCount>(pipeline),
    FigureQuestion.aggregate<SubjectCount>(pipeline),
  ]);

  const counts = new Map<string, SubjectCount>();
  for (const entry of [...writtenSubjects, ...figureSubjects]) {
    const key = `${entry._id.rating}:${entry._id.subject}`;
    const current = counts.get(key);
    counts.set(key, current ? { ...current, count: current.count + entry.count } : entry);
  }
  const subjects = [...counts.values()].sort(
    (a, b) =>
      a._id.rating.localeCompare(b._id.rating) || a._id.subject.localeCompare(b._id.subject)
  );

  res.json({
    ok: true,
    subjects: subjects.map((s) => ({
      rating: s._id.rating,
      subject: s._id.subject,
      count: s.count,
    })),
  });
});
