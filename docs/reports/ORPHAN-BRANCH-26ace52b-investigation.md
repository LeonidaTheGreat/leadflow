# Orphan Branch Investigation: dev/26ace52b-dev-re-merge-fix-verify-stripe-webhook-s

**Task ID:** e5196520-b205-45e7-9a5f-cdfeebcd885f  
**Verdict:** shippable-needs-task-pr  
**Date:** 2026-07-19

## Branch Metadata

- **Branch:** `dev/26ace52b-dev-re-merge-fix-verify-stripe-webhook-s`
- **Remote SHA:** `b9e59f54a62d903b4eb9e244878e25d4760a5c11`
- **Commits ahead of main:** 2

## Commits on Branch

| SHA | Subject |
|-----|---------|
| `5a64ed44` | fix: add STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY to health check verification |
| `b9e59f54` | test: convert stripe webhook secret health check to Jest format |

## Files Changed (vs main)

```
lib/services/SystemStatusService.js                |   6 +-
product/lead-response/dashboard/app/api/health/route.ts |   4 +
tests/unit/stripe-webhook-secret-health-check.test.js   | 103 +++++++++++++++++++++
3 files changed, 112 insertions(+), 1 deletion(-)
```

## Evidence

1. **Changes not on main:** `lib/services/SystemStatusService.getHealthStatus()` on main returns only `fub` and `twilio` env var status — no `stripe_secret_key` or `stripe_webhook_secret` fields. The orphan branch adds both.

2. **Original PR #1696 was CLOSED (not merged):** PR "fix: verify Stripe webhook secret in production (task 648ef165)" — companion branch `dev/648ef165-dev-re-merge-fix-verify-stripe-webhook-s` — was closed 2026-05-28 without merging.

3. **8+ cancelled merge tasks:** Database query shows 8 "Merge: Verify Stripe webhook secret in production" tasks all marked `cancelled`. This indicates the orchestrator repeatedly tried and failed to merge this work, likely due to merge conflicts as the health route evolved heavily between May–July 2026.

4. **Re-merge commit d34c6408 (#1910) did NOT include these changes:** The July 2026 re-merge PR covered `config.ts`, `revenue-config-health`, `create-checkout-session`, `upgrade-checkout`, and `activation/page.tsx` — but not `SystemStatusService.js` or the test file.

5. **Test file missing from main:** `tests/unit/stripe-webhook-secret-health-check.test.js` has no history on main — it was never committed.

## Risk Assessment

- **Level:** Low-medium
- The `SystemStatusService.js` change is small (+5 lines, additive) with no breaking changes.
- The `/api/health` route change is +4 lines marking Stripe vars as critical — needs verification against current route state (heavily modified since May 2026).
- The branch is 2 months stale; a fresh cherry-pick or re-implementation is safer than a direct merge.
- `BillingService.js` on main already checks `STRIPE_WEBHOOK_SECRET` in a different health path — no duplication risk, different endpoint surface.

## Recommendation

**Do NOT delete.** Create a new dev task to port the `SystemStatusService` stripe health checks onto latest main. Steps:
1. Cherry-pick `5a64ed44` or re-implement the 5-line change in `SystemStatusService.js`
2. Verify `/api/health` route behavior against the current route file before applying the +4 line change
3. Port the test file after confirming Jest discovery covers `tests/unit/`

The original PR is closed and the branch is too stale to merge directly, but the underlying feature (surfacing Stripe env var misconfiguration in the health endpoint) is valid and unshipped.
