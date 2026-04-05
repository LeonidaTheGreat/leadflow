# Completion Report: Trial Expiry Conversion Nudge

**Task ID:** dbe603b1-9dc9-48d6-acdd-c8a2c301173e
**Status:** completed
**Branch:** dev/dbe603b1-dev-feat-trial-conversion-nudge-trial-ex

## Summary

Implemented the Trial Expiry Conversion Nudge feature per PRD-TRIAL-EXPIRY-CONVERSION-NUDGE. The "Upgrade Now" CTA in `TrialStatusBanner` now calls `POST /api/stripe/upgrade-checkout` directly with `{ plan: 'pro' }` instead of linking to `/settings/billing`.

## Changes Made

### Files Modified
- `product/lead-response/dashboard/components/dashboard/TrialStatusBanner.tsx` — Replaced `<a href="/settings/billing">` with a button that calls `/api/stripe/upgrade-checkout` directly. Added loading state (spinner), inline error display, and `handleUpgrade()` function.
- `product/lead-response/dashboard/components/dashboard/UpgradeBanner.tsx` — Same upgrade: replaced `Link href="/settings/billing"` with a button calling `/api/stripe/upgrade-checkout` directly. Added loading/error state.
- `product/lead-response/dashboard/app/api/stripe/upgrade-checkout/route.ts` — Updated `success_url` from `/settings/billing?upgrade=success` to `/dashboard?upgrade=success`, and `cancel_url` from `/settings/billing?upgrade=cancelled` to `/dashboard`.
- `product/lead-response/dashboard/app/dashboard/page.tsx` — Added `UpgradeSuccessToast` import and rendered it wrapped in `<Suspense>`.
- `product/lead-response/dashboard/__tests__/upgrade-checkout.test.ts` — Fixed pre-existing broken mock (`supabaseAdmin` was not exported from mock, only `createClient`). Updated `success_url` assertion. Added `cancel_url` test. Fixed JWT invalid token error message assertion.

### Files Created
- `product/lead-response/dashboard/components/dashboard/UpgradeSuccessToast.tsx` — Client component that shows a success toast when `?upgrade=success` query param is present. Dismisses after 5 seconds or on click, clears the query param.
- `tests/e2e/feat-trial-conversion-nudge.test.js` — 30 E2E tests covering all 6 PRD test cases.

## Test Results

- E2E tests: 30/30 passed
- upgrade-checkout unit tests: 13/13 passed (was 9 failing before fix)
- Overall test suite: improved from 113 failing to 104 failing (9 fewer failures)
- Build: passes (`next build` succeeds)

## Acceptance Criteria

| # | Criterion | Status |
|---|-----------|--------|
| AC-1 | Trial agent with daysRemaining=2 sees amber banner with "Upgrade Now" button | Verified (existing logic, button wired) |
| AC-2 | "Upgrade Now" calls POST /api/stripe/upgrade-checkout with { plan: 'pro' } | Implemented |
| AC-3 | On success, browser redirects to Stripe checkout URL | Implemented via window.location.href |
| AC-4 | Stripe checkout pre-filled with Pro plan | Verified — route uses STRIPE_PRICE_PROFESSIONAL_MONTHLY |
| AC-5 | After payment, /dashboard?upgrade=success shows NO amber banner | Banner disappears naturally (isTrial=false after payment) |
| AC-6 | Paid agent never sees banner | Unchanged logic; verified guard exists |
| AC-7 | API error shows inline error, no navigation | Implemented |
| AC-8 | Button shows loading/spinner during fetch | Implemented with Loader2 + disabled state |
