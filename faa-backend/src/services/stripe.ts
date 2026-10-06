import Stripe from 'stripe';
import { env } from '../config/env';

export const stripe = new Stripe(env.stripe.secretKey);

export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date {
  const itemEnd = subscription.items?.data?.[0]?.current_period_end;
  return itemEnd ? new Date(itemEnd * 1000) : new Date();
}
