## Context

Administrators can currently edit existing user accounts, enable or disable them, and cancel their Stripe subscriptions. The `User` record stores Stripe subscription state directly, and protected learning routes accept an active subscription whose current period has not ended. Public registration requires a password; password-reset delivery already has configured SMTP support.

See [proposal.md](proposal.md) for the motivation and the capability specification for the behavior contract.

## Goals / Non-Goals

**Goals:**

- Add a secure administrator invitation flow without putting an initial password in the administrator UI, API response, or logs.
- Represent manual access independently enough that it neither creates nor mutates a Stripe subscription.
- Apply an exact, auditable expiry consistently in the access middleware and both administration and student-facing views.
- Make manual grants extendable for eligible students and traceable to the administrator who made the change.

**Non-Goals:**

- Charging a student, issuing invoices, creating a Stripe customer, or creating a Stripe subscription on the administrator's behalf.
- Editing, canceling, or converting a live Stripe subscription through the manual-grant controls.
- Building bulk imports, group grants, custom roles, or a general-purpose entitlement engine.

## Decisions

### Store manual access separately from Stripe subscription fields

The `User` model will receive optional manual-grant fields such as `manualAccessEndsAt`, `manualAccessGrantedAt`, and `manualAccessGrantedBy`. Authorization will treat valid manual access as an alternative to an active, unexpired Stripe subscription. The existing Stripe status, customer, subscription ID, and period fields remain dedicated to Stripe.

This avoids a manual grant posing as a Stripe subscription in the profile, webhook handlers, or cancellation paths. Reusing `subscriptionStatus` and `currentPeriodEnd` for both was considered, but would make expired grants look active, allow Stripe webhooks to overwrite manual state, and incorrectly expose Stripe actions.

### Support an exact end date or a whole-month duration

The Clients UI will default to creating an invited student without a subscription. An administrator may instead choose a manual subscription and provide exactly one of an `accessEndsOn` calendar date or an `accessDurationMonths` integer between 1 and 36. The server will validate the choice and persist an expiry at 23:59:59.999 UTC on the resulting date. For a duration, the server adds whole calendar months to the grant's effective start, clamps month-end dates safely, then uses the end of that resulting day. A duration extension starts from an existing unexpired manual-access end so months genuinely extend access; a new or expired grant starts from the current time.

An amount-and-unit duration picker was considered, but would introduce unnecessary unit and time-of-day ambiguity. Limiting duration input to whole months gives administrators a convenient two-month-style option while retaining an exact-date option for exceptional cases.

### Issue one-time invitations instead of administrator-set passwords

Creating a student will generate a cryptographically random, single-use invitation token, store only its hash and a seven-day expiry, and send the raw token only in an email link to the student. The invitation copy includes a manual-subscription expiry only when one was selected; otherwise it directs the student to subscribe after setting a password. The student-facing acceptance route validates the token and normal password policy, sets the password, and removes the invitation data. A resend creates a replacement token and invalidates the old one.

A user account requires a password hash, so creation will store a random, unshared placeholder hash until the invitation is accepted. The creation operation first verifies mail configuration, creates the pending account and grant, sends the invitation, and compensates by deleting the newly created record if delivery fails. The invitation secret is never included in APIs or logs.

Having an administrator choose a temporary password was considered but rejected because it exposes a credential to the administrator and encourages insecure sharing. Reusing the short-lived reset-code flow was also rejected because it is request-driven and unsuitable as an account invitation.

### Permit grants only outside a live paid access period

The create and extend endpoints will require a student role and reject an account with an active Stripe subscription that has not ended. A manual-grant extension must set a future date later than any current unexpired manual grant. Administrators can still disable an account immediately through the existing account-active control.

This preserves paid access and avoids competing expiries. Allowing overlapping manual and Stripe access was considered but would make precedence, checkout availability, and billing UI unclear.

### Expose a derived access presentation and audit events

The administrator user response will include the manual-expiry, grant provenance suitable for administrators, and invitation state (pending, accepted, or expired). The student-safe response will expose only the access mode and end date. Manual creation and extension will add distinct history events so the Clients timeline records that no payment was involved.

The Clients page will add a create-student action and an extend-access control for eligible records. The Profile page will render manual access as a fixed period and omit Stripe cancel/renew controls. Billing Checkout will consider a current manual grant active, so it cannot create accidental overlapping paid access; it becomes available normally once the grant has expired.

## Risks / Trade-offs

- [Invitation email is unavailable or rejected] → Require configured mail before creation, report the failure, compensate by removing the just-created pending record, and support resend for all pending invitations.
- [Date-only values vary by browser timezone] → Accept the date string but calculate and compare the final expiry on the server with a documented UTC day boundary.
- [Calendar months have unequal lengths] → Calculate durations on the server and clamp a month-end target to the final valid day of the target month.
- [A live Stripe subscription is accidentally changed] → Reject manual grants while paid access is active; keep Stripe fields and webhook logic separate from manual-grant fields.
- [Manual access appears active after expiry in a stale UI] → Derive access from the recorded expiry at request/render time and refresh the Clients data after a mutation; no background expiry job is required for authorization.
- [Invitation email is forwarded] → Use a high-entropy, single-use, expiring token and require the recipient to set a password; administrators never handle the secret.

## Migration Plan

1. Add optional manual-grant and invitation fields with defaults that leave all existing accounts and Stripe behavior unchanged.
2. Add protected administration and invitation-acceptance APIs, then the invitation mail template and frontend screens.
3. Update authorization, Checkout availability, Clients, and Profile to calculate access from either valid entitlement.
4. Add unit and integration coverage for invitation security, date boundaries, eligibility rules, and authorization; run the existing Stripe workflow regression tests.
5. Deploy with SMTP configured before exposing the create-student control. Roll back by hiding the new UI and routes; optional fields and historical manual events can remain safely, while already-granted access continues until its recorded expiry.
