import { Request, Response } from 'express';
import Stripe from 'stripe';
import { Types } from 'mongoose';
import { IUser, SubscriptionStatus, User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';
import { getSubscriptionPeriodEnd, stripe } from '../services/stripe';
import { recordSubscriptionEvent } from '../services/subscriptionHistory';
import { hasActiveManualAccess, hasActiveStripeSubscription } from '../services/entitlements';

export function buildSubscriptionCheckoutParams(
  lineItem: Stripe.Checkout.SessionCreateParams.LineItem,
  userId?: string,
): Stripe.Checkout.SessionCreateParams {
  return {
    mode: 'subscription',
    line_items: [lineItem],
    allow_promotion_codes: true,
    success_url: env.stripe.successUrl,
    cancel_url: env.stripe.cancelUrl,
    ...(userId && {
      client_reference_id: userId,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    }),
  };
}

const LIVE_STRIPE_STATUSES: Stripe.Subscription.Status[] = ['active', 'trialing', 'past_due', 'unpaid'];

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === 'trialing') return 'active';
  return (['active', 'past_due', 'canceled', 'unpaid'] as const).includes(
    status as 'active' | 'past_due' | 'canceled' | 'unpaid',
  )
    ? (status as SubscriptionStatus)
    : 'none';
}

function stripeId(value: string | { id: string } | null | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === 'string' ? value : value.id;
}

/**
 * Returns the user's Stripe customer, reusing one that already exists for the
 * email so a second checkout never creates a duplicate customer.
 */
async function ensureStripeCustomer(user: IUser): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const existing = await stripe.customers.list({ email: user.email, limit: 10 });
  let customerId: string | undefined;
  for (const customer of existing.data) {
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 10 });
    if (subs.data.some((s) => LIVE_STRIPE_STATUSES.includes(s.status))) {
      customerId = customer.id;
      break;
    }
  }
  customerId ??= existing.data[0]?.id;
  customerId ??= (
    await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user._id.toString() },
    })
  ).id;

  user.stripeCustomerId = customerId;
  await user.save();
  return customerId;
}

async function findLiveSubscription(customerId: string): Promise<Stripe.Subscription | undefined> {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
  return subs.data.find((s) => LIVE_STRIPE_STATUSES.includes(s.status));
}

function applySubscription(user: IUser, subscription: Stripe.Subscription) {
  user.stripeCustomerId = stripeId(subscription.customer);
  user.subscriptionId = subscription.id;
  user.subscriptionStatus = mapStripeStatus(subscription.status);
  user.currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
  user.cancelAtPeriodEnd = subscription.cancel_at_period_end;
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/billing/checkout
// ────────────────────────────────────────────────────────────────────────────

export const createCheckout = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.sub);
  if (!user) throw ApiError.notFound('Usuario no encontrado.');

  // If the user has an active sub that's set to cancel, just undo the cancellation
  if (hasActiveStripeSubscription(user) && user.cancelAtPeriodEnd && user.subscriptionId) {
    const subscription = await stripe.subscriptions.update(user.subscriptionId, {
      cancel_at_period_end: false,
    });
    user.cancelAtPeriodEnd = false;
    user.currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
    await user.save();
    await recordSubscriptionEvent({
      user: user._id,
      subscriptionId: user.subscriptionId,
      event: 'subscription_reactivated',
      status: user.subscriptionStatus,
      periodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: false,
    });
    res.json({ ok: true, reactivated: true });
    return;
  }

  if (hasActiveManualAccess(user)) {
    throw ApiError.badRequest('Tienes acceso otorgado por un administrador hasta su fecha de vencimiento.');
  }

  if (hasActiveStripeSubscription(user)) {
    throw ApiError.badRequest('Ya tienes una suscripción activa.');
  }

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = env.stripe.priceId
    ? { price: env.stripe.priceId, quantity: 1 }
    : {
        price_data: {
          currency: env.stripe.subscriptionCurrency,
          product_data: { name: env.stripe.productName },
          unit_amount: env.stripe.subscriptionAmount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      };

  const customerId = await ensureStripeCustomer(user);

  // The database can lag behind Stripe if a webhook was lost; trust Stripe so
  // the user is never charged for a second subscription.
  const liveSubscription = await findLiveSubscription(customerId);
  if (liveSubscription) {
    applySubscription(user, liveSubscription);
    await user.save();
    throw ApiError.badRequest('Ya tienes una suscripción activa.');
  }

  const sessionParams = buildSubscriptionCheckoutParams(lineItem, user._id.toString());
  sessionParams.customer = customerId;

  const session = await stripe.checkout.sessions.create(sessionParams);
  res.json({ ok: true, url: session.url });
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/billing/cancel
// ────────────────────────────────────────────────────────────────────────────

export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.sub);
  if (!user) throw ApiError.notFound('Usuario no encontrado.');

  if (!hasActiveStripeSubscription(user) || !user.subscriptionId) {
    throw ApiError.badRequest('No tienes una suscripción activa para cancelar.');
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
    message: 'Suscripción cancelada. Tu acceso continuará hasta el final del período.',
    cancelAt: user.currentPeriodEnd,
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/billing/status
// ────────────────────────────────────────────────────────────────────────────

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.sub);
  if (!user) throw ApiError.notFound('Usuario no encontrado.');

  res.json({
    ok: true,
    subscriptionStatus: user.subscriptionStatus,
    currentPeriodEnd: user.currentPeriodEnd,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd ?? false,
    manualAccessEndsAt: user.manualAccessEndsAt,
  });
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/billing/webhook  (raw body — mounted before express.json())
// ────────────────────────────────────────────────────────────────────────────

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string | undefined;
  if (!sig) {
    res.status(400).json({ error: 'Falta la firma del webhook.' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.stripe.webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Firma inválida';
    console.error('⚠️  Webhook signature verification failed:', message);
    res.status(400).json({ error: `Firma inválida: ${message}` });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await onSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await onPaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_succeeded':
        await onPaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    console.error(`⚠️  Error processing webhook ${event.type} (${event.id}):`, err);
    // A non-2xx response makes Stripe retry the delivery.
    res.status(500).json({ error: 'Error procesando el webhook.' });
    return;
  }

  res.json({ received: true });
};

// ────────────────────────────────────────────────────────────────────────────
// Webhook event handlers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the app user for a Stripe object. Falls back to the userId metadata
 * and the customer's email so a customer that was never linked (e.g. a lost
 * webhook) still reaches the right account.
 */
async function findUserForStripe(
  customerId: string | undefined,
  userId?: string | null,
  email?: string | null,
): Promise<IUser | null> {
  if (customerId) {
    const user = await User.findOne({ stripeCustomerId: customerId });
    if (user) return user;
  }
  if (userId && Types.ObjectId.isValid(userId)) {
    const user = await User.findById(userId);
    if (user) return user;
  }
  if (!email && customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) email = customer.email;
  }
  return email ? User.findOne({ email: email.toLowerCase() }) : null;
}

/**
 * False when the event belongs to a different subscription than the one that
 * currently grants the user access (a duplicate), so it must not overwrite it.
 */
export function tracksSubscription(
  user: Pick<IUser, 'subscriptionId' | 'subscriptionStatus' | 'currentPeriodEnd' | 'manualAccessEndsAt'>,
  subscriptionId: string,
): boolean {
  return !user.subscriptionId
    || user.subscriptionId === subscriptionId
    || !hasActiveStripeSubscription(user);
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  return stripeId(invoice.parent?.subscription_details?.subscription);
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = stripeId(session.customer);
  const subscriptionId = stripeId(session.subscription);
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const user = await findUserForStripe(
    customerId,
    session.client_reference_id ?? session.metadata?.userId,
    session.customer_details?.email ?? session.customer_email,
  );
  if (!user) {
    console.error('⚠️  checkout.session.completed: user not found', { customerId, session: session.id });
    return;
  }

  applySubscription(user, subscription);
  await user.save();
  await recordSubscriptionEvent({
    user: user._id,
    subscriptionId,
    event: 'subscription_started',
    status: user.subscriptionStatus,
    periodEnd: user.currentPeriodEnd,
  });
}

async function onSubscriptionUpdated(subscription: Stripe.Subscription) {
  const user = await findUserForStripe(stripeId(subscription.customer), subscription.metadata?.userId);
  if (!user) return;
  if (!tracksSubscription(user, subscription.id)) {
    console.warn('⚠️  customer.subscription.updated: ignoring duplicate subscription', subscription.id);
    return;
  }

  const previousStatus = user.subscriptionStatus;
  const wasScheduledToCancel = user.cancelAtPeriodEnd ?? false;
  applySubscription(user, subscription);
  await user.save();

  if (!wasScheduledToCancel && user.cancelAtPeriodEnd) {
    await recordSubscriptionEvent({
      user: user._id,
      subscriptionId: subscription.id,
      event: 'cancellation_scheduled',
      status: user.subscriptionStatus,
      periodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: true,
    });
  } else if (wasScheduledToCancel && !user.cancelAtPeriodEnd) {
    await recordSubscriptionEvent({
      user: user._id,
      subscriptionId: subscription.id,
      event: 'subscription_reactivated',
      status: user.subscriptionStatus,
      periodEnd: user.currentPeriodEnd,
    });
  } else if (previousStatus !== user.subscriptionStatus) {
    await recordSubscriptionEvent({
      user: user._id,
      subscriptionId: subscription.id,
      event: 'subscription_status_updated',
      status: user.subscriptionStatus,
      periodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
    });
  }
}

async function onSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await findUserForStripe(stripeId(subscription.customer), subscription.metadata?.userId);
  if (!user) return;
  if (user.subscriptionId && user.subscriptionId !== subscription.id) {
    console.warn('⚠️  customer.subscription.deleted: ignoring duplicate subscription', subscription.id);
    return;
  }

  user.subscriptionStatus = 'canceled';
  user.subscriptionId = undefined;
  user.cancelAtPeriodEnd = false;
  await user.save();
  await recordSubscriptionEvent({
    user: user._id,
    subscriptionId: subscription.id,
    event: 'subscription_canceled',
    status: user.subscriptionStatus,
    periodEnd: user.currentPeriodEnd,
  });
}

async function onPaymentFailed(invoice: Stripe.Invoice) {
  const customerId = stripeId(invoice.customer);
  if (!customerId) return;
  const subscriptionId = invoiceSubscriptionId(invoice);
  const user = await findUserForStripe(customerId, invoice.parent?.subscription_details?.metadata?.userId);
  if (!user) return;
  if (subscriptionId && !tracksSubscription(user, subscriptionId)) {
    console.warn('⚠️  invoice.payment_failed: ignoring duplicate subscription', subscriptionId);
    return;
  }

  user.subscriptionStatus = 'past_due';
  await user.save();
  await recordSubscriptionEvent({
    user: user._id,
    subscriptionId: user.subscriptionId,
    event: 'payment_failed',
    status: user.subscriptionStatus,
    periodEnd: user.currentPeriodEnd,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
  });
}

async function onPaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = stripeId(invoice.customer);
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!customerId || !subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const user = await findUserForStripe(customerId, subscription.metadata?.userId);
  if (!user) {
    console.error('⚠️  invoice.payment_succeeded: user not found', { customerId, invoice: invoice.id });
    return;
  }
  if (!tracksSubscription(user, subscriptionId)) {
    console.warn('⚠️  invoice.payment_succeeded: ignoring duplicate subscription', subscriptionId);
    return;
  }

  applySubscription(user, subscription);
  await user.save();
  const paidAt = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000)
    : new Date();
  await recordSubscriptionEvent({
    user: user._id,
    subscriptionId,
    event: 'payment_succeeded',
    status: user.subscriptionStatus,
    paidAt,
    periodEnd: user.currentPeriodEnd,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
  });
}
