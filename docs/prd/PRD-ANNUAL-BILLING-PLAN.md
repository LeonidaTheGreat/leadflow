# PRD: Annual Billing Plan — 2 Months Free, Cash Upfront

**Document Type:** Product Requirements Document
**Status:** Ready for Development
**Date:** 2026-04-29
**Author:** Product Manager
**Priority:** P1 - Revenue Acceleration
**Use Case:** feat-annual-billing-plan

---

## 1. Executive Summary

### Problem Statement
LeadFlow has $0 MRR on Day 79 of a 90-day target. Annual billing accelerates cash collection per conversion (1 annual Pro = $1,490 vs $149/mo) and locks in 12 months of retention. The pricing page already shows an annual toggle with "Save 2 months" messaging, and the checkout API accepts annual tiers — but the backend has gaps that would assign the wrong plan tier to annual subscribers and the billing settings page has no annual support.

### What Already Works
| Component | Annual Support | Status |
|-----------|---------------|--------|
| Pricing page (`/pricing`) | Monthly/annual toggle, "Save 2 months" badge | Working |
| Checkout API (`/api/billing/create-checkout`) | Accepts `*_annual` tiers, maps to env vars | Working |
| `checkout_sessions` table | `interval` column (month/year) | Working |
| `subscriptions` table | `interval` column (month/year) | Working |
| `calculateMRR()` in webhook | Divides annual by 12 | Working |

### What's Broken or Missing
| Component | Gap | Impact |
|-----------|-----|--------|
| `getTierFromPriceId()` in webhook handler | Only maps monthly price IDs; annual falls through to default `'professional'` | Annual subscribers get wrong `plan_tier` in DB |
| Billing settings page (`/settings/billing`) | Monthly-only prices, no annual toggle, no renewal date | Annual subscribers see confusing billing info |
| Upgrade checkout route (`/api/stripe/upgrade-checkout`) | Only maps to monthly price IDs | Pilot-to-paid upgrade can't select annual |
| Stripe dashboard | Annual Price objects may not exist yet | Checkout would fail with invalid price ID |
| Confirmation email | Shows "$X/month" regardless of interval | Confusing receipt for annual payers |
| E2E tests | No annual checkout coverage | Regressions undetected |

### Revenue Impact
Even 1 annual Pro conversion = $1,490 immediate cash (vs $149 from monthly). Annual churn rate is near-zero for 12 months. At the current 0 paying customers, any conversion mechanism that increases average deal value is high-leverage.

---

## 2. Pricing Matrix

| Tier | Monthly | Annual | Annual /mo Equiv | Savings |
|------|---------|--------|------------------|---------|
| Starter | $49/mo | $490/yr | $40.83/mo | $98 (2 months) |
| Pro | $149/mo | $1,490/yr | $124.17/mo | $298 (2 months) |
| Team | $399/mo | $3,990/yr | $332.50/mo | $798 (2 months) |
| Brokerage | $999+/mo | Contact sales | N/A | N/A |

These prices are already defined in `PRICING_TIERS` in `create-checkout/route.ts` (lines 26-33). No code change needed for the amounts.

---

## 3. Requirements

### 3.1 Stripe Setup (Manual — Not Code)

**AC-STRIPE-1:** Create annual Price objects in Stripe Dashboard for each tier:
- Starter Annual: $490/year, recurring, `interval=year`
- Pro Annual: $1,490/year, recurring, `interval=year`
- Team Annual: $3,990/year, recurring, `interval=year`

**AC-STRIPE-2:** Set Vercel env vars with the Stripe Price IDs:
- `STRIPE_PRICE_STARTER_ANNUAL=price_xxx`
- `STRIPE_PRICE_PRO_ANNUAL=price_xxx`
- `STRIPE_PRICE_TEAM_ANNUAL=price_xxx`

**Verification:** `STRIPE_PRICE_*_ANNUAL` env vars are set in Vercel project settings for both `leadflow-ai` and `fub-inbound-webhook`.

### 3.2 Webhook Handler Fix — `getTierFromPriceId()`

**File:** `product/lead-response/dashboard/app/api/webhooks/stripe/route.ts`

**Current bug (lines 41-46):**
```typescript
function getTierFromPriceId(priceId: string): string {
  const tierMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY || '']: 'starter',
    [process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || '']: 'pro',
    [process.env.STRIPE_PRICE_TEAM_MONTHLY || '']: 'team' }
  return tierMap[priceId] || 'professional'
}
```

**Required change:** Add annual price ID mappings to `tierMap`:
```typescript
function getTierFromPriceId(priceId: string): string {
  const tierMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY || '']: 'starter',
    [process.env.STRIPE_PRICE_STARTER_ANNUAL || '']: 'starter',
    [process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || '']: 'pro',
    [process.env.STRIPE_PRICE_PRO_ANNUAL || '']: 'pro',
    [process.env.STRIPE_PRICE_TEAM_MONTHLY || '']: 'team',
    [process.env.STRIPE_PRICE_TEAM_ANNUAL || '']: 'team',
  }
  return tierMap[priceId] || 'pro'
}
```

**AC-WEBHOOK-1:** Annual price IDs resolve to correct tier (starter/pro/team), not the fallback default.
**AC-WEBHOOK-2:** `subscription.interval` is stored as `'year'` in the `subscriptions` table (already handled by line 118 — no change needed).
**AC-WEBHOOK-3:** `calculateMRR()` already divides annual by 12 (line 30) — verify, no change needed.

### 3.3 Confirmation Email — Annual-Aware

**File:** `product/lead-response/dashboard/app/api/webhooks/stripe/route.ts`, `handleCheckoutComplete()`

**Current behavior (line 190):** Email shows `$${mrr}/month` regardless of billing interval.

**Required change:** Detect interval from subscription and adjust email copy:
- Monthly: "Price: $149/month"
- Annual: "Price: $1,490/year ($124.17/mo equivalent)"
- Show renewal date: next billing = `current_period_end` (12 months out for annual)

**AC-EMAIL-1:** Confirmation email for annual subscribers shows annual price and "/year" suffix.
**AC-EMAIL-2:** Email shows correct renewal date (12 months out, not 1 month).

### 3.4 Billing Settings Page — Annual Support

**File:** `product/lead-response/dashboard/app/settings/billing/page.tsx`

**Current gaps:**
1. Plan cards only show monthly prices (lines 15-38).
2. No monthly/annual toggle.
3. No renewal date display for any subscriber type.
4. Upgrade button calls `create-checkout-session` (legacy) which is monthly-only.

**Required changes:**

**AC-BILLING-1:** Add monthly/annual toggle (same style as pricing page).
**AC-BILLING-2:** Plan cards show prices for the selected interval (monthly or annual with "/yr" and savings badge).
**AC-BILLING-3:** For active subscribers, show:
- Current plan name and interval (e.g. "Pro - Annual")
- Next renewal date (from `subscriptions.current_period_end`)
- Monthly equivalent if on annual plan
**AC-BILLING-4:** Upgrade buttons use `/api/billing/create-checkout` (robust route) instead of `/api/billing/create-checkout-session` (legacy), passing the correct `tier` with interval suffix (e.g. `pro_annual`).
**AC-BILLING-5:** Fetch subscription details from a new or existing API endpoint that returns `interval` and `current_period_end`.

### 3.5 Upgrade Checkout Route — Annual Support

**File:** `product/lead-response/dashboard/app/api/stripe/upgrade-checkout/route.ts`

**Current gap (lines 15-18):** `PLAN_PRICE_IDS` only maps to monthly price IDs. No way to pass `interval=annual`.

**Required changes:**

**AC-UPGRADE-1:** Accept `interval` parameter in request body: `{ plan: 'pro', interval: 'annual' }`. Default to `'monthly'` if omitted (backward compatible).
**AC-UPGRADE-2:** Map `plan + interval` to correct Stripe Price ID from env vars:
```typescript
const PLAN_PRICE_IDS: Record<string, Record<string, string>> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL || '',
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || '',
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL || '',
  },
  team: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
    annual: process.env.STRIPE_PRICE_TEAM_ANNUAL || '',
  },
}
```
**AC-UPGRADE-3:** Log `interval` in `subscription_attempts` table (uses existing `tier` column — store as `pro_annual` or add separate column if needed).

### 3.6 Pricing Page Verification

**File:** `product/lead-response/dashboard/app/pricing/page.tsx`

The pricing page already fully supports annual billing:
- Monthly/annual toggle (line 279-303)
- "Save 2 months" badge (line 299)
- Annual prices defined per tier (lines 32, 49, 66, 84)
- Sends `${baseTierKey}_${interval}` to checkout API (line 207)
- Shows per-month equivalent for annual (line 309)
- Shows annual total and savings (line 345)

**AC-PRICING-1:** No changes needed. Verify existing annual flow still works after backend changes (regression test).

---

## 4. User Stories

### US-1: New visitor selects annual plan from pricing page
**As a** real estate agent visiting the pricing page,
**I want to** toggle to annual billing and see the 2-months-free savings,
**So that** I can pay upfront for a year at a discount.

**Flow:** `/pricing` -> toggle "Annual" -> click "Start Free Trial" on Pro -> Stripe Checkout with `price_id` for Pro Annual ($1,490/yr) -> webhook fires -> `plan_tier=pro`, `subscription.interval=year`, `mrr=124.17` -> confirmation email shows "$1,490/year" -> redirected to dashboard.

### US-2: Pilot agent upgrades to annual plan from billing settings
**As a** pilot agent whose trial is ending,
**I want to** choose annual billing from my billing settings page,
**So that** I save 2 months and commit for the year.

**Flow:** `/settings/billing` -> toggle "Annual" -> click "Upgrade to Pro" -> `/api/stripe/upgrade-checkout` with `{ plan: 'pro', interval: 'annual' }` -> Stripe Checkout -> webhook -> same DB updates as US-1.

### US-3: Annual subscriber views billing status
**As an** annual Pro subscriber,
**I want to** see my renewal date and annual price in billing settings,
**So that** I know when I'll be charged next.

**Flow:** `/settings/billing` -> fetches subscription data -> shows "Pro - Annual", "$1,490/year ($124.17/mo)", "Renews: April 29, 2027".

---

## 5. Acceptance Criteria (Summary)

| ID | Criterion | Verification |
|----|-----------|-------------|
| AC-STRIPE-1 | Annual Price objects exist in Stripe | Check Stripe Dashboard |
| AC-STRIPE-2 | Vercel env vars set for annual price IDs | Check Vercel project settings |
| AC-WEBHOOK-1 | `getTierFromPriceId()` resolves annual IDs to correct tier | Unit test: mock env vars, call with annual price ID, assert returns correct tier |
| AC-WEBHOOK-2 | `subscriptions.interval` = `'year'` for annual | Check DB after annual checkout |
| AC-WEBHOOK-3 | MRR calculated correctly (annual / 12) | Unit test: annual $1,490 -> MRR $124.17 |
| AC-EMAIL-1 | Confirmation email shows annual price with "/year" | Manual test or email preview |
| AC-EMAIL-2 | Email shows 12-month renewal date | Manual test |
| AC-BILLING-1 | Billing settings has monthly/annual toggle | Visual check |
| AC-BILLING-2 | Plan cards show annual prices when toggled | Visual check |
| AC-BILLING-3 | Active subscribers see plan interval + renewal date | Visual check with test data |
| AC-BILLING-4 | Upgrade button uses robust checkout route with interval | Code review + integration test |
| AC-BILLING-5 | Subscription details fetched and displayed | API response check |
| AC-UPGRADE-1 | Upgrade route accepts `interval` param | Integration test |
| AC-UPGRADE-2 | Correct annual price ID passed to Stripe | Stripe test-mode checkout |
| AC-UPGRADE-3 | Interval logged in subscription_attempts | DB check |
| AC-PRICING-1 | Existing pricing page annual flow still works | E2E test |

---

## 6. E2E Test Specification

**Test: Annual checkout creates yearly subscription in Stripe test mode**

```
1. Navigate to /pricing
2. Click "Annual" toggle
3. Verify "Save 2 months" badge visible
4. Verify Pro card shows $124/mo equivalent and "$1,490/year" annotation
5. Click "Start Free Trial" on Pro card
6. (Mock/intercept) Verify POST /api/billing/create-checkout body contains tier="pro_annual"
7. (Mock/intercept) Verify Stripe Checkout session created with annual price ID
8. Simulate checkout.session.completed webhook with annual subscription
9. Verify real_estate_agents.plan_tier = 'pro'
10. Verify subscriptions.interval = 'year'
11. Verify subscriptions.current_period_end is ~12 months from now
12. Verify MRR = 124.17 (1490/12)
```

**Test: Monthly checkout regression**
```
1. Navigate to /pricing (default = monthly)
2. Click "Start Free Trial" on Pro card
3. Verify POST body contains tier="pro_monthly"
4. Simulate webhook — verify plan_tier='pro', interval='month', MRR=149
```

---

## 7. Out of Scope

- **Plan switching (monthly <-> annual mid-subscription):** Handled by Stripe Customer Portal. No custom code needed — Stripe prorates automatically.
- **Annual-specific refund policy:** Use Stripe's default refund handling for now.
- **Brokerage tier annual:** Remains contact-sales only.
- **Coupon/promo codes for annual:** Already supported via `allow_promotion_codes: true` in checkout session.
- **Annual trial period changes:** Same 14-day trial for both monthly and annual.

---

## 8. Implementation Order (for dev agent)

1. **Webhook fix** (`getTierFromPriceId` + email) — highest risk, must be correct before any annual checkout happens
2. **Upgrade checkout route** — add `interval` param support
3. **Billing settings page** — annual toggle + renewal date display
4. **E2E tests** — annual checkout + monthly regression
5. **Stripe setup + Vercel env vars** — manual step, done by human

---

## 9. Risks

| Risk | Mitigation |
|------|-----------|
| Annual price IDs not created in Stripe | `isValidPriceId()` rejects placeholder strings; checkout returns 503 with clear error message |
| Env vars not set in Vercel | Same guard — 503 + logged error naming the missing env var |
| `getTierFromPriceId` empty-string key collision | Both monthly and annual env vars unset -> two `'': 'tier'` entries. Low risk since checkout itself would fail first (no valid price ID). Add defensive `delete tierMap['']` if paranoid. |
| Upgrade-checkout backward compat | Default `interval` to `'monthly'` if omitted — existing callers unaffected |
