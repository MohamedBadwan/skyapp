## Purpose

Provide administrators a safe, in-product way to offer Stripe subscription discounts that subscribers can redeem during hosted checkout.

## ADDED Requirements

### Requirement: Administrators can access coupon management
The system SHALL provide a Coupons navigation item and coupon-management page to authenticated administrators. The navigation item and page controls MUST NOT be available to students, and all coupon-management operations MUST require administrator authorization.

#### Scenario: Administrator opens Coupons from the navbar
- **WHEN** an authenticated administrator views the navigation
- **THEN** the system displays a Coupons link that opens the coupon-management page

#### Scenario: Student attempts to access coupon management
- **WHEN** an authenticated student navigates to the coupon-management page or calls a coupon-management operation
- **THEN** the system denies access and does not reveal coupon-management data

### Requirement: Administrators can define a subscription coupon
The system SHALL let an administrator create a coupon with a unique redemption code, a display name, a discount type, a discount value, an optional redemption-expiry date, and a subscription discount duration. The discount type MUST be either a percentage or a fixed monetary amount in the subscription currency. The redemption-expiry date, when supplied, MUST be in the future and MUST stop new redemptions at that date without changing discounts already applied to subscriptions. The discount duration MUST be either one billing cycle, a positive whole number of billing months, or every billing cycle for the lifetime of the subscription.

#### Scenario: Administrator creates a percentage coupon for a limited period
- **WHEN** an administrator submits a unique code, a percentage discount, and a positive number of billing months
- **THEN** the system creates a coupon that applies that percentage for exactly the requested number of subscription billing months

#### Scenario: Administrator creates a fixed-amount coupon for one billing cycle
- **WHEN** an administrator submits a unique code, a positive fixed discount amount, and the one-cycle duration
- **THEN** the system creates a coupon that applies the fixed amount to the subscriber's first subscription invoice only

#### Scenario: Administrator creates a coupon with a redemption expiry date
- **WHEN** an administrator submits a valid future redemption-expiry date and a two-month repeating discount
- **THEN** new subscribers can redeem the code only before that date and each redeemed subscription receives the discount for its first two billing cycles

#### Scenario: Administrator submits an invalid coupon definition
- **WHEN** an administrator submits an empty or duplicate code, an unsupported discount type, a non-positive discount value or duration, or a redemption-expiry date that is not in the future
- **THEN** the system rejects the request with a clear validation error and creates no redeemable coupon

### Requirement: Coupon definitions are provisioned in Stripe
For each accepted coupon definition, the system SHALL create a corresponding Stripe Coupon and an active Stripe Promotion Code using the administrator-provided redemption code. When a redemption-expiry date is supplied, both Stripe resources MUST enforce that same redemption cutoff. The resulting discount type, value, duration, and redemption expiry MUST match the submitted definition. A local coupon record MUST identify the Stripe resources and retain the information needed to display and manage the coupon.

#### Scenario: Stripe provisioning succeeds
- **WHEN** a valid coupon definition is accepted
- **THEN** the system returns and lists the newly active coupon with its redemption code, discount details, duration, and creation time

#### Scenario: Stripe provisioning fails
- **WHEN** Stripe rejects or cannot complete the coupon or promotion-code creation
- **THEN** the system reports that the coupon was not created and does not expose a locally active coupon as redeemable

### Requirement: Administrators can review, deactivate, and reactivate coupon codes
The system SHALL list coupons created through the application with their redemption code, discount, redemption expiry, discount duration, creation time, and current state. An administrator MUST be able to deactivate an active coupon code and reactivate a manually deactivated code only while the underlying coupon is still valid and the code remains otherwise redeemable. Deactivation, reactivation, and expiration MUST NOT change discounts already attached to subscriptions.

#### Scenario: Administrator deactivates an active coupon
- **WHEN** an administrator deactivates an active coupon code
- **THEN** the system marks it inactive in the administration view and Stripe no longer accepts the promotion code for new checkouts

#### Scenario: Administrator reactivates an unexpired coupon
- **WHEN** an administrator reactivates a manually deactivated coupon before its redemption-expiry date
- **THEN** the system marks it active in the administration view and Stripe accepts the promotion code for eligible new checkouts again

#### Scenario: Coupon reaches its redemption-expiry date
- **WHEN** the coupon's configured redemption-expiry date passes
- **THEN** the system presents the coupon as expired, Stripe rejects new redemptions, and the administrator cannot reactivate it

#### Scenario: Administrator reviews coupons
- **WHEN** an administrator opens the coupon-management page
- **THEN** the system presents the created coupons and their current active, inactive, or expired state

### Requirement: Subscribers can redeem active codes in Stripe Checkout
The system SHALL enable promotion-code entry for every new subscription Checkout session. Stripe Checkout MUST calculate and apply the discount only for an active, eligible promotion code; the application MUST continue to use Stripe as the source of truth for redemption eligibility and discounted totals.

#### Scenario: Subscriber redeems an active coupon code
- **WHEN** a subscriber enters an active coupon code during a new Stripe Checkout session
- **THEN** Stripe Checkout shows the applicable discounted subscription total and applies the discount for the coupon's configured duration

#### Scenario: Subscriber enters an inactive or invalid code
- **WHEN** a subscriber enters an inactive, expired, or unknown promotion code during Checkout
- **THEN** Stripe Checkout does not apply a discount and communicates that the code cannot be used
