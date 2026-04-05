# PRD: Trial Expiry Conversion Nudge — Automated Upgrade CTA

**PRD ID:** prd-trial-expiry-conversion-nudge  
**Status:** ready  
**Version:** 1.0  
**Use Case:** feat-trial-conversion-nudge  
**Priority:** P1 (Revenue blocker)  
**Owner:** Product Manager (spec) → Dev → QC  
**Last Updated:** 2026-04-04

---

## Executive Summary

A `TrialStatusBanner` component already exists and renders for trial agents with ≤3 days remaining. However, its "Upgrade Now" CTA links to `/settings/billing` (a plan-selection page) instead of directly initiating a Stripe checkout session pre-filled with the Pro plan.

This creates unnecessary friction: the agent must re-select a plan they already decided to buy. The spec below closes that gap. The `POST /api/stripe/upgrade-checkout` endpoint already exists and returns a redirect URL — the only change is wiring the banner button directly to that endpoint.

**Expected outcome:** An agent with ≤3 days trial remaining sees a persistent amber banner, clicks one button, lands in Stripe checkout pre-filled with Pro plan, completes payment, and the banner disappears on their next dashboard load.

---

## 1. Current State

| Component | File | Behavior |
|-----------|------|----------|
| `TrialStatusBanner` | `components/dashboard/TrialStatusBanner.tsx` | Shows amber banner when `daysRemaining <= 3`. CTA → `/settings/billing` |
| `trial-status` API | `app/api/auth/trial-status/route.ts` | Returns `{ isTrial, isPilot, daysRemaining, isExpired, planTier }` |
| `upgrade-checkout` API | `app/api/stripe/upgrade-checkout/route.ts` | `POST { plan: 'pro' }` → `{ url: <stripe_checkout_url> }` |
| `UpgradeBanner` | `components/dashboard/UpgradeBanner.tsx` | Shows for `trial/pilot/null` plan tiers, links to `/settings/billing` |

**Gap:** The "Upgrade Now" button in `TrialStatusBanner` (and `UpgradeBanner`) must call `POST /api/stripe/upgrade-checkout` directly, not navigate to `/settings/billing`.

---

## 2. Requirements

### 2.1 Trigger Condition
Show the upgrade CTA banner when ALL of the following are true:
- `isTrial === true` (not pilot, not paid)
- `daysRemaining <= 3`
- `isExpired === false`

Show an **expired** state (separate UI) when:
- `isTrial === true` AND `isExpired === true`

Never show the banner when:
- `isTrial === false` AND `isPilot === false` (paid agents: starter/pro/team/brokerage)

### 2.2 CTA Behavior — Direct Stripe Checkout

When the agent clicks "Upgrade Now":
1. Button enters loading state (spinner, disabled)
2. Frontend calls `POST /api/stripe/upgrade-checkout` with body `{ plan: 'pro' }`
3. On success: `window.location.href = response.url` (Stripe-hosted checkout)
4. On error: show inline error message below the button. Do not navigate away.

**Do not use `<a href="/settings/billing">`.** The button must trigger a fetch + redirect.

### 2.3 Stripe Return URL
The `upgrade-checkout` API already sets `success_url` and `cancel_url`. Confirm these are set to:
- `success_url`: `{baseUrl}/dashboard?upgrade=success`
- `cancel_url`: `{baseUrl}/dashboard`

If not already set, the dev must update `app/api/stripe/upgrade-checkout/route.ts` to use these URLs.

### 2.4 Post-Payment Banner Dismissal
After successful Stripe payment, the Stripe webhook updates `plan_tier` from `'trial'` to `'pro'` in `real_estate_agents`. When the agent returns to `/dashboard?upgrade=success`:
- `TrialStatusBanner` re-fetches `/api/auth/trial-status`
- `isTrial` is now `false` → banner does not render

No additional "hide" logic needed — the banner naturally disappears because the API returns `isTrial: false` for paid agents. The dashboard should re-fetch trial status on mount (already does this via `useEffect`).

Show a success toast/message when `?upgrade=success` is present in the URL on the dashboard page.

### 2.5 UpgradeBanner (secondary)
`UpgradeBanner.tsx` also links to `/settings/billing`. Update it to also use the direct checkout path (same flow: call `POST /api/stripe/upgrade-checkout`, redirect). This is lower priority — focus on `TrialStatusBanner` first.

---

## 3. User Stories

```
As a trial agent with 3 days left,
I see an amber banner on my dashboard saying "Your trial ends in 3 days. Upgrade to keep your AI lead response running."
When I click "Upgrade Now", I am taken directly to a Stripe checkout page pre-filled with the Pro plan ($149/mo).
After I complete payment, I return to the dashboard and the amber banner is gone.

As a paid agent (Pro/Starter/Team),
I never see the upgrade CTA banner.

As a trial agent with 8 days left,
I see the green trial banner but NO upgrade CTA (the "Upgrade Now" button only appears at ≤3 days).
```

---

## 4. Acceptance Criteria

| # | Criterion | How to verify |
|---|-----------|---------------|
| AC-1 | Trial agent with `daysRemaining = 2` sees amber banner with "Upgrade Now" button on dashboard | Log in as trial agent with `trial_ends_at = now() + 2 days`; verify banner visible |
| AC-2 | "Upgrade Now" button calls `POST /api/stripe/upgrade-checkout` with `{ plan: 'pro' }` | Network tab: confirm POST request sent on button click |
| AC-3 | On success, browser redirects to Stripe checkout URL | Confirm `window.location.href` changes to `checkout.stripe.com/...` |
| AC-4 | Stripe checkout is pre-filled with Pro plan ($149/mo) | Confirm price ID in checkout URL matches `STRIPE_PRICE_PROFESSIONAL_MONTHLY` |
| AC-5 | After payment, returning to `/dashboard?upgrade=success` shows NO amber banner | Mock `plan_tier = 'pro'` in trial-status API; confirm banner absent |
| AC-6 | Agent with `plan_tier = 'pro'` never sees the banner | Confirm `/api/auth/trial-status` returns `isTrial: false`; confirm banner absent |
| AC-7 | API error during checkout shows inline error message, no navigation | Mock API returning 500; confirm error text appears in banner |
| AC-8 | Button shows loading/spinner state while waiting for checkout URL | Confirm button is disabled and shows loading indicator during fetch |

---

## 5. Technical Spec

### 5.1 Changes to `TrialStatusBanner.tsx`

Replace the current `<a href="/settings/billing">` anchor with a button:

```tsx
const [checkoutLoading, setCheckoutLoading] = useState(false)
const [checkoutError, setCheckoutError] = useState<string | null>(null)

async function handleUpgrade() {
  setCheckoutLoading(true)
  setCheckoutError(null)
  try {
    const res = await fetch('/api/stripe/upgrade-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro' }),
    })
    if (!res.ok) {
      const data = await res.json()
      setCheckoutError(data.error || 'Something went wrong. Please try again.')
      return
    }
    const { url } = await res.json()
    window.location.href = url
  } catch {
    setCheckoutError('Network error. Please try again.')
  } finally {
    setCheckoutLoading(false)
  }
}
```

Replace the CTA anchor:
```tsx
// BEFORE:
<a href="/settings/billing" className="...">Upgrade Now →</a>

// AFTER:
<button
  onClick={handleUpgrade}
  disabled={checkoutLoading}
  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
>
  {checkoutLoading ? (
    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
  ) : (
    'Upgrade Now →'
  )}
</button>
{checkoutError && (
  <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">{checkoutError}</p>
)}
```

### 5.2 Verify `upgrade-checkout` Route Config

In `app/api/stripe/upgrade-checkout/route.ts`, confirm the Stripe session is created with:
```typescript
success_url: `${baseUrl}/dashboard?upgrade=success`,
cancel_url: `${baseUrl}/dashboard`,
```
Update if these differ.

### 5.3 Dashboard Success Toast

In the dashboard page (`app/dashboard/page.tsx` or a client wrapper), when `searchParams.get('upgrade') === 'success'`:
- Show a success toast or banner: "You're now on Pro! Your AI lead response is fully active."
- Clear the query param after 5 seconds (or on dismiss)

This can be a simple client component — no new dependencies needed.

### 5.4 What NOT to change
- `TrialStatusBanner` display logic (the ≤3 day threshold, colors, messaging) — these are correct
- `trial-status` API — no changes needed
- `UpgradeBanner` — secondary; update only if the above is done with budget remaining
- Stripe webhook — already handles `plan_tier` update on payment completion

---

## 6. E2E Test Spec

**File:** `tests/e2e/feat-trial-conversion-nudge.test.js`

**Test cases:**
1. `TrialStatusBanner renders for trial agent with ≤3 days remaining` — mock API response, verify banner in DOM
2. `TrialStatusBanner does NOT render for paid agent` — mock `planTier = 'pro'`, verify banner absent
3. `TrialStatusBanner shows loading state on upgrade click` — click button, verify loading indicator
4. `upgrade-checkout API route exists and requires POST with plan` — check route file exists and accepts `plan` param
5. `upgrade-checkout API returns error on missing plan` — unit test the route handler
6. `TrialStatusBanner shows error on API failure` — mock fetch failure, verify error text appears

---

## 7. Out of Scope

- Trial expiry email reminders (separate UC: `uc-trial-to-paid-conversion-path`)
- Starter/Team plan CTAs (Pro is the default; plan selection remains at `/settings/billing`)
- Changes to the Stripe webhook handler
- New database columns or migrations

---

## 8. Definition of Done

- [ ] `TrialStatusBanner` "Upgrade Now" button calls `POST /api/stripe/upgrade-checkout` with `{ plan: 'pro' }` and redirects to returned URL
- [ ] Loading state shown while checkout URL fetches
- [ ] Inline error shown if API call fails
- [ ] Stripe return URLs configured as `success_url: /dashboard?upgrade=success`
- [ ] Dashboard shows success message on `?upgrade=success`
- [ ] Paid agents (`plan_tier` ∉ `['trial','pilot']`) never see the banner
- [ ] E2E test file created at `tests/e2e/feat-trial-conversion-nudge.test.js`
- [ ] All 6 E2E test cases pass
