## Context

The existing billing flow creates Stripe Checkout sessions in subscription mode and uses Stripe webhooks to synchronize subscription state. Administrators already authenticate through the existing role middleware, have a protected Clients area, and are conditionally shown administration links in the navbar. There is no persistent coupon model or coupon-management API today. See `proposal.md` and `specs/subscription-coupons/spec.md` for the requested behavior.

## Goals / Non-Goals

**Goals:**

- Add an administrator-only workflow to create, list, deactivate, and reactivate redeemable subscription discounts.
- Make the coupon form map unambiguously to Stripe's percentage/fixed amount and duration options.
- Keep Stripe as the source of truth for discount calculation and redemption eligibility.
- Retain enough local data to render an admin inventory without querying Stripe for every page load.

**Non-Goals:**

- Applying a discount automatically to a particular user or subscription.
- Editing an existing Stripe coupon's discount, duration, or code after it has been created.
- Redemption limits, first-time-customer restrictions, or customer-specific promotion codes.
- Synchronizing, importing, or managing coupons created directly in the Stripe Dashboard.
- Changing discount details or removing discounts from subscriptions that have already redeemed a code.

## Decisions

### 1. Model each in-app coupon as a Stripe Coupon plus a Stripe Promotion Code

**Chosen:** Creating a coupon will first create a Stripe Coupon that represents the discount and duration, then create an active Stripe Promotion Code using the administrator's code. When the administrator supplies a redemption-expiry date, the application will set the Coupon's `redeem_by` and the Promotion Code's `expires_at` to that same instant. The application will turn on `allow_promotion_codes` when it creates a new subscription Checkout session.

**Why:** Stripe Coupons define the discount but do not themselves provide a customer-enterable code. Promotion Codes are Stripe's redeemable, administratively deactivatable layer and are what hosted Checkout accepts. Leaving calculation and eligibility in Checkout avoids duplicating pricing rules in the frontend or backend.

**Alternative considered:** Apply a Stripe Coupon ID directly to every Checkout session. Rejected because customers would not have a code entry field and the application could not offer several active coupons at once. Custom in-app code validation was also rejected because it would duplicate Stripe's redemption behavior and discount calculations.

### 2. Persist a local coupon inventory as a Stripe resource reference

**Chosen:** Add a Mongoose `Coupon` model with a normalized redemption code, display name, discount type and value, currency for fixed discounts, redemption expiry, duration and optional duration-in-months, `stripeCouponId`, `stripePromotionCodeId`, `active`, creator identifier, and timestamps. A display state of `expired` is derived when the redemption expiry has passed, rather than stored independently. Monetary fixed discounts are stored in the currency's minor units to avoid rounding drift.

**Why:** The admin page needs a stable, fast list of coupons made by this app and a local active-state record. Stripe identifiers make remote deactivation deterministic and retain a usable audit trail without treating the local record as the payment authority.

**Alternative considered:** List all Coupon or Promotion Code objects directly from Stripe. Rejected because it would include unrelated dashboard-created resources, requires remote pagination on every page load, and has no app-local ownership record.

### 3. Use a discriminated server-side coupon input contract

**Chosen:** The creation payload will contain `name`, `code`, `discountType`, `discountValue`, an optional `redeemBy`, `duration`, and `durationInMonths` only when `duration` is `repeating`. The server will trim and normalize the code, require it to be unique among locally active codes, reject a non-future redemption expiry, validate positive values, and translate fixed amounts with the existing subscription currency.

**Why:** A single value field produces a focused form while the discriminated validation prevents invalid Stripe combinations such as a month count for a one-time discount. Normalization makes duplicate-code errors predictable before creating remote resources.

**Alternative considered:** Pass raw Stripe request parameters from the browser. Rejected because it exposes Stripe-specific details, makes validation inconsistent, and would let clients choose arbitrary currencies.

### 4. Use explicit create/list/deactivate admin endpoints

**Chosen:** Add administrator-only endpoints under `/api/admin/coupons`:

- `GET /api/admin/coupons` lists application-managed coupons.
- `POST /api/admin/coupons` validates and provisions a coupon plus promotion code.
- `PATCH /api/admin/coupons/:id/deactivate` disables an active promotion code.
- `PATCH /api/admin/coupons/:id/reactivate` enables a manually deactivated promotion code when Stripe confirms that the coupon is still valid and the code is otherwise redeemable.

The `Coupons` page will use the existing protected-page and API-client patterns, and the navbar will show its link only to administrators in both desktop and mobile navigation.

**Why:** The existing `/api/admin` router already enforces authentication and the admin role, so the new capability follows an established security boundary and UI convention.

**Alternative considered:** Place coupon management in the general billing router. Rejected because all authenticated users can access billing routes and coupon management is an administrator concern.

### 5. Treat Stripe calls as transactional with local compensation

**Chosen:** The creation sequence is: validate locally, create the Stripe Coupon, create the Stripe Promotion Code, then save the local record. If Promotion Code creation fails after the Coupon exists, the backend will attempt to delete the unused Stripe Coupon, log any cleanup failure, return an error, and not save a local active record. Deactivation and reactivation call Stripe first and update the local `active` state only after Stripe confirms.

**Why:** This ensures the management view never claims a coupon is redeemable when it was not fully provisioned, and it avoids presenting a locally inactive code that Stripe can still accept.

**Alternative considered:** Save the local document before Stripe calls and reconcile later. Rejected because transient or partial failures would display unusable coupons and create ambiguity for administrators.

### 6. Separate coupon redemption availability from per-subscriber discount duration

**Chosen:** The optional redemption-expiry date controls when new subscribers can use a code. Discount duration controls how many billing cycles each redeemed subscription receives the discount. Deactivation sets the Stripe Promotion Code inactive and reactivation returns it to active only when Stripe reports the coupon is valid and the code remains redeemable. The implementation will not delete a Stripe Coupon or modify existing subscriptions that have already redeemed it.

**Why:** This lets a code be permanently available with a two-month discount, or available until a chosen date with any supported duration, without conflating the offer window and the benefit promised to each subscriber. Stripe prevents reactivation after a code or its coupon has expired, so the expiry date is a deliberate hard cutoff.

**Alternative considered:** Delete the Coupon during deactivation or extend an expired code. Rejected because it risks changing or invalidating discounts on existing subscriptions, removes useful history, and conflicts with Stripe's non-reactivatable expiry behavior.

## Risks / Trade-offs

- **[Partial remote creation]** → Create resources before the local document and perform best-effort Stripe Coupon cleanup when promotion-code creation fails; log the remote IDs for manual recovery if cleanup fails.
- **[Code collisions or external Stripe conflicts]** → Normalize and check locally first, then surface Stripe's conflict response without exposing a locally active coupon. The operator can choose another code.
- **[Fixed-amount currency conversion]** → Accept the amount in the configured subscription currency and convert it once at the server boundary to minor units; never calculate discounted subscription totals locally.
- **[Expiry and duration are confused]** → Label the fields separately as "Redeemable until" and "Discount duration," display both in the inventory, and show the expected state after the redemption date passes.
- **[Coupon state changed outside the app]** → The local list is scoped to app-created coupons and may not reflect dashboard-side changes immediately; Stripe Checkout remains the redemption authority.
- **[Promotion codes appearing on all new checkout sessions]** → This is intentional so users can redeem an eligible code. Restrictions such as usage caps or customer eligibility are deferred non-goals and must be added explicitly later.

## Migration Plan

1. Deploy the backend model, guarded admin routes, Stripe provisioning logic, and Checkout-session configuration together.
2. Deploy the protected frontend Coupons page, client types, API methods, navigation link, and responsive styles.
3. In Stripe test mode, create percentage, fixed-amount, one-cycle, repeating, and lifetime coupons with and without a redemption expiry; verify their codes in a new Checkout session, reactivation before expiry, rejection after expiry, and deactivation behavior.
4. Release with the existing Stripe credentials and subscription-currency configuration; no data migration is required because the new MongoDB collection is populated on creation.
5. If rollback is needed, remove the frontend navigation and stop creating new coupons. Keep the existing local records and Stripe resources intact so already-applied subscription discounts continue without disruption.
