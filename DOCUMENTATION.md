# FAA A&P Trainer - Project Documentation

## Overview

SkyMentor is a study platform for FAA Aviation Maintenance Technician (AMT) certification, covering the three ratings: General (AMG), Airframe (AMA), and Powerplant (AMP). The application provides study-by-subject, written exam simulation, and oral exam practice modes.

## Architecture

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, deployed as a client-heavy SPA
- **Backend:** Express.js with TypeScript, MongoDB (via Mongoose), Stripe for billing
- **Package Manager:** pnpm

## Frontend Structure (`faa-frontend/`)

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Dashboard home — hero with airplane background, certification gallery carousel, active sessions, progress overview |
| `/certification/[code]` | Certification detail — Practice/Exam tab switcher, mode cards (Study, Exam, Oral) with progress bars |
| `/study` | Study-by-subject mode with session persistence |
| `/exam` | Written exam simulator with optional timer |
| `/oral` | Oral exam practice with speech recognition |
| `/checkout/*` | Stripe subscription flow |

### Key Components

- `Navbar.tsx` — Dynamic navigation links (contextual Estudio/Examen/Oral links)
- `Protected.tsx` — Auth + subscription gate wrapper
- `Spinner.tsx` — Loading indicator

### Design System

The app uses CSS custom properties for theming (dark/light via `data-theme`). Key tokens defined in `globals.css`:
- Colors: `--accent` (cyan in dark, dark teal in light), `--surface`, `--text`, `--line`, etc.
- Shared classes: `.card`, `.btn-primary`, `.cert-gallery-card`, `.mode-card`, `.progress-track`
- Light mode: fully supported with `html[data-theme='light']` overrides for header, buttons, tabs, language switcher, body gradients, and accent-on-background text (white text on dark teal backgrounds)

### Home Page Gallery

The home page features a **horizontal gallery carousel** for certification selection:
- Three vertical image cards (General, Airframe, Powerplant)
- Each card has a topic-relevant photo, certification code badge, title, and description
- Navigation arrows on the sides for scrolling
- Clicking a card navigates to `/certification/[code]`
- Hero section has a full-bleed airplane background image

### Images (`public/images/`)

| File | Purpose |
|------|---------|
| `airplane-bg.jpg` | Global page background (airplane) |
| `general.webp` | General certification card image |
| `airframe-high-altitude.webp` | Airframe certification card image |
| `powerplant.webp` | Powerplant certification card image |

### Practice/Exam Modes

- **Practice mode:** No timer, sessions persist in `localStorage`, can be resumed from home page
- **Exam mode:** Timed, session resets on exit (with beforeunload warning), no persistence

### Session Persistence (`lib/practiceSession.ts`)

Uses `localStorage` with key pattern `practice-{rating}-{modeType}` to save:
- Current question index
- Answered questions
- Subject selection
- Timestamp

## Backend Structure (`faa-backend/`)

- Express REST API
- MongoDB for questions, progress tracking, user data
- Stripe integration for subscription billing
- Endpoints: `/api/subjects`, `/api/written`, `/api/oral`, `/api/exam`, `/api/progress`, `/api/billing`

## Billing

Stripe subscription with checkout sessions. Protected routes require active subscription via the `Protected` component with `requireSubscription` prop.

Access is granted while `subscriptionStatus` is `active` and `currentPeriodEnd` is in the future (or while `manualAccessEndsAt` is in the future). Both are kept in sync by the webhook at `POST /api/billing/webhook`.

Safeguards against duplicate charges and lost webhooks:

- **Checkout** (`POST /api/billing/checkout`) always uses a single Stripe customer per user: it reuses `stripeCustomerId`, otherwise an existing Stripe customer with the same email, otherwise creates one and stores it before redirecting. If that customer already has a live subscription in Stripe, the user record is synced from Stripe and checkout is refused.
- Every Checkout session carries the app user id (`client_reference_id`, `metadata.userId` and `subscription_data.metadata.userId`).
- **Webhook user lookup** tries `stripeCustomerId`, then `metadata.userId`, then the Stripe customer's email.
- Events for a subscription other than the one currently granting access are ignored (duplicates); once the linked subscription no longer grants access, a paid subscription on the same user takes over.
- If processing fails the webhook responds `500`, so Stripe retries the delivery.
- The webhook route connects to MongoDB itself (`ensureDB` in `src/app.ts`). It is mounted before the global middleware because it needs the raw body, and Stripe usually reaches a cold Vercel instance with no open connection.
