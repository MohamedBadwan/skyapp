import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import Stripe from 'stripe';
import { z } from 'zod';
import { Coupon, ICoupon } from '../models/Coupon';
import { env } from '../config/env';
import { User, hashPassword, type SubscriptionStatus } from '../models/User';
import { SubscriptionEvent } from '../models/SubscriptionEvent';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { getSubscriptionPeriodEnd, stripe } from '../services/stripe';
import { recordSubscriptionEvent } from '../services/subscriptionHistory';
import { getAccessSource, hasActiveStripeSubscription } from '../services/entitlements';
import { createInvitation } from '../services/invitations';
import { isMailerConfigured, sendAccountInvitation } from '../services/mailer';

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().optional(),
}).refine((data) => data.name !== undefined || data.email !== undefined, {
  message: 'Indica al menos un dato para actualizar.',
});

export const updateUserActiveSchema = z.object({
  active: z.boolean(),
});

const accessEndDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD.');
const localeSchema = z.enum(['es', 'en']).default('es');
const accessGrantFields = {
  accessEndsOn: accessEndDateSchema.optional(),
  accessDurationMonths: z.coerce.number().int().min(1).max(36).optional(),
};

function requireSingleAccessLength(
  input: { accessEndsOn?: string; accessDurationMonths?: number },
  ctx: z.RefinementCtx,
): void {
  const count = Number(input.accessEndsOn !== undefined) + Number(input.accessDurationMonths !== undefined);
  if (count !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['accessEndsOn'],
      message: 'Indica una fecha de vencimiento o una cantidad de meses, pero no ambas.',
    });
  }
}

function allowNoMoreThanOneAccessLength(
  input: { accessEndsOn?: string; accessDurationMonths?: number },
  ctx: z.RefinementCtx,
): void {
  if (input.accessEndsOn !== undefined && input.accessDurationMonths !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['accessEndsOn'],
      message: 'Indica una fecha de vencimiento o una cantidad de meses, pero no ambas.',
    });
  }
}

export const createAdminStudentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  ...accessGrantFields,
  locale: localeSchema,
}).superRefine(allowNoMoreThanOneAccessLength);

export const grantManualAccessSchema = z.object(accessGrantFields).superRefine(requireSingleAccessLength);

export const resendInvitationSchema = z.object({
  locale: localeSchema,
});

const couponCodePattern = /^[A-Z0-9-]+$/;

export const couponCreateSchema = z.object({
  name: z.string().trim().min(2).max(40),
  code: z.string().trim().toUpperCase().min(3).max(64).regex(couponCodePattern, 'El código solo puede incluir letras, números y guiones.'),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.coerce.number().finite().positive(),
  duration: z.enum(['once', 'repeating', 'forever']),
  durationInMonths: z.coerce.number().int().min(1).max(36).optional(),
  redeemBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD.').optional(),
  maxRedemptions: z.coerce.number().int().min(1).max(1_000_000),
}).superRefine((input, ctx) => {
  if (input.discountType === 'percentage' && input.discountValue > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message: 'El porcentaje no puede ser mayor a 100.' });
  }
  if (input.duration === 'repeating' && input.durationInMonths === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['durationInMonths'], message: 'Indica la cantidad de meses.' });
  }
  if (input.duration !== 'repeating' && input.durationInMonths !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['durationInMonths'], message: 'Los meses solo aplican a una duración repetida.' });
  }
});

export type CouponCreateInput = z.infer<typeof couponCreateSchema>;

function getUserId(req: Request): Types.ObjectId {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('El identificador del usuario no es válido.');
  return new Types.ObjectId(id);
}

function getCouponId(req: Request): Types.ObjectId {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('El identificador del cupón no es válido.');
  return new Types.ObjectId(id);
}

export function toEndOfDay(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year
    || calendarDate.getUTCMonth() !== month - 1
    || calendarDate.getUTCDate() !== day
  ) {
    throw ApiError.badRequest('La fecha de vencimiento no es válida.');
  }

  const endOfDay = new Date(`${value}T23:59:59.999Z`);
  if (endOfDay.getTime() <= Date.now()) {
    throw ApiError.badRequest('La fecha de vencimiento debe ser futura.');
  }
  return endOfDay;
}

export function addCalendarMonthsToEndOfDay(startAt: Date, months: number): Date {
  const targetMonth = startAt.getUTCFullYear() * 12 + startAt.getUTCMonth() + months;
  const targetYear = Math.floor(targetMonth / 12);
  const targetMonthIndex = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const endOfDay = new Date(Date.UTC(
    targetYear,
    targetMonthIndex,
    Math.min(startAt.getUTCDate(), lastDay),
    23,
    59,
    59,
    999,
  ));

  if (endOfDay.getTime() <= Date.now()) {
    throw ApiError.badRequest('La duración debe producir una fecha de vencimiento futura.');
  }
  return endOfDay;
}

export function getAccessEndsAt(
  input: Pick<z.infer<typeof grantManualAccessSchema>, 'accessEndsOn' | 'accessDurationMonths'>,
  startAt = new Date(),
): Date {
  if (input.accessEndsOn) return toEndOfDay(input.accessEndsOn);
  if (input.accessDurationMonths) return addCalendarMonthsToEndOfDay(startAt, input.accessDurationMonths);
  throw ApiError.badRequest('Indica una fecha de vencimiento o una cantidad de meses.');
}

function getCurrencyFractionDigits(currency: string): number {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * (10 ** getCurrencyFractionDigits(currency)));
}

export function getCouponState(
  coupon: Pick<ICoupon, 'active' | 'redeemBy' | 'maxRedemptions'>,
  timesRedeemed = 0,
): 'active' | 'inactive' | 'expired' | 'exhausted' {
  if (coupon.redeemBy && coupon.redeemBy.getTime() <= Date.now()) return 'expired';
  if (coupon.maxRedemptions !== undefined && timesRedeemed >= coupon.maxRedemptions) return 'exhausted';
  return coupon.active ? 'active' : 'inactive';
}

function serializeCoupon(coupon: Pick<
  ICoupon,
  '_id' | 'name' | 'code' | 'discountType' | 'percentOff' | 'amountOff' | 'currency'
  | 'duration' | 'durationInMonths' | 'redeemBy' | 'maxRedemptions' | 'active' | 'createdAt'
>, timesRedeemed = 0) {
  return {
    id: coupon._id.toString(),
    name: coupon.name,
    code: coupon.code,
    discountType: coupon.discountType,
    percentOff: coupon.percentOff,
    amountOff: coupon.amountOff,
    currency: coupon.currency,
    duration: coupon.duration,
    durationInMonths: coupon.durationInMonths,
    redeemBy: coupon.redeemBy,
    maxRedemptions: coupon.maxRedemptions,
    timesRedeemed,
    active: coupon.active,
    state: getCouponState(coupon, timesRedeemed),
    createdAt: coupon.createdAt,
  };
}

export function buildStripeCouponParams(input: CouponCreateInput, redeemBy?: Date): Stripe.CouponCreateParams {
  const params: Stripe.CouponCreateParams = {
    name: input.name,
    duration: input.duration,
    metadata: { source: 'skymentor-admin-coupons' },
  };

  if (input.duration === 'repeating') params.duration_in_months = input.durationInMonths!;
  if (redeemBy) params.redeem_by = Math.floor(redeemBy.getTime() / 1000);

  if (input.discountType === 'percentage') {
    params.percent_off = input.discountValue;
  } else {
    params.amount_off = toMinorUnits(input.discountValue, env.stripe.subscriptionCurrency);
    params.currency = env.stripe.subscriptionCurrency;
  }

  return params;
}

export function buildStripePromotionCodeParams(
  input: CouponCreateInput,
  stripeCouponId: string,
  redeemBy?: Date,
): Stripe.PromotionCodeCreateParams {
  return {
    promotion: { type: 'coupon', coupon: stripeCouponId },
    code: input.code,
    active: true,
    max_redemptions: input.maxRedemptions,
    ...(redeemBy ? { expires_at: Math.floor(redeemBy.getTime() / 1000) } : {}),
    metadata: { source: 'skymentor-admin-coupons' },
  };
}

export async function cleanUpStripeCoupon(coupon?: Stripe.Coupon, promotionCode?: Stripe.PromotionCode): Promise<void> {
  if (promotionCode) {
    try {
      await stripe.promotionCodes.update(promotionCode.id, { active: false });
    } catch (error) {
      console.error('⚠️  No se pudo desactivar el código promocional después de un error:', error);
    }
  }
  if (coupon) {
    try {
      await stripe.coupons.del(coupon.id);
    } catch (error) {
      console.error('⚠️  No se pudo eliminar el cupón de Stripe después de un error:', error);
    }
  }
}

function serializeHistory(event: {
  _id: Types.ObjectId;
  event: string;
  status: string;
  occurredAt: Date;
  paidAt?: Date;
  periodEnd?: Date;
  cancelAtPeriodEnd: boolean;
}) {
  return {
    id: event._id.toString(),
    event: event.event,
    status: event.status,
    occurredAt: event.occurredAt,
    paidAt: event.paidAt,
    periodEnd: event.periodEnd,
    cancelAtPeriodEnd: event.cancelAtPeriodEnd,
  };
}

function serializeUser(user: {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: string;
  active: boolean;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  manualAccessEndsAt?: Date;
  manualAccessGrantedAt?: Date;
  manualAccessGrantedBy?: Types.ObjectId;
  invitationExpiresAt?: Date;
  invitationAcceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  const invitationState = user.invitationAcceptedAt
    ? 'accepted'
    : user.invitationExpiresAt
      ? user.invitationExpiresAt > new Date() ? 'pending' : 'expired'
      : 'not_invited';

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    subscriptionStatus: user.subscriptionStatus,
    currentPeriodEnd: user.currentPeriodEnd,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd ?? false,
    manualAccessEndsAt: user.manualAccessEndsAt,
    manualAccessGrantedAt: user.manualAccessGrantedAt,
    manualAccessGrantedBy: user.manualAccessGrantedBy?.toString(),
    accessSource: getAccessSource(user),
    invitationState,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().sort({ updatedAt: -1 });
  const userIds = users.map((user) => user._id);
  const events = await SubscriptionEvent.find({ user: { $in: userIds } }).sort({ occurredAt: -1 });
  const historyByUser = new Map<string, ReturnType<typeof serializeHistory>[]>();

  for (const event of events) {
    const userId = event.user.toString();
    const history = historyByUser.get(userId) ?? [];
    history.push(serializeHistory(event));
    historyByUser.set(userId, history);
  }

  res.json({
    ok: true,
    users: users.map((user) => ({
      ...serializeUser(user),
      subscriptionHistory: historyByUser.get(user._id.toString()) ?? [],
    })),
  });
});

export const listCoupons = asyncHandler(async (_req: Request, res: Response) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  const serializedCoupons = await Promise.all(coupons.map(async (coupon) => {
    const promotionCode = await stripe.promotionCodes.retrieve(coupon.stripePromotionCodeId);
    return serializeCoupon(coupon, promotionCode.times_redeemed);
  }));
  res.json({ ok: true, coupons: serializedCoupons });
});

async function compensateForInvitationFailure(userId: Types.ObjectId): Promise<void> {
  try {
    const result = await User.deleteOne({ _id: userId });
    if (result.deletedCount === 1) return;
  } catch (error) {
    console.error('[admin-invitation] Unable to delete student after mail failure', error);
  }

  await User.updateOne(
    { _id: userId },
    {
      $set: { active: false },
      $unset: {
        manualAccessEndsAt: 1,
        manualAccessGrantedAt: 1,
        manualAccessGrantedBy: 1,
        invitationTokenHash: 1,
        invitationExpiresAt: 1,
      },
    },
  );
}

export const createAdminStudent = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as z.infer<typeof createAdminStudentSchema>;
  if (!isMailerConfigured()) {
    throw new ApiError(503, 'El envío de invitaciones no está disponible en este momento.');
  }

  const now = new Date();
  const accessEndsAt = input.accessEndsOn || input.accessDurationMonths
    ? getAccessEndsAt(input, now)
    : undefined;
  const normalizedEmail = input.email.toLowerCase();
  const exists = await User.exists({ email: normalizedEmail });
  if (exists) throw ApiError.conflict('Ya existe una cuenta con ese correo.');

  const invitation = createInvitation();
  const user = await User.create({
    name: input.name,
    email: normalizedEmail,
    passwordHash: await hashPassword(randomBytes(32).toString('hex')),
    role: 'student',
    active: true,
    ...(accessEndsAt ? {
      manualAccessEndsAt: accessEndsAt,
      manualAccessGrantedAt: now,
      manualAccessGrantedBy: new Types.ObjectId(req.user!.sub),
    } : {}),
    invitationTokenHash: invitation.tokenHash,
    invitationExpiresAt: invitation.expiresAt,
  });

  try {
    await sendAccountInvitation({
      email: user.email,
      name: user.name,
      token: invitation.token,
      accessEndsAt,
      locale: input.locale,
    });
  } catch (error) {
    await compensateForInvitationFailure(user._id);
    const mailError = error as { code?: string; responseCode?: number };
    console.error('[admin-invitation] Unable to send invitation email', {
      code: mailError.code,
      responseCode: mailError.responseCode,
    });
    throw new ApiError(503, 'No fue posible enviar la invitación. No se creó una cuenta utilizable.');
  }

  if (accessEndsAt) {
    await recordSubscriptionEvent({
      user: user._id,
      event: 'manual_access_granted',
      status: user.subscriptionStatus,
      periodEnd: user.manualAccessEndsAt,
    });
  }

  res.status(201).json({ ok: true, user: serializeUser(user) });
});

export const resendInvitation = asyncHandler(async (req: Request, res: Response) => {
  const { locale } = req.body as z.infer<typeof resendInvitationSchema>;
  if (!isMailerConfigured()) {
    throw new ApiError(503, 'El envío de invitaciones no está disponible en este momento.');
  }

  const user = await User.findById(getUserId(req)).select('+invitationTokenHash');
  if (!user) throw ApiError.notFound('Usuario no encontrado.');
  if (user.role !== 'student' || user.invitationAcceptedAt || !user.invitationExpiresAt) {
    throw ApiError.badRequest('Este usuario no tiene una invitación pendiente que pueda reenviarse.');
  }

  const previousTokenHash = user.invitationTokenHash;
  const previousExpiresAt = user.invitationExpiresAt;
  const invitation = createInvitation();
  user.invitationTokenHash = invitation.tokenHash;
  user.invitationExpiresAt = invitation.expiresAt;
  await user.save();

  try {
    await sendAccountInvitation({
      email: user.email,
      name: user.name,
      token: invitation.token,
      accessEndsAt: user.manualAccessEndsAt,
      locale,
    });
  } catch (error) {
    user.invitationTokenHash = previousTokenHash;
    user.invitationExpiresAt = previousExpiresAt;
    await user.save();
    throw new ApiError(503, 'No fue posible reenviar la invitación. La invitación anterior permanece vigente.');
  }

  res.json({ ok: true, user: serializeUser(user), message: 'La invitación se envió nuevamente.' });
});

export const grantManualAccess = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as z.infer<typeof grantManualAccessSchema>;
  const user = await User.findById(getUserId(req));
  if (!user) throw ApiError.notFound('Usuario no encontrado.');
  if (user.role !== 'student') throw ApiError.badRequest('Solo puedes otorgar acceso manual a estudiantes.');
  if (hasActiveStripeSubscription(user)) {
    throw ApiError.badRequest('Este usuario tiene una suscripción de Stripe activa. No se puede superponer acceso manual.');
  }

  const now = new Date();
  const activeManualEnd = user.manualAccessEndsAt && user.manualAccessEndsAt > now
    ? user.manualAccessEndsAt
    : undefined;
  const accessEndsAt = getAccessEndsAt(input, activeManualEnd ?? now);
  if (activeManualEnd && accessEndsAt <= activeManualEnd) {
    throw ApiError.badRequest('La fecha o duración resultante debe ser posterior al acceso manual vigente.');
  }

  const isExtension = Boolean(user.manualAccessEndsAt);
  user.manualAccessEndsAt = accessEndsAt;
  user.manualAccessGrantedAt = new Date();
  user.manualAccessGrantedBy = new Types.ObjectId(req.user!.sub);
  await user.save();
  await recordSubscriptionEvent({
    user: user._id,
    event: isExtension ? 'manual_access_extended' : 'manual_access_granted',
    status: user.subscriptionStatus,
    periodEnd: accessEndsAt,
  });

  res.json({ ok: true, user: serializeUser(user) });
});

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CouponCreateInput;
  const redeemBy = input.redeemBy ? toEndOfDay(input.redeemBy) : undefined;
  const existing = await Coupon.exists({ normalizedCode: input.code });
  if (existing) throw ApiError.conflict('Ya existe un cupón con este código.');

  let stripeCoupon: Stripe.Coupon | undefined;
  let promotionCode: Stripe.PromotionCode | undefined;
  try {
    stripeCoupon = await stripe.coupons.create(buildStripeCouponParams(input, redeemBy));
    promotionCode = await stripe.promotionCodes.create(
      buildStripePromotionCodeParams(input, stripeCoupon.id, redeemBy),
    );

    const coupon = await Coupon.create({
      name: input.name,
      code: input.code,
      normalizedCode: input.code,
      discountType: input.discountType,
      ...(input.discountType === 'percentage'
        ? { percentOff: input.discountValue }
        : {
            amountOff: toMinorUnits(input.discountValue, env.stripe.subscriptionCurrency),
            currency: env.stripe.subscriptionCurrency,
          }),
      duration: input.duration,
      ...(input.duration === 'repeating' ? { durationInMonths: input.durationInMonths } : {}),
      ...(redeemBy ? { redeemBy } : {}),
      maxRedemptions: input.maxRedemptions,
      stripeCouponId: stripeCoupon.id,
      stripePromotionCodeId: promotionCode.id,
      active: true,
      createdBy: new Types.ObjectId(req.user!.sub),
    });

    res.status(201).json({ ok: true, coupon: serializeCoupon(coupon, promotionCode.times_redeemed) });
  } catch (error) {
    await cleanUpStripeCoupon(stripeCoupon, promotionCode);
    throw error;
  }
});

export const deactivateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await Coupon.findById(getCouponId(req));
  if (!coupon) throw ApiError.notFound('Cupón no encontrado.');
  if (getCouponState(coupon) === 'expired') {
    throw ApiError.badRequest('El cupón ya venció y no puede modificarse.');
  }
  if (!coupon.active) throw ApiError.badRequest('El cupón ya está desactivado.');

  const promotionCode = await stripe.promotionCodes.update(coupon.stripePromotionCodeId, { active: false });
  coupon.active = false;
  await coupon.save();

  res.json({ ok: true, coupon: serializeCoupon(coupon, promotionCode.times_redeemed) });
});

export const reactivateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await Coupon.findById(getCouponId(req));
  if (!coupon) throw ApiError.notFound('Cupón no encontrado.');
  if (getCouponState(coupon) === 'expired') {
    throw ApiError.badRequest('El cupón venció y no puede reactivarse.');
  }
  if (coupon.active) throw ApiError.badRequest('El cupón ya está activo.');

  const stripeCoupon = await stripe.coupons.retrieve(coupon.stripeCouponId);
  if (!stripeCoupon.valid) {
    throw ApiError.badRequest('El cupón de Stripe ya no es válido y no puede reactivarse.');
  }

  const promotionCode = await stripe.promotionCodes.retrieve(coupon.stripePromotionCodeId);
  if (coupon.maxRedemptions !== undefined && promotionCode.times_redeemed >= coupon.maxRedemptions) {
    throw ApiError.badRequest('El cupón ya alcanzó su límite de usos y no puede reactivarse.');
  }

  const reactivatedPromotionCode = await stripe.promotionCodes.update(coupon.stripePromotionCodeId, { active: true });
  coupon.active = true;
  await coupon.save();

  res.json({ ok: true, coupon: serializeCoupon(coupon, reactivatedPromotionCode.times_redeemed) });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const input = req.body as z.infer<typeof updateUserSchema>;
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('Usuario no encontrado.');

  const normalizedEmail = input.email?.toLowerCase();
  if (normalizedEmail && normalizedEmail !== user.email) {
    const existing = await User.exists({ _id: { $ne: userId }, email: normalizedEmail });
    if (existing) throw ApiError.conflict('Ya existe una cuenta con ese correo.');
    if (!user.invitationAcceptedAt && user.invitationExpiresAt) {
      throw ApiError.badRequest('Reenvía la invitación en lugar de cambiar el correo de una cuenta pendiente.');
    }
    user.email = normalizedEmail;
  }
  if (input.name !== undefined) user.name = input.name;
  await user.save();

  res.json({ ok: true, user: serializeUser(user) });
});

export const setUserActive = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { active } = req.body as z.infer<typeof updateUserActiveSchema>;
  if (req.user!.sub === userId.toString() && !active) {
    throw ApiError.badRequest('No puedes desactivar tu propia cuenta de administrador.');
  }

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('Usuario no encontrado.');
  user.active = active;
  await user.save();

  res.json({ ok: true, user: serializeUser(user) });
});

export const cancelUserSubscription = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('Usuario no encontrado.');
  if (!hasActiveStripeSubscription(user) || !user.subscriptionId) {
    throw ApiError.badRequest('Este usuario no tiene una suscripción activa para cancelar.');
  }
  if (user.cancelAtPeriodEnd) {
    throw ApiError.badRequest('La suscripción de este usuario ya está programada para cancelarse.');
  }

  const subscription = await stripe.subscriptions.update(user.subscriptionId, {
    cancel_at_period_end: true,
  });
  user.cancelAtPeriodEnd = true;
  user.currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
  await user.save();
  await recordSubscriptionEvent({
    user: user._id,
    subscriptionId: user.subscriptionId,
    event: 'cancellation_scheduled',
    status: user.subscriptionStatus,
    periodEnd: user.currentPeriodEnd,
    cancelAtPeriodEnd: true,
  });

  res.json({
    ok: true,
    user: serializeUser(user),
    message: 'La renovación fue cancelada. El usuario conserva el acceso hasta el final del período pagado.',
  });
});
