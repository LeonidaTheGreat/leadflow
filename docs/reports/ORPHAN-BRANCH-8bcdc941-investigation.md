# Orphan Branch Investigation: dev/8bcdc941-dev-fix-email-delivery-resend-from-domai

**Investigated by task:** e76a4115-c970-49e3-905c-72420fed2e40  
**Date:** 2026-07-20

## Summary

**Verdict: DUPLICATE/SUPERSEDED — safe to delete.**

This branch holds 2 commits from May 12, 2026 that incrementally extend the email sender domain alignment fix that was originally shipped via PR #1525 (merged May 8, 2026). The same problem domain (aligning Resend sender to the verified `landyourleads.com` domain and guarding against unverified sender domains in tests) was subsequently addressed through multiple merged PRs (#1573, #1573, #1663, and open #1874). The orphan commits are not in main, but their intent has been fully superseded by this subsequent work. Merging them would likely cause conflicts since many touched files have evolved since May 2026.

## Commits

| SHA | Date | Message |
|-----|------|---------|
| `66f73864` | 2026-05-12 | fix: align email sender defaults with verified domain |
| `4267ed64` | 2026-05-12 | test: guard unverified email sender domains |

## Files Changed (16 files, 173 insertions, 66 deletions)

| File | Change |
|------|--------|
| `lib/config/index.js` | 2 ±1 |
| `lib/services/ActivationService.js` | 2 ±1 |
| `lib/services/EmailService.js` | 2 ±1 |
| `lib/services/LapsedTrialReactivationService.js` | 2 ±1 |
| `lib/services/PilotConversionService.js` | 2 ±1 |
| `lib/services/WeeklyPerformanceService.js` | 2 ±1 |
| `tests/e2e/__tests__/email-domain-configuration.test.ts` | 107 ±heavily expanded |
| `product/lead-response/dashboard/app/api/admin/pilot-signups/invite/route.ts` | 2 ±1 |
| `product/lead-response/dashboard/app/api/auth/pilot-signup/route.ts` | 2 ±1 |
| `product/lead-response/dashboard/lib/__tests__/email-config-validation.test.ts` | 14 ±expanded |
| `product/lead-response/dashboard/lib/email-config-validation.ts` | 15 ±expanded |
| `product/lead-response/dashboard/lib/lead-magnet-email.ts` | 2 ±1 |
| `product/lead-response/dashboard/lib/pilot-conversion-service.ts` | 2 ±1 |
| `tests/e2e/__tests__/email-delivery-resend-from-domain-not-verified.test.js` | 63 ±expanded |
| `tests/index.test.js` | 6 ±expanded |
| `tests/unit/email-service-class.test.js` | 14 ±added |

## Evidence This Work Is Superseded

The branch commits are dated May 12, 2026. The following merged PRs address the same domain and post-date or overlap these changes:

| PR | Merged | Subject |
|----|--------|---------|
| #1525 | 2026-05-08 | Fix Email Delivery — Resend Test Domain Blocks All Outgoing Emails (branch `dev/4a475636`) |
| #1573 | 2026-05-12 | Fix: Retry: Fix Email Delivery — Resend Test Domain (branch `dev/f7821322`) |
| #1589 | 2026-05-14 | fix: add missing email_verification_tokens root migration |
| #1663 | ~2026-05-30 | fix: fail closed when lead magnet Resend key missing |
| #1697 | 2026-05-22 | RESEND_API_KEY not set in Vercel — email delivery non-functional (MERGED) |
| #1874 | OPEN | fix: replace onboarding@resend.dev with verified landyourleads.com sender |

Key main commits confirming intent already shipped:
- `4f5fa44c` — fix: use verified landyourleads sender fallback for resend emails (#1573)
- `8a19e9c5` — fix: fail closed when lead magnet Resend key missing (#1663)
- `edf0c4b9` — fix: update email domain from leadflow.ai to landyourleads.com (#1397)

Additionally, a sibling orphan investigation of `dev/4a475636-dev-fix-email-delivery-resend-from-domai` (PR #2015, merged 2026-07-20 today) reached the same conclusion — the email domain fix topic has been thoroughly resolved via subsequent work.

## Commands Run

```
git log --oneline main..origin/dev/8bcdc941-dev-fix-email-delivery-resend-from-domai
git diff --stat main...origin/dev/8bcdc941-dev-fix-email-delivery-resend-from-domai
git ls-remote --heads origin dev/8bcdc941-dev-fix-email-delivery-resend-from-domai
gh pr list --search "fix email delivery resend" --state all
git branch -r --contains 4267ed64
git branch -r --contains 66f73864
git log --oneline main | grep -i "email|resend|domain|sender|verified"
git log --oneline --after="2026-05-12" main -- lib/config/index.js lib/services/EmailService.js tests/unit/email-service-class.test.js
git log --oneline --after="2026-05-12" main -- product/lead-response/dashboard/lib/email-config-validation.ts
gh pr view 1874 --json title,state,headRefName,body
```

## Risk Assessment

**Low.** The commits are not in main, but the problem they addressed has been fixed via other merged PRs. Merging this branch would risk conflicts against 2+ months of subsequent evolution in the same files. None of the changes are unique functionality — they are all incremental test guards and sender alignment that later PRs also addressed.

## Recommendation

Safe to delete: `git push origin --delete dev/8bcdc941-dev-fix-email-delivery-resend-from-domai`
