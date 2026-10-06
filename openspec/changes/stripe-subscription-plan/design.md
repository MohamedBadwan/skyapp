## Context

SkyMentor is an FAA A&P exam trainer with a Next.js 16 frontend and Express + MongoDB backend. Authentication uses JWT tokens with a `requireAuth` middleware. Currently any registered user gets full access to all features (study, exam, oral practice). There is no payment system, no profile page, and no subscription gating.

The platform needs a sustainable revenue model. A monthly subscription using Stripe will gate access to core features while keeping registration free. The subscription price must be configurable via environment variables to allow easy price adjustments without redeployment.

## Goals / Non-Goals

**Goals:**

- Integrate Stripe Checkout for subscription purchases (no custom payment forms)
- Store subscription state on the User model for fast access checks
- Keep subscription status in sync via Stripe webhooks
- Allow users to cancel their subscription from a profile page within the app
- Gate all core features (study, exam, oral) behind an active subscription
- Make the subscription price (Stripe Price ID) configurable via `.env`
- Provide a smooth UX: register → checkout → app access, with clear status messaging

**Non-Goals:**

- Multiple subscription tiers or plan levels (single plan only for now)
- Free trial period (may be added later)
- Stripe Customer Portal for full self-service billing (we handle cancellation in-app)
- Proration or plan upgrades/downgrades
- Invoice management or tax handling
- Admin dashboard for subscription management
- Refund processing through the app
- Mobile app payments or managed payments

## Decisions

### 1. Use Stripe Checkout Sessions (not custom payment forms)

**Chosen:** Stripe-hosted Checkout page via `stripe.checkout.sessions.create()` in `mode: 'subscription'`.

**Why:** Eliminates PCI compliance burden, provides built-in payment method handling, SCA support, and localized payment forms. No need for `@stripe/react-stripe-js` on the frontend — just a redirect.

**Alternative considered:** Embedded Payment Element with `PaymentIntent` — rejected because it requires frontend Stripe SDK integration, custom form handling, and adds complexity without benefit for a single-plan subscription.

### 2. Store subscription state on the User model (not a separate collection)

**Chosen:** Add `stripeCustomerId`, `subscriptionId`, `subscriptionStatus`, and `currentPeriodEnd` fields directly to the `User` Mongoose schema.

**Why:** One-to-one relationship between User and Subscription. No joins needed. The `requireSubscription` middleware can check subscription status from the already-loaded user without additional DB queries.

**Alternative considered:** Separate `Subscription` collection — rejected because it adds query overhead and complexity for a 1:1 relationship.

### 3. Webhook-driven subscription sync (not polling)

**Chosen:** A dedicated `/api/billing/webhook` endpoint receives Stripe webhook events and updates User subscription fields accordingly.

**Events handled:**
- `checkout.session.completed` — link subscription to user after successful checkout
- `customer.subscription.updated` — track status changes (active → past_due, etc.)
- `customer.subscription.deleted` — mark subscription as canceled/expired
- `invoice.payment_succeeded` — update `currentPeriodEnd` on successful renewal
- `invoice.payment_failed` — update status to reflect payment issues

**Why:** Webhooks are Stripe's recommended pattern for keeping subscription state in sync. Polling is wasteful and introduces delays.

**Important:** The webhook endpoint requires raw request body (not JSON-parsed) for signature verification. This must be configured before the `express.json()` middleware.

### 4. In-app cancellation via Stripe API (not Customer Portal)

**Chosen:** A backend endpoint `/api/billing/cancel` calls `stripe.subscriptions.update(subId, { cancel_at_period_end: true })` to cancel at period end rather than immediately.

**Why:** Canceling at period end lets users keep access until their current billing cycle ends, which is fairer and reduces support requests. The profile page shows the cancellation date.

**Alternative considered:** Stripe Customer Portal — rejected to keep the UX within the app and avoid redirecting users to an external page for a simple action.

### 5. Backend middleware for subscription gating

**Chosen:** A `requireSubscription` middleware that runs after `requireAuth`. It checks the user's `subscriptionStatus` field and `currentPeriodEnd` to determine access.

**Statuses that grant access:** `active`, `trialing`, or `cancel_at_period_end` with `currentPeriodEnd` in the future.

**Why:** Server-side enforcement prevents bypassing the gate. The frontend guard provides UX (redirect to checkout) but is not the security boundary.

### 6. Price configuration via environment variable

**Chosen:** Store the Stripe Price ID in `STRIPE_PRICE_ID` env var. The price and billing interval are configured in the Stripe Dashboard when creating the Price object.

**Why:** The Price ID is a reference to a Stripe-managed object that already defines amount, currency, and interval. Storing the amount in `.env` would require creating prices dynamically, adding complexity. The Price ID approach is Stripe's recommended pattern.

**Environment variables added:**
- `STRIPE_SECRET_KEY` — Stripe API secret key
- `STRIPE_PUBLISHABLE_KEY` — Stripe publishable key (returned to frontend for redirect)
- `STRIPE_WEBHOOK_SECRET` — Webhook endpoint signing secret
- `STRIPE_PRICE_ID` — Monthly subscription Price ID
- `STRIPE_SUCCESS_URL` — Redirect URL after successful checkout
- `STRIPE_CANCEL_URL` — Redirect URL if user cancels checkout

## Risks / Trade-offs

- **[Webhook delivery failures]** → Stripe retries webhooks for up to 3 days. Additionally, the checkout completion endpoint can do an initial sync. For critical edge cases, a periodic reconciliation job could be added later.

- **[Raw body parsing for webhooks]** → The webhook endpoint needs the raw body buffer, but the app uses `express.json()` globally. → Mount the webhook route before `express.json()` or use `express.raw()` specifically on that route.

- **[Existing users lose access]** → When subscription gating is enabled, existing registered users won't have subscriptions. → The subscription gate redirects them to checkout rather than showing an error. The transition is seamless.

- **[Single point of failure on Stripe]** → If Stripe is down, new checkouts fail. → Existing subscription status is cached in MongoDB, so authenticated users with active subscriptions continue to work even if Stripe is temporarily unreachable.

- **[Client-side only route protection on frontend]** → The frontend `<Protected>` component only checks auth, not subscription. → Add subscription status to `AuthContext` and check it in the protected wrapper. Backend middleware is the true security boundary.

- **[Cancellation UX]** → Users might accidentally cancel. → Show a confirmation dialog before canceling. Show clear messaging that access continues until period end.
