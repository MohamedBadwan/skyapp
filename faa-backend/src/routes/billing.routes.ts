import { Router } from 'express';
import { createCheckout, cancelSubscription, getStatus } from '../controllers/billing.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/checkout', createCheckout);
router.post('/cancel', cancelSubscription);
router.get('/status', getStatus);

export default router;
