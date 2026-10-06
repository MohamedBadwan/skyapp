## 1. Data model and access rules

- [x] 1.1 Add optional manual-access grant provenance and expiry fields plus pending-invitation token/expiry fields to the User model, with migrations/defaults that preserve existing users.
- [x] 1.2 Add a shared entitlement helper that determines whether a user has active Stripe access or unexpired manual access, and use it in protected-resource authorization.
- [x] 1.3 Update Checkout and subscription-status behavior so an unexpired manual grant prevents overlapping Checkout, while an expired grant no longer blocks a paid subscription.
- [x] 1.4 Add distinct manual-grant history events and serialization that presents manual access and invitation state safely to administrators and students.

## 2. Invitation and administration APIs

- [x] 2.1 Add the invitation email template/service, including the configured frontend invitation URL and the manual-access expiry in the message.
- [x] 2.2 Add administrator-only create-student validation and endpoint that accepts name, email, and a future `accessEndsOn` date, creates the pending invited student, and compensates safely for mail-delivery failure.
- [x] 2.3 Add administrator-only resend-invitation validation and endpoint that replaces a pending invitation without exposing the token.
- [x] 2.4 Add the public invitation-acceptance validation and endpoint that accepts a one-time unexpired token, sets the student-selected password, and consumes invitation state.
- [x] 2.5 Add administrator-only grant/extend-access validation and endpoint with end-of-day handling, student-role protection, later-date validation, active-Stripe conflict protection, and grant audit attribution.
- [x] 2.6 Update admin routes, authorization responses, and error handling so all new operations follow existing access-control and API conventions.

## 3. Administrator and student experience

- [x] 3.1 Extend shared frontend API contracts and types for student creation, invitation state/resend, manual access grants, and manual-access presentation.
- [x] 3.2 Add a clearly labelled Create student workflow to Clients with name, email, exact access-end date, submission feedback, and an explanation that it creates no Stripe charge or renewal.
- [x] 3.3 Add eligible manual-access extension and pending-invitation resend controls to the selected client, with unavailable states for active Stripe subscribers and self-account safeguards.
- [x] 3.4 Update Clients subscription summaries, filters, history, and date labels to distinguish administrator-granted access from Stripe billing without regressing Stripe controls.
- [x] 3.5 Add an invitation-acceptance page where students choose and confirm their password, with secure token failure and completion states.
- [x] 3.6 Update Profile to show current manual access and expiry, suppress Stripe cancellation/renewal controls for it, and retain existing Stripe presentation for paid subscribers.

## 4. Verification

- [x] 4.1 Add backend unit and integration tests for date conversion, manual-entitlement authorization/expiry, creation validation, Stripe-overlap rejection, and manual grant audit data.
- [x] 4.2 Add backend tests for invitation token hashing, expiry, single-use acceptance, resend invalidation, unauthorized calls, and failed-email compensation.
- [x] 4.3 Add frontend component tests for administrator creation/extension states, invitation acceptance, manual-access profile rendering, and preserved Stripe control rendering.
- [ ] 4.4 Run backend and frontend lint, type-check, unit-test, and production-build commands; manually verify invitation delivery and access expiry using configured SMTP and a non-production account.

## 5. Access-length options and date-boundary revision

- [x] 5.1 Update creation and extension contracts so each request accepts exactly one future calendar end date or 1–36 whole calendar months, with server-side month-end clamping and UTC end-of-day expiry.
- [x] 5.2 Update invitation formatting and all coupon/manual-access date handling to remove location-specific date semantics and wording.
- [x] 5.3 Add date-or-month controls to Clients, revise API contracts and localized copy, and cover the duration payload in frontend tests.
- [x] 5.4 Run targeted and full automated verification, strict OpenSpec validation, and the frontend UI-quality detector for the revised controls.

## 6. Optional subscription on student creation

- [x] 6.1 Allow the administrator creation API to omit a manual subscription, avoid creating manual-grant data or history in that case, and support invitation resend for every pending invited student.
- [x] 6.2 Make invitation email copy conditional on whether a manual subscription was selected, directing students without one to subscribe after account setup.
- [x] 6.3 Update Clients to default to “Sin suscripción” / “No subscription”, provide an explicit manual-subscription option with date-or-month duration controls, and use subscription terminology in that creation workflow.
- [x] 6.4 Add contract and component coverage for no-subscription creation, then run targeted and full automated checks plus strict OpenSpec validation.
