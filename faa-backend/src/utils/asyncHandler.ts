import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Envuelve un controlador async para que los errores lleguen al middleware de errores
 * sin necesidad de try/catch en cada handler.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
