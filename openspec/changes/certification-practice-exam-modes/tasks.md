## 1. Practice/Exam Tab Switcher on Certification Page

- [x] 1.1 Add tab state (`activeTab: 'practice' | 'exam'`) to `/certification/[code]/page.tsx` with default "practice"
- [x] 1.2 Create the segmented tab control UI component (styled to match existing design system)
- [x] 1.3 Add CSS styles for the tab switcher (`.cert-tab-group`, `.cert-tab`, `.cert-tab-active`) in `globals.css`
- [x] 1.4 Update mode card navigation to include `&mode=practice` or `&mode=exam` based on active tab
- [x] 1.5 Add timer icon and "Cronometrado" label to cards when exam tab is active

## 2. Practice Session Persistence (localStorage)

- [x] 2.1 Create a `lib/practiceSession.ts` utility with save/load/delete/list functions using localStorage key format `practice-{rating}-{modeType}`
- [x] 2.2 Define the session state type: `{ rating, modeType, subject, questionIds, answers, currentIndex, timestamp }`
- [x] 2.3 Update `/study` page to read `mode` query param and save session state on each answer in practice mode
- [x] 2.4 Update `/exam` page to read `mode` query param and save session state on each answer in practice mode
- [x] 2.5 Update `/oral` page to read `mode` query param and save session state on each answer in practice mode
- [x] 2.6 Add resume prompt UI: when practice session exists, show "Continue where you left off?" dialog with Continue/Start Fresh buttons
- [x] 2.7 Implement session resume logic: restore currentIndex and answers from saved state, skip to correct position in question array
- [x] 2.8 Add session validation: discard session if question IDs don't match API response

## 3. Exam Mode Reset Behavior

- [x] 3.1 In study/exam/oral pages, when `mode=exam`: do NOT write to localStorage
- [x] 3.2 Add `beforeunload` event listener in exam mode with confirmation warning
- [x] 3.3 Add Next.js router navigation interception in exam mode (show confirmation dialog on in-app navigation)
- [x] 3.4 Remove timer display in practice mode for the `/exam` page (currently always shows timer)
- [x] 3.5 Ensure returning to an exam page after leaving starts fresh (no resume prompt)

## 4. Progress Bars on Certification Page Cards

- [x] 4.1 Fetch progress data on the certification page (call `api.getProgress()`)
- [x] 4.2 Compute per-mode completion percentage from progress response (subjects mastered / total subjects for that rating)
- [x] 4.3 Add progress bar UI to each mode card (reuse `.progress-track` / `.progress-fill` CSS)
- [x] 4.4 Show percentage label on each card's progress bar

## 5. Progress Bars on Home Page

- [x] 5.1 Update the "Tu progreso" section to show per-certification progress bars (AMG, AMA, AMP)
- [x] 5.2 Add "Sesiones activas" subsection that reads practice sessions from localStorage
- [x] 5.3 For each active session: display rating, mode type, subject, progress percentage, and a "Continuar" button
- [x] 5.4 "Continuar" button navigates to the correct page with `mode=practice&rating={rating}`

## 6. In-Session Progress Bar

- [x] 6.1 Add a session progress bar component at the top of study/exam/oral active sessions showing `{current}/{total}` with a filled bar
- [x] 6.2 Update the progress bar on each question navigation (next/prev)
- [x] 6.3 Style the in-session progress bar to be compact and non-intrusive
