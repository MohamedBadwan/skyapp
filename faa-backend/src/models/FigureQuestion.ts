import { Schema, model, Document } from 'mongoose';
import { Rating } from './WrittenQuestion';

export interface IFigureQuestion extends Document {
  rating: Rating;
  subject: string;
  q_en: string;
  q_es: string;
  opts_en: string[];
  opts_es: string[];
  correct: number;
  img: string; // data:image/jpeg;base64,...
}

const figureSchema = new Schema<IFigureQuestion>(
  {
    rating: { type: String, enum: ['AMG', 'AMA', 'AMP'], required: true, index: true },
    subject: { type: String, required: true, index: true },
    q_en: { type: String, required: true },
    q_es: { type: String, required: true },
    opts_en: { type: [String], required: true },
    opts_es: { type: [String], required: true },
    correct: { type: Number, required: true, min: 0 },
    img: { type: String, required: true },
  },
  { timestamps: true }
);

export const FigureQuestion = model<IFigureQuestion>('FigureQuestion', figureSchema);
