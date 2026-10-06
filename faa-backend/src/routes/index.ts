import { Router } from 'express';
import authRoutes from './auth.routes';
import questionsRoutes from './questions.routes';
import examRoutes from './exam.routes';
import progressRoutes from './progress.routes';
import billingRoutes from './billing.routes';
import sessionsRoutes from './sessions.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true, service: 'faa-ap-exam-backend' }));

router.use('/auth', authRoutes);
router.use('/billing', billingRoutes);
router.use('/questions', questionsRoutes);
router.use('/exam', examRoutes);
router.use('/progress', progressRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/admin', adminRoutes);

export default router;
