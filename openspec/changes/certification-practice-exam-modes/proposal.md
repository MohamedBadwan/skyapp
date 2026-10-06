## Why

The certification page currently navigates directly to separate study/exam/oral pages. Users need to clearly distinguish between **practice mode** (untimed, resumable, low-stakes) and **exam mode** (timed, non-resumable, must restart on exit). Additionally, there's no progress visibility during sessions or from the home page for continuing interrupted practice.

## What Changes

- Add a **Practice / Exam tab switcher** on the certification page (`/certification/[code]`) that controls how mode cards behave
- **Practice mode cards**: Navigate to study/exam/oral without timers; sessions are saved and can be resumed if the user leaves mid-session
- **Exam mode cards**: Navigate to study/exam/oral with timers and strict rules; leaving resets progress (must start over)
- Add **progress bars** to each mode card showing completion percentage for the selected certification
- Display **resumable practice sessions** in the "Tu progreso" section on the home page with a "Continue" action
- Show **progress bars per certification/mode** on the home page progress section

## Capabilities

### New Capabilities
- `practice-exam-tabs`: Tab switcher UI on the certification page that toggles between practice and exam mode, controlling card behavior and navigation params
- `practice-session-persistence`: Save practice sessions (current question index, answers so far) so users can resume after leaving; sessions stored in backend or localStorage
- `exam-mode-reset`: Enforce that leaving an exam-mode session discards progress and requires restarting from scratch
- `progress-bars`: Visual progress indicators on mode cards (certification page) and on the home page "Tu progreso" section showing completion per rating/mode

### Modified Capabilities

## Impact

- `faa-frontend/src/app/certification/[code]/page.tsx` — major rework: add tab UI, update card behavior based on mode
- `faa-frontend/src/app/page.tsx` — enhance "Tu progreso" section with progress bars and resumable session links
- `faa-frontend/src/app/study/page.tsx` — accept `mode=practice|exam` param, implement session save/restore for practice
- `faa-frontend/src/app/exam/page.tsx` — accept `mode=practice|exam` param, remove timer in practice mode, reset on exit in exam mode
- `faa-frontend/src/app/oral/page.tsx` — accept `mode=practice|exam` param, same behavior split
- `faa-frontend/src/app/globals.css` — new styles for tabs and progress bars
- `faa-backend` — potentially new endpoints for saving/loading practice session state (or use localStorage)
- API types (`faa-frontend/src/lib/types.ts`) — new types for session state
