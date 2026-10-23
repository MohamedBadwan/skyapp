import { describe, expect, it } from 'vitest';
import { buildSubscriptionCheckoutParams, tracksSubscription } from '../src/controllers/billing.controller';

describe('subscription checkout', () => {
  it('tags the session and the resulting subscription with the app user id', () => {
    const params = buildSubscriptionCheckoutParams({ price: 'price_monthly', quantity: 1 }, 'user_123');
    expect(params).toMatchObject({
      client_reference_id: 'user_123',
      metadata: { userId: 'user_123' },
      subscription_data: { metadata: { userId: 'user_123' } },
    });
  });
});

describe('webhook subscription tracking', () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  it('applies events for the linked subscription or when none is linked', () => {
    expect(tracksSubscription({ subscriptionId: 'sub_a', subscriptionStatus: 'active', currentPeriodEnd: future }, 'sub_a')).toBe(true);
    expect(tracksSubscription({ subscriptionStatus: 'none' }, 'sub_a')).toBe(true);
  });

  it('ignores a duplicate subscription while the linked one still grants access', () => {
    expect(tracksSubscription({ subscriptionId: 'sub_a', subscriptionStatus: 'active', currentPeriodEnd: future }, 'sub_b')).toBe(false);
  });

  it('switches to another paid subscription once the linked one no longer grants access', () => {
    expect(tracksSubscription({ subscriptionId: 'sub_a', subscriptionStatus: 'active', currentPeriodEnd: past }, 'sub_b')).toBe(true);
    expect(tracksSubscription({ subscriptionId: 'sub_a', subscriptionStatus: 'canceled', currentPeriodEnd: future }, 'sub_b')).toBe(true);
  });
});
