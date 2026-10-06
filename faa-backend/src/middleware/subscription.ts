import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { hasActiveEntitlement } from '../services/entitlements';
import { ApiError } from '../utils/ApiError';

/**
 * Requires an active subscription. Must run after requireAuth.
 * Admins bypass this check entirely.
 */
export async function requireSubscription(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();

  if (req.user.role === 'admin') {
    next();
    return;
  }

  const user = await User.findById(req.user.sub);
  if (!user) throw ApiError.notFound('Usuario no encontrado.');

  const hasAccess = hasActiveEntitlement(user);

  if (!hasAccess) {
    const err = new ApiError(
      403,
      user.subscriptionStatus === 'past_due'
        ? 'Tu pago falló. Actualiza tu método de pago para continuar.'
        : 'Se requiere una suscripción activa para acceder a este recurso.',
    );
    err.code = 'SUBSCRIPTION_REQUIRED';
    throw err;
  }

  next();
}
