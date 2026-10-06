## ADDED Requirements

### Requirement: Mode cards on certification page show progress bars
Each mode card (Estudio, Examen, Oral) on the certification page SHALL display a progress bar showing the user's completion percentage for that rating and mode combination.

#### Scenario: Progress bar reflects mastery
- **WHEN** user has completed 4 of 10 subjects at ≥80% mastery for AMG study
- **THEN** the Study card shows a progress bar at 40% filled

#### Scenario: No progress yet
- **WHEN** user has no progress data for a rating/mode
- **THEN** the progress bar shows 0% (empty track visible)

### Requirement: Home page "Tu progreso" shows progress bars per certification
The home page progress section SHALL display progress bars for each certification (AMG, AMA, AMP) showing overall mastery percentage.

#### Scenario: Progress bars on home page
- **WHEN** user has progress data across multiple certifications
- **THEN** each certification shows a labeled progress bar with percentage (e.g., "AMG · General — 45%")

### Requirement: Progress bars on exam/practice pages during session
During an active session (study, exam, or oral), a progress bar SHALL be visible at the top showing how far through the current question set the user is (e.g., question 5 of 20 = 25%).

#### Scenario: In-session progress bar
- **WHEN** user is on question 5 of 20
- **THEN** a progress bar at the top shows 25% filled with "5/20" label

#### Scenario: Progress bar updates on navigation
- **WHEN** user advances to the next question
- **THEN** the progress bar updates to reflect the new position
