## Purpose

Allow administrators to invite students and grant them a clearly bounded period of non-billing platform access without creating a Stripe subscription.

## ADDED Requirements

### Requirement: Administrator can create an invited student with or without a manual subscription
The system SHALL allow an authenticated administrator to create a student account by providing the student's name and email address, with no manual subscription or with exactly one of: a future subscription-end calendar date or a positive whole-calendar-month duration. An exact date SHALL grant access through the end of that calendar day. A duration SHALL be calculated from the grant's effective start and grant access through the end of the resulting calendar date; if the target month has fewer days, the date SHALL be clamped to that month's last day. The account SHALL be created as an active student account with no Stripe charge, customer, Checkout Session, charge, or recurring subscription.

The system SHALL reject duplicate email addresses, invalid or non-future dates, and requests from non-administrators. The system SHALL not accept, expose, or return a password as part of this administration workflow.

#### Scenario: Administrator creates an invited student with an exact date
- **WHEN** an administrator submits a unique name and email with a valid future access-end date
- **THEN** the system creates the student, records the manual grant and its expiry, and returns the created student without a password or invitation secret

#### Scenario: Administrator creates an invited student with a duration
- **WHEN** an administrator submits a unique name and email with a valid number of whole calendar months
- **THEN** the system calculates the expiry from the current grant start, creates the student, and returns the created student without a password or invitation secret

#### Scenario: Administrator creates an invited student without a subscription
- **WHEN** an administrator submits a unique name and email without a manual subscription option
- **THEN** the system creates the student, sends an invitation, stores no manual grant fields or grant event, and returns the created student without a password or invitation secret

#### Scenario: Administrator submits an invalid creation request
- **WHEN** an administrator submits an existing email address or an invalid or non-future access-end date
- **THEN** the system rejects the request and does not create an account or a manual access grant

#### Scenario: Non-administrator attempts to create a student
- **WHEN** a non-administrator calls the administrator student-creation operation
- **THEN** the system denies the request and does not disclose or change account data

### Requirement: Student receives and accepts a secure account invitation
The system SHALL send a newly created student a one-time invitation at their supplied email address so they can choose their own password. When a manual subscription is selected, the invitation SHALL include its expiry; when no subscription is selected, it SHALL state that the student can subscribe after setting a password. The invitation SHALL expire after seven days, SHALL be unusable after successful acceptance, and SHALL not be stored, returned, or logged in plain text.

The system SHALL allow an administrator to resend a fresh invitation to an invited student who has not accepted one. A resend SHALL invalidate any prior invitation. If invitation delivery cannot be completed during account creation, the system SHALL report the failure and leave no newly created usable account or grant behind.

#### Scenario: Student accepts a valid invitation
- **WHEN** a student submits a valid, unexpired invitation and a password that meets the normal password rules
- **THEN** the system sets that password, invalidates the invitation, and permits the student to sign in

#### Scenario: Invitation is expired, used, or replaced
- **WHEN** a student submits an expired, already-used, or superseded invitation
- **THEN** the system rejects the invitation without changing the account password

#### Scenario: Administrator resends a pending invitation
- **WHEN** an administrator resends an invitation for a student who has not yet accepted one
- **THEN** the system delivers a new one-time invitation and invalidates the previous invitation

### Requirement: Manual access grants govern protected learning access
The system SHALL treat an unexpired manual access grant as valid access to the same protected learning resources available to an active paid subscriber. The grant SHALL cease authorizing protected resources automatically after its recorded expiry, without requiring a scheduled job or administrator action.

The system SHALL allow an administrator to grant or extend manual access for an existing student with no active Stripe subscription by specifying exactly one future access-end date or positive whole-calendar-month duration. A duration extension SHALL start from an unexpired manual access end when present, otherwise from the current time. It SHALL record who made the grant and when. The system SHALL reject a grant that would overlap an active Stripe subscription, and SHALL preserve Stripe subscription data and billing behavior unchanged.

#### Scenario: Student uses an unexpired manual grant
- **WHEN** an active student with an unexpired manual access grant requests a protected learning resource
- **THEN** the system authorizes the request without requiring a Stripe subscription

#### Scenario: Manual access expires
- **WHEN** the recorded manual access expiry has passed
- **THEN** the system denies protected learning resources until the student obtains a new valid access entitlement

#### Scenario: Administrator extends eligible student access
- **WHEN** an administrator selects a later future access-end date or a positive duration for a student without an active Stripe subscription
- **THEN** the system records the extension and makes the new expiry the student's manual access end date

#### Scenario: Administrator tries to grant access to an active Stripe subscriber
- **WHEN** an administrator attempts to grant manual access to a student with an active Stripe subscription
- **THEN** the system rejects the request and leaves the Stripe subscription and its access period unchanged

### Requirement: Access source and expiry are clear in administrator and student views
The system SHALL show an administrator-created student without a subscription as having no subscription, and a student's manual subscription as administrator-granted, including the formatted expiry and invitation status. It SHALL show a student with manual access that it is administrator-granted and ends on that date.

The system SHALL not present Stripe automatic-renewal, billing-management, or subscription-cancellation controls for access that is currently granted manually. Existing Stripe subscribers SHALL continue to see their Stripe status and controls.

#### Scenario: Administrator reviews a manually granted student
- **WHEN** an administrator opens a student with manual access in the Clients view
- **THEN** the view identifies the access as administrator-granted, shows its expiry and invitation state, and provides the applicable extension or resend controls

#### Scenario: Student reviews manually granted access
- **WHEN** a student with unexpired manual access opens their profile
- **THEN** the profile identifies the access as administrator-granted, shows its expiry, and omits Stripe renewal and cancellation actions

#### Scenario: Administrator reviews a Stripe subscriber
- **WHEN** an administrator opens a student with an active Stripe subscription
- **THEN** the view continues to identify the Stripe subscription and its existing billing controls without representing it as a manual grant
