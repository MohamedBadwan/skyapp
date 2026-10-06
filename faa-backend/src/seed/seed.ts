/**
 * Seed: carga los bancos (escrito, figuras, oral) en MongoDB y crea el usuario admin.
 * Uso:  npm run seed          (desarrollo, con ts-node)
 *       npm run build && npm run seed:prod   (producción)
 *
 * Los archivos de datos viven en ../../data relativo a este archivo.
 */
import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from '../config/db';
import { env } from '../config/env';
import { WrittenQuestion } from '../models/WrittenQuestion';
import { FigureQuestion } from '../models/FigureQuestion';
import { OralQuestion } from '../models/OralQuestion';
import { User, hashPassword } from '../models/User';

const DATA_DIR = path.resolve(__dirname, '../../data');

function readJson<T>(file: string): T {
  const full = path.join(DATA_DIR, file);
  return JSON.parse(fs.readFileSync(full, 'utf-8')) as T;
}

interface RawWritten {
  id?: number;
  rating: string;
  subject: string;
  q_en: string;
  q_es: string;
  opts_en: string[];
  opts_es: string[];
  correct: number;
}
interface RawFigure {
  rating: string;
  subject: string;
  q_en: string;
  q_es: string;
  opts_en: string[];
  opts_es: string[];
  correct: number;
  img: string;
}
interface RawOral {
  id?: number;
  rating: string;
  subject: string;
  q: string;
  a: string;
  q_es?: string;
  a_es?: string;
}

async function seedAdmin(): Promise<void> {
  const existing = await User.findOne({ email: env.adminEmail });
  if (existing) {
    console.log(`[seed] Admin ya existe: ${env.adminEmail}`);
    return;
  }
  const passwordHash = await hashPassword(env.adminPassword);
  await User.create({
    name: 'Administrador',
    email: env.adminEmail,
    passwordHash,
    role: 'admin',
  });
  console.log(`[seed] Admin creado: ${env.adminEmail}`);
}

async function main(): Promise<void> {
  await connectDB();

  console.log('[seed] Limpiando colecciones de preguntas...');
  await Promise.all([
    WrittenQuestion.deleteMany({}),
    FigureQuestion.deleteMany({}),
    OralQuestion.deleteMany({}),
  ]);

  const written = readJson<RawWritten[]>('written_bank.json').map((q) => ({
    legacyId: q.id,
    rating: q.rating,
    subject: q.subject,
    q_en: q.q_en,
    q_es: q.q_es,
    opts_en: q.opts_en,
    opts_es: q.opts_es,
    correct: q.correct,
  }));
  await WrittenQuestion.insertMany(written, { ordered: false });
  console.log(`[seed] Escritas (texto): ${written.length}`);

  const figures = readJson<RawFigure[]>('figure_bank.json');
  await FigureQuestion.insertMany(figures, { ordered: false });
  console.log(`[seed] Figuras: ${figures.length}`);

  const oral = readJson<RawOral[]>('oral_bank.json').map((q) => ({
    legacyId: q.id,
    rating: q.rating,
    subject: q.subject,
    q: q.q,
    a: q.a,
    q_es: q.q_es ?? '',
    a_es: q.a_es ?? '',
  }));
  await OralQuestion.insertMany(oral, { ordered: false });
  console.log(`[seed] Orales: ${oral.length}`);

  await seedAdmin();

  console.log('[seed] Completado.');
  await disconnectDB();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('[seed] Error:', err);
  await disconnectDB();
  process.exit(1);
});
