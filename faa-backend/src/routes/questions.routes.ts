import { Router } from 'express';
import {
  listWritten,
  listFigures,
  resolveWritten,
  resolveWrittenSchema,
  listOral,
  listOralSubjects,
  listSubjects,
} from '../controllers/questions.controller';
import { requireAuth } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(requireAuth);
router.use(requireSubscription);

router.get('/subjects', listSubjects);
router.get('/written', listWritten);
router.get('/figures', listFigures);
router.post('/resolve', validateBody(resolveWrittenSchema), resolveWritten);
router.get('/oral/subjects', listOralSubjects);
router.get('/oral', listOral);

export default router;
