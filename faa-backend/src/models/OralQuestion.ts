import { Schema, model, Document } from 'mongoose';
import { Rating } from './WrittenQuestion';

export interface IOralQuestion extends Document {
  legacyId?: number;
  rating: Rating;
  subject: string;
  q: string; // pregunta en inglés
  a: string; // respuesta en inglés
  q_es: string;
  a_es: string;
}

const oralSchema = new Schema<IOralQuestion>(
  {
    legacyId: { type: Number, index: true },
    rating: { type: String, enum: ['AMG', 'AMA', 'AMP'], required: true, index: true },
    subject: { type: String, required: true, index: true },
    q: { type: String, required: true },
    a: { type: String, required: true },
    q_es: { type: String, default: '' },
    a_es: { type: String, default: '' },
  },
  { timestamps: true }
);

export const OralQuestion = model<IOralQuestion>('OralQuestion', oralSchema);
