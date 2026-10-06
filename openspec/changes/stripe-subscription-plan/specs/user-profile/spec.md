## ADDED Requirements

### Requirement: Profile page displays user information
The system SHALL provide a `/profile` page accessible to all authenticated users (regardless of subscription status) that displays the user's name, email, and account creation date.

#### Scenario: User views profile page
- **WHEN** an authenticated user navigates to `/profile`
- **THEN** the page SHALL display the user's name, email address, and the date they registered

#### Scenario: Unauthenticated user tries to access profile
- **WHEN** an unauthenticated user navigates to `/profile`
- **THEN** the system SHALL redirect them to `/login`

### Requirement: Profile page displays subscription status
The profile page SHALL show the user's current subscription status with relevant details based on their state.

#### Scenario: User with active subscription views profile
- **WHEN** a user with `subscriptionStatus: 'active'` views their profile
- **THEN** the page SHALL display "Active" status, the next billing date (`currentPeriodEnd`), and a "Cancel Subscription" button

#### Scenario: User with subscription set to cancel views profile
- **WHEN** a user whose subscription is set to cancel at period end views their profile
- **THEN** the page SHALL display that the subscription is active until a specific date and will not renew
- **AND** the "Cancel Subscription" button SHALL NOT be shown (already canceling)

#### Scenario: User with no subscription views profile
- **WHEN** a user with `subscriptionStatus: 'none'` views their profile
- **THEN** the page SHALL display a "Subscribe" button that initiates the checkout flow

#### Scenario: User with expired/canceled subscription views profile
- **WHEN** a user with `subscriptionStatus: 'canceled'` views their profile
- **THEN** the page SHALL display "Expired" or "Canceled" status and a "Subscribe" button to resubscribe

#### Scenario: User with past_due subscription views profile
- **WHEN** a user with `subscriptionStatus: 'past_due'` views their profile
- **THEN** the page SHALL display a warning that their payment failed and prompt them to update payment

### Requirement: In-app subscription cancellation from profile
The profile page SHALL provide a cancellation flow that cancels the subscription at the end of the current billing period after user confirmation.

#### Scenario: User clicks cancel subscription
- **WHEN** a user clicks the "Cancel Subscription" button on the profile page
- **THEN** the system SHALL show a confirmation dialog explaining that access will continue until the current period ends

#### Scenario: User confirms cancellation
- **WHEN** a user confirms the cancellation in the dialog
- **THEN** the frontend SHALL call `POST /api/billing/cancel`
- **AND** on success, the profile page SHALL update to show the subscription will end on a specific date
- **AND** the user SHALL see a success message

#### Scenario: User dismisses cancellation dialog
- **WHEN** a user dismisses or cancels the confirmation dialog
- **THEN** no API call SHALL be made and the subscription SHALL remain unchanged

### Requirement: Navbar link to profile
The navigation bar SHALL include a link to the profile page for authenticated users.

#### Scenario: Authenticated user sees profile link
- **WHEN** an authenticated user views any page
- **THEN** the navbar SHALL display a link/icon to navigate to `/profile`

### Requirement: Profile page subscribe button initiates checkout
The profile page SHALL allow users without a subscription to initiate the Stripe Checkout flow.

#### Scenario: User clicks subscribe button
- **WHEN** a user without an active subscription clicks "Subscribe" on the profile page
- **THEN** the frontend SHALL call `POST /api/billing/checkout` and redirect the user to the returned Stripe Checkout URL
