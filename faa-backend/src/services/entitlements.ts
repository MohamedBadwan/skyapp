import { IUser } from '../models/User';

type EntitlementUser = Pick<IUser, 'subscriptionStatus' | 'currentPeriodEnd' | 'manualAccessEndsAt'>;

export function hasActiveStripeSubscription(user: EntitlementUser, now = new Date()): boolean {
  return Boolean(
    user.subscriptionStatus === 'active'
      && user.currentPeriodEnd
      && user.currentPeriodEnd > now,
  );
}

export function hasActiveManualAccess(user: EntitlementUser, now = new Date()): boolean {
  return Boolean(user.manualAccessEndsAt && user.manualAccessEndsAt > now);
}

export function hasActiveEntitlement(user: EntitlementUser, now = new Date()): boolean {
  return hasActiveStripeSubscription(user, now) || hasActiveManualAccess(user, now);
}

export type AccessSource = 'stripe' | 'manual' | 'none';

export function getAccessSource(user: EntitlementUser, now = new Date()): AccessSource {
  if (hasActiveStripeSubscription(user, now)) return 'stripe';
  if (hasActiveManualAccess(user, now)) return 'manual';
  return 'none';
}
