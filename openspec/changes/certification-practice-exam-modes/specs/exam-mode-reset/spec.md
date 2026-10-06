## ADDED Requirements

### Requirement: Exam mode sessions are not persisted
When in exam mode (`mode=exam`), the system SHALL NOT save session state to localStorage or any persistent storage. Session exists only in React component state.

#### Scenario: No localStorage write in exam mode
- **WHEN** user answers questions in exam mode
- **THEN** no session data is written to localStorage

### Requirement: Navigating away from exam mode resets progress
If the user navigates away from an exam-mode session (via browser back, navbar link, or any route change), the session progress SHALL be lost entirely. Returning requires starting the exam from scratch.

#### Scenario: User clicks navbar link during exam
- **WHEN** user is in an exam-mode session and clicks a navbar link
- **THEN** a confirmation dialog appears: "¿Seguro que quieres salir? Perderás tu progreso."
- **AND** if confirmed, navigation proceeds and exam state is discarded

#### Scenario: User uses browser back button during exam
- **WHEN** user presses browser back during exam mode
- **THEN** the same confirmation dialog appears before navigation

#### Scenario: Returning after leaving exam
- **WHEN** user left an exam-mode session and navigates back to the same exam page
- **THEN** the exam starts from the beginning (rating selection or new exam generation)

### Requirement: Exam mode displays a timer
Exam mode sessions SHALL display a countdown timer. When the timer reaches zero, the exam SHALL auto-submit.

#### Scenario: Timer expires
- **WHEN** the countdown reaches 0:00 during an exam-mode session
- **THEN** the exam is automatically submitted and results are shown

### Requirement: Practice mode does NOT display a timer
When in practice mode, study/exam/oral pages SHALL NOT show a countdown timer regardless of question count.

#### Scenario: No timer in practice
- **WHEN** user is answering questions in practice mode
- **THEN** no countdown timer is visible and there is no time limit
