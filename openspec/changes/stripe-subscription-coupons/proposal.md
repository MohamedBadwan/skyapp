## Why

The subscription flow has no way to offer promotional pricing, which prevents administrators from running time-bound discounts or partner offers. Administrators need to create and manage Stripe-backed coupon codes without direct access to the Stripe Dashboard, while subscribers need a secure way to redeem them during checkout.

## What Changes

- Add an administrator-only Coupons area, linked from the navbar, for creating and viewing coupon codes.
- Let an administrator define a code, a fixed-amount or percentage discount, an optional redemption-expiry date, and how long the discount applies to each subscription: one billing cycle, a specified number of months, or indefinitely.
- Create the corresponding Stripe Coupon and active Stripe Promotion Code, and persist their identifiers and display metadata locally for management and auditability.
- Enable promotion-code entry in Stripe Checkout so a subscriber can redeem an active code against a new subscription.
- Allow administrators to deactivate and reactivate a coupon code while it remains eligible for redemption, without changing discounts already applied to existing subscriptions. An expiry date is a hard cutoff for new redemptions.

## Capabilities

### New Capabilities

- `subscription-coupons`: Administrator-managed Stripe subscription coupons, including creation, visibility, deactivation, and redemption in the hosted checkout flow.

### Modified Capabilities

- None.

## Impact

- **Backend:** New coupon persistence model and admin-only coupon endpoints; Stripe Coupon and Promotion Code API calls, including aligned redemption-expiry handling; the existing checkout-session configuration will allow promotion-code redemption.
- **Frontend:** New protected `/coupons` administration page, coupon types and API client methods, responsive navbar link, optional expiry-date input, and bilingual coupon-management UI states.
- **Stripe:** Each local coupon maps to a Stripe Coupon plus a Stripe Promotion Code. Stripe Checkout remains the payment surface and calculates the discounted subscription amount.
- **Testing:** Backend validation, authorization, Stripe request mapping, checkout configuration, and frontend admin-only create/list/deactivate flows require coverage.
