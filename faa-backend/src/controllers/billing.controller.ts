import { Request, Response } from 'express';
import Stripe from 'stripe';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';
import { getSubscriptionPeriodEnd, stripe } from '../services/stripe';
import { recordSubscriptionEvent } from '../services/subscriptionHistory';
import { hasActiveManualAccess, hasActiveStripeSubscription } from '../services/entitlements';

export function buildSubscriptionCheckoutParams(
  lineItem: Stripe.Checkout.SessionCreateParams.LineItem,
): Stripe.Checkout.SessionCreateParams {
  return {
    mode: 'subscription',
    line_items: [lineItem],
    allow_promotion_codes: true,
    success_url: env.stripe.successUrl,
    cancel_url: env.stripe.cancelUrl,
  };
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

  const sessionParams = buildSubscriptionCheckoutParams(lineItem);

  if (user.stripeCustomerId) {
    sessionParams.customer = user.stripeCustomerId;
  } else {
    sessionParams.customer_email = user.email;
    sessionParams.metadata = { userId: user._id.toString() };
  }

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
    console.error(`⚠️  Error processing webhook ${event.type}:`, err);
  }

  res.json({ received: true });
};

// ────────────────────────────────────────────────────────────────────────────
// Webhook event handlers
// ────────────────────────────────────────────────────────────────────────────

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  let user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) {
    const email = session.customer_details?.email ?? session.customer_email;
    if (email) user = await User.findOne({ email });
  }
  if (!user && session.metadata?.userId) {
    user = await User.findById(session.metadata.userId);
  }
  if (!user) {
    console.error('⚠️  checkout.session.completed: user not found', { customerId, session: session.id });
    return;
  }

  user.stripeCustomerId = customerId;
  user.subscriptionId = subscriptionId;
  user.subscriptionStatus = 'active';
  user.currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
  user.cancelAtPeriodEnd = false;
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
  const user = await User.findOne({ stripeCustomerId: subscription.customer as string });
  if (!user) return;

  const stripeStatus = subscription.status;
  const mapped = (['active', 'past_due', 'canceled', 'unpaid'] as const).includes(
    stripeStatus as 'active' | 'past_due' | 'canceled' | 'unpaid',
  )
    ? (stripeStatus as 'active' | 'past_due' | 'canceled' | 'unpaid')
    : 'none';

  const previousStatus = user.subscriptionStatus;
  const wasScheduledToCancel = user.cancelAtPeriodEnd ?? false;
  user.subscriptionStatus = mapped;
  user.currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
  user.cancelAtPeriodEnd = subscription.cancel_at_period_end;
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
  const user = await User.findOne({ stripeCustomerId: subscription.customer as string });
  if (!user) return;

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
  const customerId = invoice.customer as string;
  if (!customerId) return;
  const user = await User.findOneAndUpdate(
    { stripeCustomerId: customerId },
    { subscriptionStatus: 'past_due' },
    { new: true },
  );
  if (!user) return;
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
  const customerId = invoice.customer as string;
  const subDetails = invoice.parent?.subscription_details;
  const subscriptionId =
    typeof subDetails?.subscription === 'string'
      ? subDetails.subscription
      : subDetails?.subscription?.id;
  if (!customerId || !subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const user = await User.findOneAndUpdate(
    { stripeCustomerId: customerId },
    { currentPeriodEnd: getSubscriptionPeriodEnd(subscription) },
    { new: true },
  );
  if (!user) return;
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
