## ADDED Requirements

### Requirement: Stripe Checkout Session creation
The system SHALL create a Stripe Checkout Session in `subscription` mode when a user initiates a subscription purchase. The session SHALL use the Price ID configured in the `STRIPE_PRICE_ID` environment variable. If the user already has a `stripeCustomerId`, the session SHALL be linked to their existing Stripe customer. If not, Stripe SHALL create a new customer and the system SHALL store the resulting `stripeCustomerId` on the User record. The session SHALL redirect to `STRIPE_SUCCESS_URL` on success and `STRIPE_CANCEL_URL` on cancellation.

#### Scenario: User without existing Stripe customer starts checkout
- **WHEN** an authenticated user without a `stripeCustomerId` requests a checkout session via `POST /api/billing/checkout`
- **THEN** the system SHALL create a Stripe Checkout Session with `mode: 'subscription'`, the user's email as `customer_email`, and the configured `STRIPE_PRICE_ID` as the line item
- **AND** the response SHALL include the Checkout Session URL for redirect

#### Scenario: User with existing Stripe customer starts checkout
- **WHEN** an authenticated user with an existing `stripeCustomerId` requests a checkout session via `POST /api/billing/checkout`
- **THEN** the system SHALL create a Stripe Checkout Session with the `customer` field set to their `stripeCustomerId`
- **AND** the response SHALL include the Checkout Session URL for redirect

#### Scenario: User with active subscription attempts checkout
- **WHEN** an authenticated user with `subscriptionStatus` of `active` requests a checkout session
- **THEN** the system SHALL return a 400 error indicating the user already has an active subscription

### Requirement: Webhook event processing
The system SHALL expose a `POST /api/billing/webhook` endpoint that receives Stripe webhook events, verifies the signature using `STRIPE_WEBHOOK_SECRET`, and updates user subscription state accordingly. The endpoint SHALL accept raw request bodies (not JSON-parsed) for signature verification.

#### Scenario: checkout.session.completed event received
- **WHEN** Stripe sends a `checkout.session.completed` event with a valid signature
- **THEN** the system SHALL find the user by customer ID or email, update their `stripeCustomerId`, `subscriptionId`, and set `subscriptionStatus` to `active`
- **AND** the system SHALL store the subscription's `current_period_end` as `currentPeriodEnd`

#### Scenario: customer.subscription.updated event received
- **WHEN** Stripe sends a `customer.subscription.updated` event with a valid signature
- **THEN** the system SHALL update the user's `subscriptionStatus` to match the subscription's `status` field
- **AND** the system SHALL update `currentPeriodEnd` to the subscription's `current_period_end`

#### Scenario: customer.subscription.deleted event received
- **WHEN** Stripe sends a `customer.subscription.deleted` event with a valid signature
- **THEN** the system SHALL set the user's `subscriptionStatus` to `canceled` and clear the `subscriptionId`

#### Scenario: invoice.payment_failed event received
- **WHEN** Stripe sends an `invoice.payment_failed` event with a valid signature
- **THEN** the system SHALL update the user's `subscriptionStatus` to `past_due`

#### Scenario: Invalid webhook signature
- **WHEN** a request to `/api/billing/webhook` has an invalid or missing Stripe signature
- **THEN** the system SHALL return a 400 error and NOT process the event

### Requirement: Subscription cancellation
The system SHALL allow authenticated users to cancel their active subscription via `POST /api/billing/cancel`. Cancellation SHALL be set to take effect at the end of the current billing period (cancel at period end), not immediately.

#### Scenario: User cancels active subscription
- **WHEN** an authenticated user with an active subscription calls `POST /api/billing/cancel`
- **THEN** the system SHALL call `stripe.subscriptions.update()` with `cancel_at_period_end: true`
- **AND** the user's `subscriptionStatus` SHALL remain `active` until the period ends
- **AND** the response SHALL include the date when the subscription will end

#### Scenario: User without active subscription attempts cancellation
- **WHEN** an authenticated user without an active subscription calls `POST /api/billing/cancel`
- **THEN** the system SHALL return a 400 error indicating no active subscription exists

### Requirement: Subscription status endpoint
The system SHALL expose a `GET /api/billing/status` endpoint that returns the authenticated user's current subscription state.

#### Scenario: User checks subscription status
- **WHEN** an authenticated user calls `GET /api/billing/status`
- **THEN** the system SHALL return the user's `subscriptionStatus`, `currentPeriodEnd`, and whether the subscription is set to cancel at period end

### Requirement: Environment-based Stripe configuration
The system SHALL read all Stripe configuration from environment variables. The server SHALL NOT start if required Stripe environment variables are missing in production.

#### Scenario: All Stripe environment variables are set
- **WHEN** the application starts with `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `STRIPE_SUCCESS_URL`, and `STRIPE_CANCEL_URL` all defined
- **THEN** the Stripe client SHALL initialize successfully and billing routes SHALL be available

#### Scenario: Required Stripe environment variables missing in production
- **WHEN** the application starts in production mode without required Stripe environment variables
- **THEN** the application SHALL log an error indicating which variables are missing

### Requirement: User model Stripe fields
The User model SHALL include fields for Stripe integration: `stripeCustomerId` (String, optional, indexed), `subscriptionId` (String, optional), `subscriptionStatus` (String, enum: `none`, `active`, `past_due`, `canceled`, `unpaid`, default: `none`), and `currentPeriodEnd` (Date, optional).

#### Scenario: New user registration
- **WHEN** a new user registers
- **THEN** their `subscriptionStatus` SHALL default to `none` and `stripeCustomerId`, `subscriptionId`, and `currentPeriodEnd` SHALL be unset
