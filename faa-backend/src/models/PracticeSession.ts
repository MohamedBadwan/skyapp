import { Schema, model, Document, Types } from 'mongoose';
import { Rating } from './WrittenQuestion';

export type SessionType = 'study' | 'exam' | 'oral';
export type SessionMode = 'practice' | 'exam';

/**
 * Estado recuperable de una sesión. Las sesiones de estudio se distinguen además
 * por materia; así un alumno puede dejar varias materias a medias sin que se
 * reemplacen entre sí.
 */
export interface IPracticeSession extends Document {
  user: Types.ObjectId;
  rating: Rating;
  sessionType: SessionType;
  mode: SessionMode;
  subject: string | null;
  questionIds: string[];
  answers: Record<string, number>;
  currentIndex: number;
  remainingSeconds: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const practiceSessionSchema = new Schema<IPracticeSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: String, enum: ['AMG', 'AMA', 'AMP'], required: true },
    sessionType: { type: String, enum: ['study', 'exam', 'oral'], required: true },
    mode: { type: String, enum: ['practice', 'exam'], required: true },
    subject: { type: String, default: null },
    questionIds: { type: [String], required: true, validate: (ids: string[]) => ids.length > 0 },
    answers: { type: Schema.Types.Mixed, default: {} },
    currentIndex: { type: Number, required: true, min: 0 },
    remainingSeconds: { type: Number, default: null, min: 0 },
  },
  { timestamps: true }
);

practiceSessionSchema.index(
  { user: 1, rating: 1, sessionType: 1, mode: 1, subject: 1 },
  { unique: true }
);

export const PracticeSession = model<IPracticeSession>('PracticeSession', practiceSessionSchema);
