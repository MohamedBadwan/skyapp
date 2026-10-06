import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  me,
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetVerificationSchema,
  passwordResetSchema,
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
  acceptInvitation,
  invitationAcceptanceSchema,
} from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';

const router = Router();

const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiadas solicitudes de restablecimiento. Intenta de nuevo más tarde.' },
});

const passwordResetConfirmationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados intentos. Solicita un código nuevo e inténtalo más tarde.' },
});

const invitationAcceptanceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados intentos de invitación. Intenta de nuevo más tarde.' },
});

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/password-reset/request', passwordResetRequestLimiter, validateBody(passwordResetRequestSchema), requestPasswordReset);
router.post('/password-reset/verify', passwordResetConfirmationLimiter, validateBody(passwordResetVerificationSchema), verifyPasswordResetCode);
router.post('/password-reset/confirm', passwordResetConfirmationLimiter, validateBody(passwordResetSchema), resetPassword);
router.post('/invitations/accept', invitationAcceptanceLimiter, validateBody(invitationAcceptanceSchema), acceptInvitation);
router.get('/me', requireAuth, me);

export default router;
