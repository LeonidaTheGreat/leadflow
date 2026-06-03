# Completion Report: Trial-to-Paid Conversion Nudge

**Task ID:** 917f397c-a1ce-44b5-bd2a-1dcf85e8a4b4
**Status:** completed
**Branch:** dev/917f397c-dev-fix-no-trial-to-paid-conversion-nudg

## Summary

Implemented an in-app trial expiry nudge that prompts trial and pilot agents to upgrade when their trial is expiring (<=7 days) or has already expired.

## Files Created

- `product/lead-response/dashboard/app/api/trial/nudge/route.ts` — GET endpoint returning trial status, days remaining, isExpired, shouldShow flag, and Stripe checkout URL for Pro plan
- `product/lead-response/dashboard/app/api/trial/dismiss-nudge/route.ts` — POST endpoint that persists banner dismissal via `trial_banner_dismissed` column
- `product/lead-response/dashboard/components/trial-nudge-banner.tsx` — Client component: amber warning banner (<=7 days) or red expired banner, with direct Stripe checkout CTA
- `product/lead-response/dashboard/__tests__/trial-nudge.test.ts` — 11 tests covering auth, paid bypass, expiry logic, dismissal, and DB errors

## Files Modified

- `product/lead-response/dashboard/app/dashboard/layout.tsx` — Wired TrialNudgeBanner into dashboard layout so nudge appears on all dashboard pages

## Test Results

- **Passed:** 11 / 11
- **Pass rate:** 100%
- Pre-existing failures: 111 (unchanged from baseline)

## Design Decisions

1. **Reused `trial_banner_dismissed` column** — already exists in `real_estate_agents` schema, no migration needed
2. **Dismissal ignored after expiry** — once trial expires, banner re-appears regardless of dismissal (revenue-critical)
3. **Stripe checkout URL generated server-side** — avoids exposing price IDs client-side; falls back to `/pricing` if Stripe not configured
4. **Two visual states** — amber/dismissible for approaching expiry, red/persistent for expired
5. **Auth via `getAuthUserId()`** — consistent with all other protected API routes in the codebase
