# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- FAA A&P mechanic students use SkyMentor to study question banks, take written exams, and practise oral questions in Spanish or English.
- Administrators manage student accounts, subscription access, and Stripe-backed promotional coupons.

## Product Purpose

SkyMentor is a protected FAA A&P exam-training product. It helps students prepare for General, Airframe, and Powerplant examinations while giving administrators the controls needed to operate subscriptions and promotional offers.

## Positioning

The product combines bilingual FAA A&P written, figure, and oral-practice workflows with authenticated progress tracking and subscription-gated access.

## Operating Context

Students work through self-study, timed examination, and oral-practice routes after logging in. Administrators use protected operational pages to review clients and control access; the Coupons page extends that same administrative workspace with Stripe promotion management.

## Capabilities and Constraints

- The frontend is a Next.js App Router application with TypeScript and client-side authenticated API calls.
- User interface copy is maintained in Spanish and English through the in-app language context.
- Subscription checkout, discounts, and redemption eligibility are controlled by Stripe; the frontend must not calculate subscription totals.
- Coupon expiry dates are configured as calendar dates that remain redeemable through the end of the selected day.

## Brand Commitments

- Product name: SkyMentor FAA A&P Trainer.
- Existing SkyMentor logo asset: `public/brand/logo_1.png`.
- The established interface supports both light and dark themes and uses a compact, professional application UI for operational routes.

## Evidence on Hand

- Product and setup documentation: `README.md` and `../faa-backend/README.md`.
- Existing administrative interface: `src/app/clients/page.tsx`.
- Existing account and subscription interface: `src/app/profile/page.tsx`.
- Shared visual tokens and responsive styles: `src/app/globals.css`.

## Product Principles

- Keep examination practice focused and protected by authenticated subscription access.
- Make administrative controls direct, legible, and safe to operate.
- Preserve bilingual access to core workflows and administrative feedback.
- Use Stripe as the authority for payment and promotion eligibility.

## Accessibility & Inclusion

- Support Spanish and English user interfaces.
- Administrative workflows must remain keyboard-operable, provide clear status feedback, and preserve accessible labels and confirmations for consequential actions.
