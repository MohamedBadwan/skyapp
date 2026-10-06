## 1. Coupon Data Contract

- [x] 1.1 Add a `Coupon` Mongoose model with Stripe Coupon and Promotion Code IDs, normalized code, display name, discount type/value, fixed-discount currency, optional redemption expiry, duration, optional duration-in-months, active state, creator, and timestamps.
- [x] 1.2 Add indexes and serialization types needed to list application-managed coupons without exposing internal-only fields.
- [x] 1.3 Define and validate the coupon-create request contract: normalized unique code, positive percentage or fixed amount, an optional future redemption expiry, and valid once/repeating/forever duration combinations.

## 2. Stripe Coupon Management API

- [x] 2.1 Implement administrator-only list and create handlers for `/api/admin/coupons`, including clear validation and duplicate-code errors.
- [x] 2.2 Map each valid create request to a Stripe Coupon and Stripe Promotion Code, using the existing configured subscription currency for fixed discounts and applying the same optional redemption expiry to both Stripe resources.
- [x] 2.3 Add compensating Stripe Coupon cleanup and logging when Promotion Code provisioning fails, and persist the local coupon only after complete remote provisioning.
- [x] 2.4 Implement `PATCH /api/admin/coupons/:id/deactivate` and `PATCH /api/admin/coupons/:id/reactivate` to update the remote Promotion Code before recording the local state; only permit reactivation while Stripe reports the coupon valid and the code otherwise redeemable.
- [x] 2.5 Register the new routes beneath the existing admin router so authentication and the administrator role are enforced on every coupon operation.

## 3. Checkout Redemption

- [x] 3.1 Update new subscription Checkout session creation to allow Stripe Promotion Code entry while preserving the current line-item, customer, success, and cancellation behavior.
- [x] 3.2 Verify the checkout flow does not offer a new session to users with an active subscription and leaves Stripe responsible for redemption eligibility and discounted totals.

## 4. Coupon Administration UI

- [x] 4.1 Add coupon TypeScript types and authenticated admin API client methods for listing, creating, and deactivating coupons.
- [x] 4.2 Create a protected `/coupons` page that is restricted to administrators and loads the current coupon inventory with loading, empty, error, and success states.
- [x] 4.3 Build the bilingual coupon-creation form with code, name, percentage/fixed discount selection, appropriately labelled value input, optional redemption-expiry date, duration selection, and conditional month-count input.
- [x] 4.4 Render coupon code, discount, redemption expiry, duration, creation time, and active/inactive/expired state, with confirmed deactivate and eligible reactivation actions; update the list after successful operations.
- [x] 4.5 Add responsive styles for the coupon-management page and add an administrator-only Coupons link to desktop and mobile navbar navigation.

## 5. Verification

- [x] 5.1 Add focused automated coverage for admin authorization, request validation, Stripe request mapping, redemption-expiry handling, partial-provisioning failure handling, deactivate/reactivate eligibility, and Checkout Promotion Code configuration.
- [x] 5.2 Add frontend coverage for admin-only route access and the coupon form's discount/duration field behavior, consistent with the selected frontend test setup.
- [x] 5.3 Run backend type checking/build and frontend lint/build checks.
- [ ] 5.4 In Stripe test mode, manually verify percentage and fixed coupons across one-cycle, repeating, and lifetime durations; confirm an active code discounts a new checkout, a manually inactive unexpired code can be reactivated, and an expired or deactivated code cannot be redeemed.
