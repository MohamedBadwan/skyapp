import { Request, Response } from 'express';
import { z } from 'zod';
import { PracticeSession } from '../models/PracticeSession';
import { asyncHandler } from '../utils/asyncHandler';

const ratingSchema = z.enum(['AMG', 'AMA', 'AMP']);
const sessionTypeSchema = z.enum(['study', 'exam', 'oral']);
const sessionModeSchema = z.enum(['practice', 'exam']);
const subjectSchema = z.string().trim().min(1).max(200).nullable();

const sessionIdentityBaseSchema = z.object({
  rating: ratingSchema,
  sessionType: sessionTypeSchema,
  mode: sessionModeSchema,
  subject: subjectSchema,
});

function validateSessionIdentity(
  data: z.infer<typeof sessionIdentityBaseSchema>,
  ctx: z.RefinementCtx
): void {
  if ((data.sessionType === 'study' || data.sessionType === 'oral') && !data.subject) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La materia es obligatoria para una sesión de estudio.', path: ['subject'] });
  }
  if (data.sessionType === 'exam' && data.subject !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Un examen no debe tener materia.', path: ['subject'] });
  }
}

const sessionIdentitySchema = sessionIdentityBaseSchema.superRefine(validateSessionIdentity);

export const saveSessionSchema = sessionIdentityBaseSchema.extend({
  questionIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(500),
  answers: z.record(z.number().int().min(0).max(2)),
  currentIndex: z.number().int().min(0),
  remainingSeconds: z.number().int().min(0).nullable(),
}).superRefine((data, ctx) => {
  validateSessionIdentity(data, ctx);

  if (data.currentIndex >= data.questionIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La posición actual debe estar dentro de la sesión.',
      path: ['currentIndex'],
    });
  }

  if (Object.keys(data.answers).some((questionId) => !data.questionIds.includes(questionId))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Las respuestas deben pertenecer a las preguntas de la sesión.',
      path: ['answers'],
    });
  }
});

export const deleteSessionSchema = sessionIdentitySchema;

const sessionQuerySchema = z.object({
  rating: ratingSchema.optional(),
  sessionType: sessionTypeSchema.optional(),
  mode: sessionModeSchema.optional(),
});

/** GET /api/sessions — sesiones sin terminar del usuario autenticado. */
export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const query = sessionQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = { user: req.user!.sub };
  if (query.rating) filter.rating = query.rating;
  if (query.sessionType) filter.sessionType = query.sessionType;
  if (query.mode) filter.mode = query.mode;

  const sessions = await PracticeSession.find(filter).sort({ updatedAt: -1 }).lean();
  res.json({ ok: true, sessions });
});

/** POST /api/sessions — crea o actualiza una sesión de forma idempotente. */
export const saveSession = asyncHandler(async (req: Request, res: Response) => {
  const session = req.body as z.infer<typeof saveSessionSchema>;
  const filter = {
    user: req.user!.sub,
    rating: session.rating,
    sessionType: session.sessionType,
    mode: session.mode,
    subject: session.subject,
  };

  const doc = await PracticeSession.findOneAndUpdate(
    filter,
    {
      $set: {
        questionIds: session.questionIds,
        answers: session.answers,
        currentIndex: session.currentIndex,
        remainingSeconds: session.remainingSeconds,
      },
      $setOnInsert: filter,
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  res.json({ ok: true, session: doc });
});

/** DELETE /api/sessions — elimina una sesión terminada o reiniciada. */
export const removeSession = asyncHandler(async (req: Request, res: Response) => {
  const session = req.body as z.infer<typeof deleteSessionSchema>;
  await PracticeSession.deleteOne({ user: req.user!.sub, ...session });
  res.json({ ok: true });
});
