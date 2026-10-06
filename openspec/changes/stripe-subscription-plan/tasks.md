## 1. Environment & Dependencies

- [x] 1.1 Add `stripe` npm package to faa-backend
- [x] 1.2 Add Stripe environment variables to `faa-backend/.env` and `.env.example`: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`
- [x] 1.3 Update `faa-backend/src/config/env.ts` to export Stripe config values and validate required vars in production

## 2. User Model & Database

- [x] 2.1 Add Stripe fields to `faa-backend/src/models/User.ts`: `stripeCustomerId` (String, indexed), `subscriptionId` (String), `subscriptionStatus` (String, enum: none/active/past_due/canceled/unpaid, default: none), `currentPeriodEnd` (Date)
- [x] 2.2 Update the `IUser` interface in the User model to include the new Stripe fields
- [x] 2.3 Update `GET /api/auth/me` response to include subscription fields (`subscriptionStatus`, `currentPeriodEnd`)

## 3. Stripe Billing Routes (Backend)

- [x] 3.1 Create `faa-backend/src/controllers/billing.ts` with checkout, cancel, status, and webhook handlers
- [x] 3.2 Create `faa-backend/src/routes/billing.ts` with routes: `POST /checkout`, `POST /cancel`, `GET /status`, `POST /webhook`
- [x] 3.3 Mount webhook route with `express.raw()` body parser BEFORE the `express.json()` middleware in `app.ts`
- [x] 3.4 Mount remaining billing routes under `/api/billing` with `requireAuth` in `routes/index.ts`

## 4. Webhook Handler

- [x] 4.1 Implement Stripe webhook signature verification using `stripe.webhooks.constructEvent()`
- [x] 4.2 Handle `checkout.session.completed`: find user by customer email/ID, update `stripeCustomerId`, `subscriptionId`, `subscriptionStatus`, `currentPeriodEnd`
- [x] 4.3 Handle `customer.subscription.updated`: update `subscriptionStatus` and `currentPeriodEnd` by `stripeCustomerId`
- [x] 4.4 Handle `customer.subscription.deleted`: set `subscriptionStatus` to `canceled`, clear `subscriptionId`
- [x] 4.5 Handle `invoice.payment_failed`: set `subscriptionStatus` to `past_due`
- [x] 4.6 Handle `invoice.payment_succeeded`: update `currentPeriodEnd` on renewal

## 5. Subscription Gate (Backend)

- [x] 5.1 Create `requireSubscription` middleware in `faa-backend/src/middleware/subscription.ts` that checks `subscriptionStatus` and `currentPeriodEnd`, allows admin bypass
- [x] 5.2 Apply `requireSubscription` middleware to question routes in `routes/questions.ts`
- [x] 5.3 Apply `requireSubscription` middleware to exam routes in `routes/exam.ts`
- [x] 5.4 Apply `requireSubscription` middleware to progress routes in `routes/progress.ts`

## 6. Frontend Auth Context Update

- [x] 6.1 Update `IUser` type in `faa-frontend/src/lib/types.ts` to include `subscriptionStatus` and `currentPeriodEnd`
- [x] 6.2 Update `AuthContext` to expose subscription state from the user object
- [x] 6.3 Add helper function `hasActiveSubscription(user)` to check if a user has access

## 7. Frontend Subscription Guard

- [x] 7.1 Update the `<Protected>` component to check subscription status and redirect to checkout/subscribe prompt when subscription is required
- [x] 7.2 Add billing API functions to `faa-frontend/src/lib/api.ts`: `createCheckoutSession()`, `cancelSubscription()`, `getSubscriptionStatus()`

## 8. Profile Page

- [x] 8.1 Create `/profile` page at `faa-frontend/src/app/profile/page.tsx` displaying user info (name, email, joined date)
- [x] 8.2 Add subscription status section to profile page with conditional rendering based on status (active, canceling, none, canceled, past_due)
- [x] 8.3 Implement "Subscribe" button that calls `createCheckoutSession()` and redirects to Stripe Checkout URL
- [x] 8.4 Implement "Cancel Subscription" button with confirmation dialog that calls `cancelSubscription()`
- [x] 8.5 Add profile link to the Navbar component

## 9. Checkout Flow & Redirects

- [x] 9.1 Create success page/handler at a frontend route that handles the return from Stripe Checkout (e.g., refresh user data and redirect to home)
- [x] 9.2 Create cancel/return page that handles when a user cancels out of Stripe Checkout

## 10. Documentation

- [x] 10.1 Update project documentation with Stripe setup instructions (env vars, Stripe Dashboard configuration, webhook URL setup, Price ID creation)
