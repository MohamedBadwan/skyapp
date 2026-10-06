import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env, getMissingRequiredEnv, isProd } from './config/env';
import { connectDB } from './config/db';
import routes from './routes';
import { handleWebhook } from './controllers/billing.controller';
import { notFoundHandler, errorHandler } from './middleware/error';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((s) => s.trim()),
      credentials: true,
    })
  );
  app.use(compression());

  // Stripe webhook needs the raw body for signature verification.
  // Must be mounted BEFORE express.json().
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleWebhook);

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(isProd ? 'combined' : 'dev'));

  app.use((_req, res, next) => {
    const missing = getMissingRequiredEnv();
    if (missing.length > 0) {
      res.status(503).json({
        ok: false,
        error: `Faltan variables de entorno de producción: ${missing.join(', ')}`,
      });
      return;
    }
    next();
  });

  // A Vercel function can be started without running server.ts. Connect here so
  // both the local server and Vercel's default Express export use MongoDB.
  app.use(async (_req, _res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      next(error);
    }
  });

  // Rate limit global (protege login/registro de fuerza bruta).
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { ok: false, error: 'Demasiadas solicitudes, intenta más tarde.' },
    })
  );

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// Vercel detects this default Express export from src/app.ts and routes every
// request to it without needing a serverless rewrite or app.listen().
const app = createApp();

export default app;
