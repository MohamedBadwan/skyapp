import { Schema, model, Document, Types } from 'mongoose';
import { Rating } from './WrittenQuestion';

/**
 * Progreso del alumno por materia: intentos, aciertos y % de dominio.
 * Un documento por (user, rating, subject).
 */
export interface IProgress extends Document {
  user: Types.ObjectId;
  rating: Rating;
  subject: string;
  attempted: number;
  correct: number;
  mastery: number; // 0..1 (aciertos / intentos)
  mastered: boolean; // true cuando mastery >= 0.8
  lastStudiedAt: Date;
}

const progressSchema = new Schema<IProgress>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: String, enum: ['AMG', 'AMA', 'AMP'], required: true },
    subject: { type: String, required: true },
    attempted: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    mastery: { type: Number, default: 0 },
    mastered: { type: Boolean, default: false },
    lastStudiedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

progressSchema.index({ user: 1, rating: 1, subject: 1 }, { unique: true });

export const MASTERY_THRESHOLD = 0.8;

export const Progress = model<IProgress>('Progress', progressSchema);
