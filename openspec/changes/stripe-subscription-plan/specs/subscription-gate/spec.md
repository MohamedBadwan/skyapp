## ADDED Requirements

### Requirement: Backend subscription middleware
The system SHALL provide a `requireSubscription` middleware that runs after `requireAuth` and verifies the user has an active subscription before allowing access to protected resources. The middleware SHALL query the User record from the database to get current subscription state.

#### Scenario: User with active subscription accesses protected route
- **WHEN** an authenticated user with `subscriptionStatus` of `active` and `currentPeriodEnd` in the future accesses a subscription-gated route
- **THEN** the middleware SHALL allow the request to proceed

#### Scenario: User with canceled-but-valid subscription accesses protected route
- **WHEN** an authenticated user with `subscriptionStatus` of `active`, `cancel_at_period_end` true, and `currentPeriodEnd` in the future accesses a subscription-gated route
- **THEN** the middleware SHALL allow the request to proceed (access continues until period end)

#### Scenario: User without subscription accesses protected route
- **WHEN** an authenticated user with `subscriptionStatus` of `none` accesses a subscription-gated route
- **THEN** the middleware SHALL return a 403 error with a message indicating a subscription is required
- **AND** the response SHALL include a `code` field of `SUBSCRIPTION_REQUIRED`

#### Scenario: User with expired subscription accesses protected route
- **WHEN** an authenticated user with `subscriptionStatus` of `canceled` or `currentPeriodEnd` in the past accesses a subscription-gated route
- **THEN** the middleware SHALL return a 403 error with a message indicating the subscription has expired
- **AND** the response SHALL include a `code` field of `SUBSCRIPTION_REQUIRED`

#### Scenario: User with past_due subscription accesses protected route
- **WHEN** an authenticated user with `subscriptionStatus` of `past_due` accesses a subscription-gated route
- **THEN** the middleware SHALL return a 403 error with a message indicating a payment issue

### Requirement: Subscription gating on existing routes
The `requireSubscription` middleware SHALL be applied to all question, exam, and progress routes. Auth routes and billing routes SHALL NOT require a subscription.

#### Scenario: Question routes require subscription
- **WHEN** an authenticated user without an active subscription calls any `/api/questions/*` endpoint
- **THEN** the system SHALL return a 403 error with `code: SUBSCRIPTION_REQUIRED`

#### Scenario: Exam routes require subscription
- **WHEN** an authenticated user without an active subscription calls any `/api/exam/*` endpoint
- **THEN** the system SHALL return a 403 error with `code: SUBSCRIPTION_REQUIRED`

#### Scenario: Auth routes do not require subscription
- **WHEN** an authenticated user without a subscription calls `/api/auth/me`
- **THEN** the request SHALL succeed (auth routes are not subscription-gated)

#### Scenario: Billing routes do not require subscription
- **WHEN** an authenticated user without a subscription calls `/api/billing/checkout`
- **THEN** the request SHALL succeed (billing routes are not subscription-gated)

### Requirement: Frontend subscription guard
The frontend SHALL check the user's subscription status and redirect users without an active subscription to a checkout/subscribe page instead of showing gated content.

#### Scenario: User without subscription navigates to study page
- **WHEN** an authenticated user without an active subscription navigates to `/study`, `/exam`, or `/oral`
- **THEN** the frontend SHALL redirect them to a page or modal that prompts them to subscribe

#### Scenario: User with active subscription navigates to study page
- **WHEN** an authenticated user with an active subscription navigates to `/study`
- **THEN** the frontend SHALL render the study page normally

#### Scenario: AuthContext includes subscription state
- **WHEN** the `AuthProvider` loads user data from `/api/auth/me`
- **THEN** the context SHALL include `subscriptionStatus` and `currentPeriodEnd` in the user object
- **AND** components SHALL be able to check subscription status via context

### Requirement: Admin bypass for subscription gate
Admin users SHALL bypass the subscription gate and access all features without a subscription.

#### Scenario: Admin user accesses protected route without subscription
- **WHEN** an authenticated user with `role: 'admin'` and `subscriptionStatus` of `none` accesses a subscription-gated route
- **THEN** the middleware SHALL allow the request to proceed
