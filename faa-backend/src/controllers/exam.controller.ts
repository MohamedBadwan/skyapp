import { Request, Response } from 'express';
import { WrittenQuestion, Rating } from '../models/WrittenQuestion';
import { FigureQuestion } from '../models/FigureQuestion';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

// Cantidades oficiales del examen escrito FAA.
const EXAM_SIZE: Record<Rating, number> = { AMG: 60, AMA: 100, AMP: 100 };
const RATINGS: Rating[] = ['AMG', 'AMA', 'AMP'];

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * GET /api/exam/written/:rating?count=NN
 * Genera un examen aleatorio del tamaño oficial (o el que se pida), mezclando materias y figuras.
 */
export const generateWrittenExam = asyncHandler(async (req: Request, res: Response) => {
  const rating = String(req.params.rating).toUpperCase() as Rating;
  if (!RATINGS.includes(rating)) {
    throw ApiError.badRequest(`rating inválido. Usa uno de: ${RATINGS.join(', ')}`);
  }

  const [writtenQuestions, figureQuestions] = await Promise.all([
    WrittenQuestion.find({ rating }).lean(),
    FigureQuestion.find({ rating }).lean(),
  ]);
  const availableQuestions = [...writtenQuestions, ...figureQuestions];
  const requested = parseInt(String(req.query.count ?? EXAM_SIZE[rating]), 10);
  const size = Number.isNaN(requested)
    ? Math.min(EXAM_SIZE[rating], availableQuestions.length)
    : Math.min(Math.max(requested, 1), availableQuestions.length);
  const questions = shuffle(availableQuestions).slice(0, size);

  res.json({
    ok: true,
    rating,
    passScore: 70,
    total: questions.length,
    available: availableQuestions.length,
    questions,
  });
});
