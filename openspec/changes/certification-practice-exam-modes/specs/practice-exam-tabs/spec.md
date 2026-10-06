## ADDED Requirements

### Requirement: Certification page displays a Practice/Exam tab switcher
The certification page (`/certification/[code]`) SHALL display a segmented tab control with two options: "Práctica" (Practice) and "Examen" (Exam). The default selected tab SHALL be "Práctica".

#### Scenario: Default tab is Practice
- **WHEN** user navigates to `/certification/amg`
- **THEN** the "Práctica" tab is selected and mode cards display in practice configuration

#### Scenario: Switching to Exam tab
- **WHEN** user clicks the "Examen" tab
- **THEN** the mode cards update to display in exam configuration with timer indicators

### Requirement: Practice mode cards navigate with mode=practice
When the Practice tab is active, clicking a mode card (Estudio, Examen escrito, Oral) SHALL navigate to the respective page with query parameters `rating={CODE}&mode=practice`.

#### Scenario: Clicking Study card in Practice mode
- **WHEN** user has Practice tab selected and clicks "Estudio por materia"
- **THEN** browser navigates to `/study?rating=AMG&mode=practice`

### Requirement: Exam mode cards navigate with mode=exam
When the Exam tab is active, clicking a mode card SHALL navigate with query parameters `rating={CODE}&mode=exam`.

#### Scenario: Clicking Exam card in Exam mode
- **WHEN** user has Exam tab selected and clicks "Examen escrito"
- **THEN** browser navigates to `/exam?rating=AMG&mode=exam`

### Requirement: Exam mode cards display timer indication
When the Exam tab is active, mode cards SHALL visually indicate that sessions are timed and non-resumable (e.g., timer icon, "Cronometrado" label).

#### Scenario: Visual difference between practice and exam cards
- **WHEN** user switches from Practice to Exam tab
- **THEN** cards show a timer icon and a label indicating timed/non-resumable behavior
