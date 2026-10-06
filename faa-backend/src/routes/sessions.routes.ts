import { Router } from 'express';
import { listSessions, saveSession, removeSession, saveSessionSchema, deleteSessionSchema } from '../controllers/sessions.controller';
import { requireAuth } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(requireAuth);
router.use(requireSubscription);

router.get('/', listSessions);
router.post('/', validateBody(saveSessionSchema), saveSession);
router.delete('/', validateBody(deleteSessionSchema), removeSession);

export default router;
