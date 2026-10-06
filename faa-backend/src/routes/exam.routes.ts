import { Router } from 'express';
import { generateWrittenExam } from '../controllers/exam.controller';
import { requireAuth } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';

const router = Router();

router.use(requireAuth);
router.use(requireSubscription);
router.get('/written/:rating', generateWrittenExam);

export default router;
