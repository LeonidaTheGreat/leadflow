# Product Review: Pricing Clarity for Trial Users

**Task:** fa4a87bf-80dd-459f-8f3f-c8e3baa192d2  
**Review:** 70c13121-f5ce-43bc-9ee7-cc59057df7d3  
**PRD:** prd-pricing-clarity-trial-users  
**Date:** 2026-07-18  
**Verdict:** pass_with_issues  
**Readiness Score:** 72/100

---

## Acceptance Criteria Results

| # | Criterion | Result |
|---|-----------|--------|
| 1 | TrialStatusBanner shows `$149` | PASS (3 occurrences) |
| 2 | TrialStatusBanner has "See all plans" link | PASS |
| 3 | Pricing page exists at `app/dashboard/pricing/page.tsx` | PASS |
| 4 | Pricing page has `data-testid="pricing-page"` | PASS |
| 5 | Onboarding mentions "Plans start at $49/mo" | PASS (intent — capital P) |
| 6 | Checkout pre-fills plan on CTA click | PASS |
| 7 | `trial_pricing_viewed` event fires on pricing page mount | PASS |

All 7 criteria pass. AC#5 has a case mismatch (code uses capital "P") that causes the literal grep to return 0 — intent is fully met.

---

## Findings

### Medium — Feature count inconsistency between signup and dashboard pricing pages

Signup plan cards show: Starter=50 leads, Pro=200 leads, Team=500 leads.  
Dashboard pricing page shows: Starter=100 SMS/mo, Pro=Unlimited SMS, Team=5 agents.

Users who see both pages (sign up, then visit `/dashboard/pricing`) will see contradictory feature lists for the same plan names. This erodes trust at the moment of conversion decision.

**Fix:** Extract `PRICING_TIERS` to a shared lib constant and import in both `app/onboarding/page.tsx` and `app/dashboard/pricing/page.tsx`.

### Medium — Protected pages not visually verifiable (UX screenshots show login redirect)

Screenshots for `/dashboard`, `/dashboard/pricing`, and `/settings` all captured the login page because the screenshot system runs unauthenticated. The trial banner and in-app pricing UX could not be visually confirmed.

**Fix:** Add authenticated session token support to the UX screenshot capture pipeline.

### Low — Recommended tier hardcoded to Pro, not usage-based

PRD requires the recommended tier to reflect agent trial usage. Current code hardcodes `recommended: true` on Pro. Acceptable for MVP but misses personalization opportunity.

### Low — AC#5 case sensitivity

Code: `Plans start at $49/mo` (capital P). Acceptance grep: `"plans start at"` (lowercase). Literal grep returns 0. Update code to lowercase or add `-i` to the AC grep.

---

## UX Evaluation

| Page | Result | Notes |
|------|--------|-------|
| Landing (`/`) | PASS | Professional, strong hero, stats, social proof, pricing visible |
| Signup (`/signup`) | PASS | Clean 3-step flow, Pro highlighted as Most Popular |
| Login (`/login`) | PASS | Minimal, no friction |
| Dashboard (`/dashboard`) | UNABLE — login redirect | Unauthenticated screenshot |
| Pricing (`/dashboard/pricing`) | UNABLE — login redirect | Unauthenticated screenshot |
| Settings (`/settings`) | UNABLE — login redirect | Unauthenticated screenshot |
| Simulator (`/admin/simulator`) | PASS | Clean two-panel layout, appropriately labeled admin-only |

---

## Orchestration Dashboard

`http://127.0.0.1:8787/dashboard.html` — HTTP 200, responsive. ✅

---

## Action Items for Owner

1. **(P2) Align signup and dashboard pricing feature lists** — single source of truth for PRICING_TIERS constant
2. **(P2) Add authenticated UX screenshot capture** — review pipeline can't verify protected pages
3. **(P3) Fix AC#5 case sensitivity** — lowercase "plans start at" in code or grep
4. **(P3) Usage-based plan recommendation** — post first paying customer, personalize recommended tier from trial usage data
