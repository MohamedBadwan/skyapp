import type { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import {
  buildStripeCouponParams,
  buildStripePromotionCodeParams,
  cleanUpStripeCoupon,
  couponCreateSchema,
  getCouponState,
  toEndOfDay,
} from '../src/controllers/admin.controller';
import { buildSubscriptionCheckoutParams } from '../src/controllers/billing.controller';
import { requireRole } from '../src/middleware/auth';
import { stripe } from '../src/services/stripe';
import { ApiError } from '../src/utils/ApiError';

describe('coupon contract', () => {
  it('maps a two-month percentage coupon and calendar end-of-day expiry to Stripe', () => {
    const input = couponCreateSchema.parse({
      name: 'Welcome offer',
      code: 'WELCOME20',
      discountType: 'percentage',
      discountValue: 20,
      duration: 'repeating',
      durationInMonths: 2,
      redeemBy: '2099-12-31',
      maxRedemptions: 7,
    });
    const redeemBy = toEndOfDay(input.redeemBy!);
    const params = buildStripeCouponParams(input, redeemBy);

    expect(redeemBy.toISOString()).toBe('2099-12-31T23:59:59.999Z');
    expect(params).toMatchObject({
      name: 'Welcome offer',
      percent_off: 20,
      duration: 'repeating',
      duration_in_months: 2,
      redeem_by: Math.floor(redeemBy.getTime() / 1000),
    });
    expect(buildStripePromotionCodeParams(input, 'coupon_test', redeemBy)).toMatchObject({
      promotion: { type: 'coupon', coupon: 'coupon_test' },
      max_redemptions: 7,
      expires_at: Math.floor(redeemBy.getTime() / 1000),
    });
  });

  it('rejects an invalid date and invalid duration combination', () => {
    expect(() => toEndOfDay('2099-02-29')).toThrow(ApiError);
    expect(() => couponCreateSchema.parse({
      name: 'Bad duration',
      code: 'BAD-DURATION',
      discountType: 'fixed',
      discountValue: 5,
      duration: 'repeating',
    })).toThrow();
  });

  it('requires a positive redemption limit', () => {
    const couponWithoutLimit = {
      name: 'Limited offer',
      code: 'LIMITED10',
      discountType: 'percentage',
      discountValue: 10,
      duration: 'once',
    };

    expect(() => couponCreateSchema.parse(couponWithoutLimit)).toThrow();
    expect(() => couponCreateSchema.parse({ ...couponWithoutLimit, maxRedemptions: 0 })).toThrow();
  });

  it('derives expired coupons before considering the manual active flag', () => {
    expect(getCouponState({ active: true, redeemBy: new Date('2000-01-01T00:00:00.000Z') })).toBe('expired');
    expect(getCouponState({ active: false, redeemBy: new Date('2099-01-01T00:00:00.000Z') })).toBe('inactive');
  });

  it('marks a coupon as exhausted once its redemption limit is reached', () => {
    expect(getCouponState({ active: true, maxRedemptions: 1 }, 1)).toBe('exhausted');
    expect(getCouponState({ active: true, maxRedemptions: 3 }, 2)).toBe('active');
  });
});

describe('Stripe coupon safety', () => {
  it('disables the promotion code and removes the coupon during partial-provisioning cleanup', async () => {
    const update = vi.spyOn(stripe.promotionCodes, 'update').mockResolvedValue({ id: 'promo_test' } as Stripe.PromotionCode);
    const remove = vi.spyOn(stripe.coupons, 'del').mockResolvedValue({ id: 'coupon_test', deleted: true } as Stripe.DeletedCoupon);

    await cleanUpStripeCoupon({ id: 'coupon_test' } as Stripe.Coupon, { id: 'promo_test' } as Stripe.PromotionCode);

    expect(update).toHaveBeenCalledWith('promo_test', { active: false });
    expect(remove).toHaveBeenCalledWith('coupon_test');
    update.mockRestore();
    remove.mockRestore();
  });

  it('enables Stripe promotion-code entry on subscription Checkout sessions', () => {
    const params = buildSubscriptionCheckoutParams({ price: 'price_monthly', quantity: 1 });
    expect(params).toMatchObject({
      mode: 'subscription',
      allow_promotion_codes: true,
      line_items: [{ price: 'price_monthly', quantity: 1 }],
    });
  });
});

describe('coupon administration authorization', () => {
  it('rejects a student before an administrator-only operation can run', () => {
    const next = vi.fn<NextFunction>();
    const studentRequest = {
      user: { sub: 'student-id', role: 'student', email: 'student@example.com' },
    } as unknown as Request;

    expect(() => requireRole('admin')(studentRequest, {} as Response, next)).toThrow(ApiError);
    expect(next).not.toHaveBeenCalled();
  });
});
