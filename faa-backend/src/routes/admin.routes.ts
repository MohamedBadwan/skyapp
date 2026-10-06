import { Router } from 'express';
import {
  cancelUserSubscription,
  createAdminStudent,
  createAdminStudentSchema,
  couponCreateSchema,
  createCoupon,
  deactivateCoupon,
  listCoupons,
  reactivateCoupon,
  listUsers,
  grantManualAccess,
  grantManualAccessSchema,
  resendInvitation,
  resendInvitationSchema,
  setUserActive,
  updateUser,
  updateUserActiveSchema,
  updateUserSchema,
} from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/users', listUsers);
router.post('/users', validateBody(createAdminStudentSchema), createAdminStudent);
router.patch('/users/:id', validateBody(updateUserSchema), updateUser);
router.patch('/users/:id/active', validateBody(updateUserActiveSchema), setUserActive);
router.post('/users/:id/resend-invitation', validateBody(resendInvitationSchema), resendInvitation);
router.patch('/users/:id/manual-access', validateBody(grantManualAccessSchema), grantManualAccess);
router.post('/users/:id/cancel-subscription', cancelUserSubscription);
router.get('/coupons', listCoupons);
router.post('/coupons', validateBody(couponCreateSchema), createCoupon);
router.patch('/coupons/:id/deactivate', deactivateCoupon);
router.patch('/coupons/:id/reactivate', reactivateCoupon);

export default router;
