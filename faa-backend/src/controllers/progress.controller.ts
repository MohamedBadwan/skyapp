import { Request, Response } from 'express';
import { z } from 'zod';
import { Progress, MASTERY_THRESHOLD } from '../models/Progress';
import { WrittenQuestion } from '../models/WrittenQuestion';
import { FigureQuestion } from '../models/FigureQuestion';
import { asyncHandler } from '../utils/asyncHandler';

const RATINGS = ['AMG', 'AMA', 'AMP'] as const;
type Rating = (typeof RATINGS)[number];
type SubjectCount = { _id: { rating: Rating; subject: string }; count: number };

export const recordSchema = z.object({
  rating: z.enum(['AMG', 'AMA', 'AMP']),
  subject: z.string().min(1),
  correct: z.number().int().min(0),
  attempted: z.number().int().min(1),
});

/**
 * POST /api/progress
 * Acumula intentos/aciertos de una sesión de estudio de una materia y recalcula el dominio.
 */
export const recordProgress = asyncHandler(async (req: Request, res: Response) => {
  const { rating, subject, correct, attempted } = req.body as z.infer<typeof recordSchema>;
  const userId = req.user!.sub;

  const doc = await Progress.findOneAndUpdate(
    { user: userId, rating, subject },
    {
      $inc: { attempted, correct },
      $set: { lastStudiedAt: new Date() },
      $setOnInsert: { user: userId, rating, subject },
    },
    { new: true, upsert: true }
  );

  doc.mastery = doc.attempted > 0 ? doc.correct / doc.attempted : 0;
  doc.mastered = doc.mastery >= MASTERY_THRESHOLD;
  await doc.save();

  res.json({ ok: true, progress: doc });
});

/** GET /api/progress — todo el progreso del alumno autenticado. */
export const getProgress = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const subjectPipeline = [
    { $group: { _id: { rating: '$rating', subject: '$subject' }, count: { $sum: 1 } } },
  ];
  const [items, writtenSubjects, figureSubjects] = await Promise.all([
    Progress.find({ user: userId }).sort({ rating: 1, subject: 1 }).lean(),
    WrittenQuestion.aggregate<SubjectCount>(subjectPipeline),
    FigureQuestion.aggregate<SubjectCount>(subjectPipeline),
  ]);

  const subjectCounts = new Map<string, SubjectCount>();
  for (const entry of [...writtenSubjects, ...figureSubjects]) {
    const key = `${entry._id.rating}:${entry._id.subject}`;
    const current = subjectCounts.get(key);
    subjectCounts.set(key, current ? { ...current, count: current.count + entry.count } : entry);
  }
  const subjects = [...subjectCounts.values()]
    .sort((a, b) => a._id.rating.localeCompare(b._id.rating) || a._id.subject.localeCompare(b._id.subject))
    .map((entry) => ({ rating: entry._id.rating, subject: entry._id.subject, count: entry.count }));

  const byRating: Record<string, { mastered: number; total: number }> = {};
  for (const rating of RATINGS) {
    byRating[rating] = {
      mastered: items.filter((item) => item.rating === rating && item.mastered).length,
      total: subjects.filter((subject) => subject.rating === rating).length,
    };
  }

  res.json({ ok: true, threshold: MASTERY_THRESHOLD, summary: byRating, items });
});
