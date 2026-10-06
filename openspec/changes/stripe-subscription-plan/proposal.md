## Why

SkyMentor currently allows any registered user to access all study, exam, and oral practice features for free after creating an account. To monetize the platform and sustain development, a monthly subscription plan is needed. Users must subscribe to access the app's core features, and should be able to manage (view and cancel) their subscription from within the app via a profile page.

## What Changes

- Add **Stripe integration** to the backend for managing monthly subscriptions (checkout sessions, webhook handling, subscription status tracking).
- Extend the **User model** with Stripe-related fields (`stripeCustomerId`, `subscriptionId`, `subscriptionStatus`, `currentPeriodEnd`).
- Add a **subscription gate** (backend middleware + frontend guard) so only users with an active subscription can access study, exam, and oral features.
- Create a **/profile** page where users can view their subscription status and cancel their subscription.
- Add a **checkout flow** that redirects users to Stripe Checkout when they need to subscribe.
- Make the subscription **price configurable** via environment variables (`.env`), so it can be changed without code modifications.
- Add **Stripe webhook** endpoint to keep subscription status synchronized with Stripe events (payment success, cancellation, renewal).

## Capabilities

### New Capabilities

- `stripe-billing`: Stripe integration layer — checkout session creation, webhook handling, subscription lifecycle management, and environment-based price configuration.
- `subscription-gate`: Middleware and frontend guard that restricts access to app features for users without an active subscription.
- `user-profile`: Profile page where users can view account details, subscription status, and cancel their subscription.

### Modified Capabilities

## Impact

- **Backend**: New `stripe` dependency, new `/api/billing/*` routes, new `requireSubscription` middleware, extended User model schema, new webhook endpoint (raw body parsing required).
- **Frontend**: New `/profile` page, updated `AuthContext` to include subscription state, conditional navigation (checkout redirect vs app access), new Navbar link to profile.
- **Database**: User documents gain Stripe-related fields — no migration needed (MongoDB schema-less), but existing users will need to subscribe before accessing features.
- **Environment**: New `.env` variables for Stripe secret key, publishable key, webhook secret, price ID (or amount), and success/cancel URLs.
- **Dependencies**: `stripe` npm package (backend), potentially `@stripe/stripe-js` (frontend for redirect-to-checkout).
- **Deployment**: Stripe webhook URL must be configured in Stripe Dashboard pointing to the production backend.
