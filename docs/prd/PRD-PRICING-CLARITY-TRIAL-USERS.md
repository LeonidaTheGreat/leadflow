# PRD: Pricing Clarity for Trial Users

**ID:** prd-pricing-clarity-trial-users  
**UC:** uc-revenue-pricing-clarity  
**Status:** approved  
**Priority:** P1 (revenue-critical — unblocks trial-to-paid conversion)  
**Authored:** 2026-04-05

---

## Problem

Trial users don't understand what they would pay when the trial ends. This creates:
1. Surprise at billing time → churn
2. No urgency to convert → passive expiry
3. No clear path from "trying" to "subscribing"

Target: 90% of trial users can articulate what they would pay, before their trial expires.

---

## User Stories

1. **Day 5 trial user** sees a countdown banner on the dashboard with days remaining and a "See pricing" CTA.
2. **Day 10 trial user** sees a full pricing table surfaced on the dashboard, with their recommended plan highlighted.
3. Any trial user who clicks "Upgrade" lands on Stripe checkout with the plan pre-filled.
4. Conversion events (viewed pricing, clicked upgrade, completed checkout) are tracked in the `events` table.

---

## Scope

### 1. Trial Status Banner (`TrialStatusBanner`)

Component: `product/lead-response/dashboard/components/dashboard/TrialStatusBanner.tsx`

**Requirements:**
- Show for all agents in trial status (`subscriptions.status = 'trialing'`)
- Display: days remaining countdown (e.g. "7 days left in your trial")
- Display: plan recommendation with price (e.g. "Pro plan — $149/mo")
- CTA: "See all plans" → `/dashboard/pricing`
- CTA: "Upgrade now" (day 8+) → Stripe checkout, plan pre-filled to recommended tier
- Visual urgency: amber warning when ≤5 days, red when ≤2 days

**Banner content must include:**
- Exact price: `$149` (Pro, recommended for solo agents)
- "See all plans" link text
- Days remaining countdown

### 2. Pricing Page (`/dashboard/pricing`)

Route: `product/lead-response/dashboard/app/dashboard/pricing/page.tsx`  
Test ID: `data-testid="pricing-page"`

**Requirements:**
- Show all 4 tiers in a comparison table:
  - Starter: $49/mo — 100 SMS, basic AI
  - Pro: $149/mo — unlimited SMS, full AI *(recommended for trial users)*
  - Team: $399/mo — 5 agents
  - Brokerage: $999+/mo — white-label
- Highlight recommended tier based on agent's usage during trial
- Each tier: "Choose plan" CTA → Stripe checkout pre-filled
- Trial-specific messaging: "You're currently on a free trial. Choose a plan to continue."

### 3. Onboarding Pricing Mention

Location: `product/lead-response/dashboard/app/dashboard/onboarding/`

**Requirements:**
- On the final onboarding step (after FUB connected + first lead handled), surface pricing teaser: "Plans start at $49/mo. Upgrade any time during your trial."
- Do not gate or block onboarding — this is a soft nudge only.

### 4. Conversion Event Tracking

Table: `events`  
Events to fire:
- `trial_pricing_viewed` — when agent opens `/dashboard/pricing`
- `trial_upgrade_clicked` — when agent clicks any "Upgrade now" / "Choose plan" CTA
- `trial_checkout_started` — when Stripe checkout session created from trial flow

Schema: `{ event_type, agent_id, metadata: { plan, source, days_remaining }, created_at }`

---

## Acceptance Criteria

| # | Criterion | Verifiable |
|---|-----------|-----------|
| 1 | `TrialStatusBanner` shows `$149` | `grep -c "$149" TrialStatusBanner.tsx >= 1` |
| 2 | `TrialStatusBanner` has "See all plans" link | `grep -c "See all plans" TrialStatusBanner.tsx >= 1` |
| 3 | Pricing page exists at correct path | `test -f app/dashboard/pricing/page.tsx` |
| 4 | Pricing page has `data-testid="pricing-page"` | `grep -c 'data-testid="pricing-page"' pricing/page.tsx >= 1` |
| 5 | Onboarding mentions starting price | `grep -rl "plans start at" onboarding/ \| wc -l >= 1` |
| 6 | Checkout pre-fills plan from pricing page | E2E: click Pro → checkout has `price_id` for Pro |
| 7 | `trial_pricing_viewed` event fires | E2E: navigate to /dashboard/pricing → event in DB |

---

## Out of Scope

- Changing pricing tiers or amounts (that's a separate business decision)
- Email-based pricing notifications (covered by `uc-active-trial-conversion-email`)
- A/B testing pricing display variants

---

## E2E Test Plan

**File:** `tests/e2e/pricing-clarity.spec.ts`

Test scenarios (agent in trial state):
1. `[trial-banner]` Dashboard loads → TrialStatusBanner visible with days remaining + price
2. `[see-plans-nav]` Click "See all plans" → navigates to `/dashboard/pricing`
3. `[pricing-page]` Pricing page shows all 4 tiers with correct prices
4. `[upgrade-cta]` Click "Choose plan" on Pro → Stripe checkout opens with plan pre-filled
5. `[event-tracking]` After viewing pricing page → `trial_pricing_viewed` event in DB
6. `[day-5-urgency]` Agent with 5 days left sees amber banner
7. `[day-2-urgency]` Agent with 2 days left sees red banner

---

## Implementation Notes for Dev

- Check `subscriptions` table for `status='trialing'` and `trial_end` timestamp to compute days remaining
- Use existing Stripe checkout creation pattern in `app/api/stripe/create-checkout/route.ts`
- Banner component should reuse the existing `TrialStatusBanner` if it exists, or create new one
- Keep pricing page client-side rendered (no SSR needed — requires auth anyway)
- The `$149` price and tier names are sourced from `CLAUDE.md` pricing section — do not hardcode differently

---

## Definition of Done

- [ ] `TrialStatusBanner` shows countdown, price ($149), and "See all plans" CTA
- [ ] `/dashboard/pricing` page exists with all 4 tiers + upgrade CTAs
- [ ] Onboarding final step has pricing mention ("Plans start at $49/mo")
- [ ] Stripe checkout pre-fills plan on click
- [ ] 3 conversion events tracked in `events` table
- [ ] All 5 acceptance_checks pass
- [ ] E2E tests in `tests/e2e/pricing-clarity.spec.ts` cover 7 scenarios
