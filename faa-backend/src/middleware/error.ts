import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { isProd } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let message = 'Error interno del servidor';
  let details: unknown;
  let code: string | undefined;

  if (err instanceof ApiError) {
    status = err.status;
    message = err.message;
    details = err.details;
    code = err.code;
  } else if (err instanceof Error) {
    message = err.message;
    if ((err as { code?: number }).code === 11000) {
      status = 409;
      message = 'El registro ya existe (valor duplicado).';
    }
  }

  if (!isProd && status === 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  res.status(status).json({
    ok: false,
    error: message,
    ...(code ? { code } : {}),
    ...(details ? { details } : {}),
  });
}
