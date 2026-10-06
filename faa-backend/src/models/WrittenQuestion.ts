import { Schema, model, Document } from 'mongoose';

export type Rating = 'AMG' | 'AMA' | 'AMP';

export interface IWrittenQuestion extends Document {
  legacyId?: number;
  rating: Rating;
  subject: string;
  q_en: string;
  q_es: string;
  opts_en: string[];
  opts_es: string[];
  correct: number; // índice 0-2
}

const writtenSchema = new Schema<IWrittenQuestion>(
  {
    legacyId: { type: Number, index: true },
    rating: { type: String, enum: ['AMG', 'AMA', 'AMP'], required: true, index: true },
    subject: { type: String, required: true, index: true },
    q_en: { type: String, required: true },
    q_es: { type: String, required: true },
    opts_en: { type: [String], required: true, validate: (v: string[]) => v.length >= 2 },
    opts_es: { type: [String], required: true, validate: (v: string[]) => v.length >= 2 },
    correct: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export const WrittenQuestion = model<IWrittenQuestion>('WrittenQuestion', writtenSchema);
