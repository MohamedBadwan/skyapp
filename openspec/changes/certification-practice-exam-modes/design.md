## Context

The FAA A&P Trainer app currently has a certification page (`/certification/[code]`) that shows three mode cards (Study, Exam, Oral) linking directly to their respective pages. There's no distinction between casual practice and formal exam-taking. Users cannot resume interrupted sessions, and there's no per-mode progress visibility on the cards or home page.

The frontend is Next.js App Router with client-side state management. The backend is Express + MongoDB. Progress is already tracked via `api.getProgress()` / `api.postProgress()`.

## Goals / Non-Goals

**Goals:**
- Add a Practice/Exam tab on the certification page that changes card behavior
- Practice mode: untimed, sessions persist in localStorage so users can resume
- Exam mode: timed, sessions are ephemeral and reset if user navigates away
- Show progress bars on mode cards and on the home page "Tu progreso" section
- Allow resuming practice sessions from the home page

**Non-Goals:**
- Backend changes for session persistence (localStorage is sufficient for practice state)
- Changing the actual question/answer mechanics inside study/exam/oral pages
- Adding new API endpoints (reuse existing progress API)
- Grading or certification tracking beyond what already exists

## Decisions

### 1. Session storage: localStorage over backend

**Decision:** Store practice session state in `localStorage` keyed by `practice-{rating}-{mode}`.

**Rationale:** Practice sessions are per-device, low-stakes, and ephemeral. Backend persistence would require new endpoints, auth handling, and DB schema changes for minimal benefit. localStorage is instant, offline-capable, and simple to implement.

**Alternatives considered:**
- Backend persistence: More durable but unnecessary complexity for "continue where you left off" UX
- sessionStorage: Clears on tab close, too aggressive for practice continuity

### 2. Mode parameter via URL query string

**Decision:** Pass `mode=practice` or `mode=exam` as a query parameter to study/exam/oral pages alongside the existing `rating` param.

**Rationale:** Keeps URLs shareable and bookmarkable. The page can read the mode on mount and configure behavior accordingly. No global state needed.

**Alternatives considered:**
- React context: Would require wrapping the app; overly complex for a simple flag
- Route segments (`/study/practice/AMG`): Breaking change to existing routing

### 3. Tab UI on certification page

**Decision:** A simple two-tab segmented control at the top of the mode cards section. Active tab stored in component state (defaults to "practice").

**Rationale:** Minimal UI footprint, clear visual distinction, no routing complexity.

### 4. Progress bars source

**Decision:** Reuse existing `api.getProgress()` response which already contains per-subject mastery percentages grouped by rating. Aggregate these into per-mode completion ratios for the progress bars.

**Rationale:** No new API needed. The existing progress data has everything: rating, subject, mastery percentage, and mastered boolean.

### 5. Exam mode exit detection

**Decision:** Use `beforeunload` event + Next.js `useRouter` events to detect navigation away during exam mode. On detection, clear the session (don't save).

**Rationale:** Standard web API for "are you sure you want to leave?" combined with Next.js router interception covers both browser navigation and in-app routing.

## Risks / Trade-offs

- **[localStorage quota]** → Practice sessions are small (question IDs + answers array). Well under 5MB limit even with dozens of sessions.
- **[Stale sessions]** → If question bank updates, a saved session might reference removed questions. Mitigation: validate session on resume; if invalid questions found, discard and start fresh.
- **[beforeunload unreliable on mobile]** → Some mobile browsers don't fire beforeunload consistently. Mitigation: Also check on exam page mount if a session exists and mode is exam; if so, clear it (defense in depth).
- **[No cross-device continuity]** → Practice sessions are device-local. Acceptable trade-off for simplicity; users expect practice to be casual.
