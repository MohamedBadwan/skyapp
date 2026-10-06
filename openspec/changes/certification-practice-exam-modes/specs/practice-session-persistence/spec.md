## ADDED Requirements

### Requirement: Practice sessions are saved to localStorage
When in practice mode (`mode=practice`), the system SHALL save the current session state to localStorage whenever the user answers a question or navigates between questions. The key format SHALL be `practice-{rating}-{mode_type}` (e.g., `practice-AMG-study`).

#### Scenario: Session auto-saves on answer
- **WHEN** user answers a question in practice mode
- **THEN** the session state (current index, answers map, question IDs) is persisted to localStorage

#### Scenario: Session state structure
- **WHEN** a practice session is saved
- **THEN** it contains: `{ rating, modeType, subject, questionIds, answers, currentIndex, timestamp }`

### Requirement: Practice sessions can be resumed
When navigating to a study/exam/oral page in practice mode, the system SHALL check localStorage for an existing session matching the rating and mode type. If found, the user SHALL be prompted to continue or start fresh.

#### Scenario: Resuming an existing session
- **WHEN** user navigates to `/study?rating=AMG&mode=practice` and a saved session exists
- **THEN** system displays a prompt asking "Continue where you left off?" with Continue and Start Fresh options

#### Scenario: No existing session
- **WHEN** user navigates in practice mode and no saved session exists
- **THEN** the normal flow begins (subject selection for study/oral, or exam generation)

### Requirement: Practice sessions are resumable from home page
The home page "Tu progreso" section SHALL display active practice sessions with a "Continuar" (Continue) button that navigates directly to the saved session.

#### Scenario: Active sessions shown on home page
- **WHEN** user has one or more saved practice sessions in localStorage
- **THEN** a "Sesiones activas" section appears in "Tu progreso" showing each session with rating, mode, subject, and progress percentage

#### Scenario: Clicking Continue on home page
- **WHEN** user clicks "Continuar" on an active session card
- **THEN** browser navigates to the correct page with `mode=practice&rating={rating}` and the session resumes automatically

### Requirement: Stale sessions are discarded
If a saved practice session references questions that no longer exist in the response from the API, the session SHALL be discarded and the user starts fresh.

#### Scenario: Invalid session data
- **WHEN** user resumes a session but the question IDs don't match the API response
- **THEN** the saved session is deleted from localStorage and the user starts a new session
