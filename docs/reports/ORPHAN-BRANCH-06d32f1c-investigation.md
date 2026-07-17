# Orphan Branch Investigation: dev/06d32f1c-dev-rescue-fix-invite-accept-409-broken

**Investigated by task:** 8170e4f4-6854-4351-925e-5b7a84b2788b  
**Date:** 2026-07-16

## Summary

**Verdict: SHIPPABLE — branch has genuine bug fixes not yet merged to main.**

This branch has 2 commits (since merge base `4b3c778`) containing a real fix for the invite accept 409 error. The work is complete (fix + tests) and should be shipped via PR.

## Commits

| Commit | Message |
|--------|---------|
| `bfedb7f` | fix: accept-invite 409 — remove agent_id guard, add set-password endpoint |
| `21bb0f9` | test: add unit tests for invite accept 409 fix |

## Files Changed (5 files, unique to this branch)

| File | Change |
|------|--------|
| `product/lead-response/dashboard/app/api/auth/accept-invite/route.ts` | Removed `agent_id` → 409 guard; now checks `accepted_at` instead |
| `product/lead-response/dashboard/app/api/auth/set-password/route.ts` | New endpoint: `POST /api/auth/set-password` — activates agent, sets password |
| `product/lead-response/dashboard/app/accept-invite/page.tsx` | Two-step flow: validate token → show password form → redirect to login |
| `product/lead-response/dashboard/__tests__/accept-invite-flow.test.ts` | Updated unit tests for two-step flow |
| `tests/fix-invite-accept-409.test.js` | Unit tests covering 409 fix, 410 expiry, password validation |

## Root Cause of Original Bug

`invite-pilot` pre-creates an agent record and sets `agent_id` on the invite row at creation time. The `accept-invite` route had a guard `if (agent_id) return 409` which fired for every invite — making invite acceptance permanently broken for all pilot invites.

The fix checks `accepted_at` (whether the invite was used) instead of `agent_id` (whether an agent record exists), and splits the flow into two steps: token validation → password setup.

## Recommendation

**File a PR from `dev/06d32f1c-dev-rescue-fix-invite-accept-409-broken` to `main`.** The work is complete and addresses a critical onboarding blocker (pilot invites always return 409).
