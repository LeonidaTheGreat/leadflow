# PRD: Landing Page Urgency & Scarcity Mechanism
**UC:** fix-no-urgency-or-scarcity-mechanism  
**Priority:** 2 | **Status:** Implemented (PR #1314)  
**PM Review Date:** 2026-04-25

## Problem
The Next.js landing page had no urgency or scarcity signals. The HTML prototype had an urgency banner ("Only 10 pilot spots remaining for Q1 2026. Join today to lock in 20% lifetime pricing.") — the production app lacked the equivalent, giving visitors zero reason to sign up today vs. tomorrow.

## Solution Implemented (PR #1314)
1. **Urgency banner** — full-width teal gradient strip at page top, before the header:
   - Copy: "🎯 Limited Pilot Spots: Only 10 spots remaining. Join today to lock in 20% lifetime pricing."
   - CTA: "Apply Now →" → `/pilot`
   - `data-testid="urgency-banner"` for test targeting
2. **Outcome cards** — replaced unverifiable fake testimonials with stat-based outcome cards:
   - ⚡ `<30s` Response Time
   - 📅 `3x` More Appointments Booked (disclaimer: individual outcomes vary)
   - 🏆 `24/7` Always-On Coverage
3. **CTA link fix** — pricing card CTAs now point to `/signup/trial` (was `/signup?plan=...`)

## Acceptance Criteria (Verified ✅)
- [x] `data-testid="urgency-banner"` present on landing page
- [x] Banner mentions limited pilot spots
- [x] Banner mentions pricing lock-in incentive
- [x] Banner links to pilot signup (`/pilot`)
- [x] Banner appears before main header (first thing seen on page)

## Test Coverage
- `tests/e2e/fix-no-urgency-or-scarcity-mechanism.test.js` — 5 tests, 5 passing

## Notes
- Scarcity is messaging-driven (static "10 spots"), not backend-enforced. Acceptable for current phase.
- `TestimonialCard` function still defined in page.tsx but no longer used — minor dead code.
- "3x appointments" stat has no source data; disclaimer is present. Monitor if this becomes a trust issue.
