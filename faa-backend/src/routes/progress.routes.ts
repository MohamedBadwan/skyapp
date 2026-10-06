import { Router } from 'express';
import { recordProgress, getProgress, recordSchema } from '../controllers/progress.controller';
import { validateBody } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';

const router = Router();

router.use(requireAuth);
router.use(requireSubscription);
router.get('/', getProgress);
router.post('/', validateBody(recordSchema), recordProgress);

export default router;
