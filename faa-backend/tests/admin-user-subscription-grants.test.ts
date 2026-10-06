import { describe, expect, it } from 'vitest';
import {
  createAdminStudentSchema,
  getAccessEndsAt,
  grantManualAccessSchema,
  resendInvitationSchema,
  toEndOfDay,
} from '../src/controllers/admin.controller';
import { invitationAcceptanceSchema } from '../src/controllers/auth.controller';
import {
  createInvitation,
  hashInvitationToken,
  isInvitationUsable,
} from '../src/services/invitations';
import {
  getAccessSource,
  hasActiveEntitlement,
  hasActiveManualAccess,
  hasActiveStripeSubscription,
} from '../src/services/entitlements';
import { getAccountInvitationCopy } from '../src/services/mailer';
import { ApiError } from '../src/utils/ApiError';

describe('administrator-provisioned access contracts', () => {
  it('converts an access-end calendar date to the end of that UTC day', () => {
    const accessEndsAt = toEndOfDay('2099-12-31');
    expect(accessEndsAt.toISOString()).toBe('2099-12-31T23:59:59.999Z');
  });

  it('allows a student invitation without a subscription and validates selected subscription lengths', () => {
    expect(createAdminStudentSchema.parse({
      name: 'Invitation Only',
      email: 'invitation@example.com',
    })).toMatchObject({ locale: 'es' });
    expect(createAdminStudentSchema.parse({
      name: 'Invited Student',
      email: 'student@example.com',
      accessEndsOn: '2099-12-31',
    })).toMatchObject({ locale: 'es' });
    expect(() => createAdminStudentSchema.parse({
      name: 'A',
      email: 'not-an-email',
      accessEndsOn: '31-12-2099',
    })).toThrow();
    expect(() => createAdminStudentSchema.parse({
      name: 'Invalid Choice',
      email: 'invalid-choice@example.com',
      accessEndsOn: '2099-12-31',
      accessDurationMonths: 2,
    })).toThrow();
    expect(() => grantManualAccessSchema.parse({ accessEndsOn: '2099/12/31' })).toThrow();
    expect(grantManualAccessSchema.parse({ accessDurationMonths: 2 })).toEqual({ accessDurationMonths: 2 });
    expect(() => grantManualAccessSchema.parse({})).toThrow();
    expect(() => grantManualAccessSchema.parse({ accessEndsOn: '2099-12-31', accessDurationMonths: 2 })).toThrow();
    expect(() => grantManualAccessSchema.parse({ accessDurationMonths: 0 })).toThrow();
    expect(() => toEndOfDay('2099-02-29')).toThrow(ApiError);
  });

  it('calculates whole calendar months and safely clamps a month-end date', () => {
    const accessEndsAt = getAccessEndsAt(
      { accessDurationMonths: 1 },
      new Date('2099-01-31T12:00:00.000Z'),
    );

    expect(accessEndsAt.toISOString()).toBe('2099-02-28T23:59:59.999Z');
  });

  it('uses manual access as a valid entitlement without conflating it with Stripe', () => {
    const now = new Date('2099-01-01T12:00:00.000Z');
    const manualUser = {
      subscriptionStatus: 'none' as const,
      manualAccessEndsAt: new Date('2099-01-02T04:00:00.000Z'),
    };
    const stripeUser = {
      subscriptionStatus: 'active' as const,
      currentPeriodEnd: new Date('2099-01-02T12:00:00.000Z'),
    };
    const expiredManualUser = {
      subscriptionStatus: 'none' as const,
      manualAccessEndsAt: new Date('2098-12-31T23:00:00.000Z'),
    };

    expect(hasActiveManualAccess(manualUser, now)).toBe(true);
    expect(hasActiveStripeSubscription(manualUser, now)).toBe(false);
    expect(hasActiveEntitlement(manualUser, now)).toBe(true);
    expect(getAccessSource(manualUser, now)).toBe('manual');
    expect(hasActiveStripeSubscription(stripeUser, now)).toBe(true);
    expect(getAccessSource(stripeUser, now)).toBe('stripe');
    expect(hasActiveEntitlement(expiredManualUser, now)).toBe(false);
  });
});

describe('account invitation contracts', () => {
  it('explains subscription setup when an invited student has no manual subscription', () => {
    expect(getAccountInvitationCopy(undefined, 'en').intro).toContain('subscribe');
    expect(getAccountInvitationCopy(new Date('2099-12-31T23:59:59.999Z'), 'en').intro).toContain('manual subscription expires');
  });

  it('creates a high-entropy stored hash and a seven-day invitation window', () => {
    const before = Date.now();
    const invitation = createInvitation();

    expect(invitation.token).toMatch(/^[a-f0-9]{64}$/);
    expect(invitation.tokenHash).toBe(hashInvitationToken(invitation.token));
    expect(invitation.tokenHash).not.toBe(invitation.token);
    expect(invitation.expiresAt.getTime()).toBeGreaterThan(before + 6 * 24 * 60 * 60 * 1000);
    expect(isInvitationUsable({ tokenHash: invitation.tokenHash, expiresAt: invitation.expiresAt })).toBe(true);
  });

  it('rejects expired, accepted, and superseded invitations', () => {
    const now = new Date('2099-01-01T12:00:00.000Z');
    expect(isInvitationUsable({ tokenHash: 'hash', expiresAt: new Date('2099-01-01T11:59:59.000Z') }, now)).toBe(false);
    expect(isInvitationUsable({ tokenHash: 'hash', expiresAt: new Date('2099-01-02T12:00:00.000Z'), acceptedAt: now }, now)).toBe(false);

    const first = createInvitation();
    const replacement = createInvitation();
    expect(first.tokenHash).not.toBe(replacement.tokenHash);
    expect(hashInvitationToken(first.token)).not.toBe(replacement.tokenHash);
  });

  it('validates acceptance tokens and localized resend requests', () => {
    expect(invitationAcceptanceSchema.parse({ token: 'a'.repeat(64), password: 'secure-password' })).toBeTruthy();
    expect(() => invitationAcceptanceSchema.parse({ token: 'bad', password: 'short' })).toThrow();
    expect(resendInvitationSchema.parse({ locale: 'en' })).toEqual({ locale: 'en' });
  });
});
