import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError';

/** Valida req.body contra un esquema Zod y reemplaza body con el resultado parseado. */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw ApiError.badRequest('Datos inválidos', result.error.flatten());
    }
    req.body = result.data;
    next();
  };
}
