import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { User, UserRole } from '../models/User';

/**
 * Requiere un JWT válido en el header Authorization: Bearer <token>.
 * Coloca el payload en req.user.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    next(ApiError.unauthorized('Falta el token de autenticación (Bearer).'));
    return;
  }

  let tokenPayload;
  try {
    tokenPayload = verifyToken(token);
  } catch {
    next(ApiError.unauthorized('Token inválido o expirado.'));
    return;
  }

  void User.findById(tokenPayload.sub)
    .select('role email active')
    .then((user) => {
      if (!user || !user.active) {
        next(ApiError.unauthorized('Esta cuenta no está activa.'));
        return;
      }
      req.user = { sub: user._id.toString(), role: user.role, email: user.email };
      next();
    })
    .catch(next);
}

/** Restringe una ruta a ciertos roles. Úsalo después de requireAuth. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('No tienes permiso para esta acción.');
    }
    next();
  };
}
