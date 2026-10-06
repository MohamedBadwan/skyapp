## Why

Administrators currently can manage existing accounts but cannot provision a student directly or grant a defined period of paid access without creating a Stripe subscription. This makes complimentary, offline-paid, or partner-provided access unnecessarily dependent on the self-registration and billing flow.

## What Changes

- Add an administrator-only workflow to create a student account with a name and email address, either without a subscription or with a time-limited manual subscription specified by an exact end date or a number of whole calendar months.
- Send the new student a secure invitation to choose their own password; administrators never set or receive the student's password.
- Record an optional manual subscription with an explicit expiry and a record of who granted it, without creating a Stripe customer, Checkout Session, charge, or recurring subscription.
- Allow administrators to grant or extend time-limited manual access for eligible existing students using either option, while preserving and clearly distinguishing Stripe-managed subscriptions.
- Show manual-grant access and expiry accurately in the administrator client view and in the student's profile. Manual grants must not expose Stripe renewal or cancellation controls.
- Preserve the existing subscription gate: an active manual grant permits the same protected learning access as an active Stripe subscription until its expiry; access ends automatically after that time.

## Capabilities

### New Capabilities

- `admin-user-subscription-grants`: Administrator creation of invited student accounts and time-limited, non-billing manual access grants.

### Modified Capabilities

- None.

## Impact

- Backend user model, administration endpoints and validation, authentication/invitation email delivery, subscription-access middleware, and subscription history/audit records.
- Frontend Clients administration screen, shared user/API types, and Profile subscription presentation.
- No Stripe API operation or billing configuration is introduced for manually granted access.
