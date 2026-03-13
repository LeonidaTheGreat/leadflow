# PRD: Fix Pricing — Correct 10x Price Error in BillingCard and Checkout

**PRD ID:** PRD-FIX-PRICING-CORRECTION  
**Use Case:** fix-pricing-shows-497-997-1997-instead-of-49  
**Priority:** High  
**Status:** approved  
**Created:** 2026-03-08  
**Author:** Product Manager  

---

## 1. Problem Statement

BillingCard.tsx and the create-checkout API route display and charge prices that are exactly 10x the intended amounts defined in PMF.md. A customer who clicks "upgrade" is shown — and potentially charged — $497, $997, or $1,997/month instead of the correct $49, $149, or $399/month.

**Additionally**, the tier keys in the checkout route (`starter`, `professional`, `enterprise`) differ from the canonical PMF.md tier names (`starter`, `pro`, `team`), creating future maintenance confusion.

---

## 2. Root Cause

### File: `product/lead-response/dashboard/components/billing/BillingCard.tsx` (lines 133–135)

```tsx
{billingInfo.planTier === 'starter' && '$497/month'}      // ❌ should be $49/month
{billingInfo.planTier === 'professional' && '$997/month'}  // ❌ should be $149/month
{billingInfo.planTier === 'enterprise' && '$1,997/month'}  // ❌ should be $399/month
```

### File: `product/lead-response/dashboard/app/api/billing/create-checkout/route.ts` (lines 10–39)

```ts
const PRICING_TIERS = {
  starter_monthly:      { amount: 49700  }, // ❌ should be 4900 cents ($49)
  starter_annual:       { amount: 497000 }, // ❌ should be 47040 cents ($39.20/mo × 12)
  professional_monthly: { amount: 99700  }, // ❌ should be 14900 cents ($149)
  professional_annual:  { amount: 997000 }, // ❌ should be 143040 cents
  enterprise_monthly:   { amount: 199700 }, // ❌ should be 39900 cents ($399)
  enterprise_annual:    { amount: 1997000},// ❌ should be 383040 cents
}
```

Also: tier keys use `professional`/`enterprise` but canonical names are `pro`/`team`.

---

## 3. Correct Pricing (from PMF.md — Source of Truth)

| Tier | Monthly Price | Stripe Amount (cents) | Canonical Key |
|------|-------------|----------------------|---------------|
| Starter | $49/mo | 4900 | `starter` |
| Pro | $149/mo | 14900 | `pro` |
| Team | $399/mo | 39900 | `team` |
| Brokerage | $999+/mo | 99900 | `brokerage` |

---

## 4. Requirements

### FR-1: Fix BillingCard display prices
- `planTier === 'starter'` → display `$49/month`
- `planTier === 'professional'` OR `planTier === 'pro'` → display `$149/month`
- `planTier === 'enterprise'` OR `planTier === 'team'` → display `$399/month`
- Support both old (`professional`, `enterprise`) and new (`pro`, `team`) keys during migration to avoid display breaks for any existing subscribers

### FR-2: Fix create-checkout/route.ts amounts
- `starter_monthly` amount: **4900** cents ($49.00)
- `professional_monthly` / `pro_monthly` amount: **14900** cents ($149.00)
- `enterprise_monthly` / `team_monthly` amount: **39900** cents ($399.00)
- Annual amounts should reflect the correct monthly base × 12 (or a discounted annual rate — use monthly × 12 if no annual discount is defined)

### FR-3: Align tier naming (non-breaking)
- Add `pro` and `team` as canonical tier keys in PRICING_TIERS
- Keep `professional` and `enterprise` as aliases pointing to the same amounts (backwards compatibility)
- Update `getPlanDisplayName()` in BillingCard to map both key sets:
  - `pro` | `professional` → "Pro Plan"
  - `team` | `enterprise` → "Team Plan"

### FR-4: No Stripe price IDs changed
- Do NOT change Stripe price IDs — those are environment variables and must remain untouched
- Only the **display strings** and **`amount` fields** (used for display and validation) are in scope

---

## 5. Files to Change

| File | Change |
|------|--------|
| `product/lead-response/dashboard/components/billing/BillingCard.tsx` | Fix price display strings (lines 133–135); update `getPlanDisplayName()` |
| `product/lead-response/dashboard/app/api/billing/create-checkout/route.ts` | Fix `amount` values in PRICING_TIERS; add `pro`/`team` aliases |

---

## 6. Out of Scope

- No changes to Stripe product/price configuration
- No changes to Stripe environment variables (`STRIPE_PRICE_*`)
- No changes to database tier values in the `agents` table
- No changes to any other billing component

---

## 7. Acceptance Criteria

1. **BillingCard shows correct prices:** An agent on the Starter plan sees `$49/month`, Pro sees `$149/month`, Team sees `$399/month`
2. **Checkout amounts correct:** The `amount` field in PRICING_TIERS is 4900 / 14900 / 39900 for monthly tiers
3. **No regressions:** Existing plan tier keys (`starter`, `professional`, `enterprise`) still work without errors
4. **Build passes:** `npm run build` in the dashboard directory succeeds with no TypeScript errors
5. **Code committed to git:** Changes are committed on a branch and PR opened

---

## 8. E2E Test Plan

### Test 1: BillingCard — Starter Plan Display
- Log in as an agent with `plan_tier = 'starter'`
- Navigate to Settings → Billing
- **Assert:** Page displays `$49/month`
- **Assert:** Does NOT display `$497/month`

### Test 2: BillingCard — Pro Plan Display
- Log in as an agent with `plan_tier = 'professional'` or `'pro'`
- Navigate to Settings → Billing
- **Assert:** Page displays `$149/month`
- **Assert:** Does NOT display `$997/month`

### Test 3: BillingCard — Team Plan Display
- Log in as an agent with `plan_tier = 'enterprise'` or `'team'`
- Navigate to Settings → Billing
- **Assert:** Page displays `$399/month`
- **Assert:** Does NOT display `$1,997/month`

### Test 4: Checkout Amount Validation
- Review `create-checkout/route.ts` PRICING_TIERS constants
- **Assert:** `starter_monthly.amount === 4900`
- **Assert:** `professional_monthly.amount === 14900` OR `pro_monthly.amount === 14900`
- **Assert:** `enterprise_monthly.amount === 39900` OR `team_monthly.amount === 39900`

### Test 5: Build Health
- Run `npm run build` in `product/lead-response/dashboard`
- **Assert:** Zero TypeScript errors
- **Assert:** Zero build failures
