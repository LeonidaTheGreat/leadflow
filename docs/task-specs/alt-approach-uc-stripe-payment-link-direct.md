# PM Re-Spec: uc-stripe-payment-link-direct

**Date:** 2026-07-17
**Task:** 92a0e73f-5cf8-48cd-8f19-ad51b0d722ca
**Category:** needs_alternative_approach

## Diagnosis

Three dev cycles (task 3db389c7, rescue c74da0c8) failed with the same root cause:
**git rebase merge conflict** — not a code problem.

PR #1862 was closed because `git rebase origin/main` failed on commit `2255983f`. Main received 7+ merges during the review cycle, causing conflicts. The rescue branch (c74da0c8) was similarly abandoned after investigation found it was an orphan.

**The code is already 100% complete** and sits in the working tree as untracked files:

| File | Status |
|------|--------|
| `lib/services/PaymentLinkService.js` | Untracked — new file |
| `routes/admin/payment-link.js` | Untracked — new file |
| `product/lead-response/dashboard/app/admin/payment-links/page.tsx` | Untracked — new file |
| `tests/admin-payment-link.test.js` | Untracked — 17/17 tests passing |
| `server.js` | Modified — route wired (lines 18 + 61) |

## Alternative Approach

**Do NOT reimplement.** The next dev task must ship what's already in the working tree:

```bash
# 1. Create fresh branch off main
git checkout main && git pull --ff-only
git checkout -b dev/<task-id>-stripe-payment-link-ship

# 2. Stage exactly these files (no git add -A)
git add lib/services/PaymentLinkService.js
git add routes/admin/payment-link.js
git add product/lead-response/dashboard/app/admin/payment-links/page.tsx
git add tests/admin-payment-link.test.js
git add server.js

# 3. Commit
git commit -m "feat: Direct Stripe Payment Link — admin endpoint + UI (uc-stripe-payment-link-direct)"

# 4. Push and PR (no rebase needed — fresh from main)
git push -u origin <branch>
gh pr create ...
```

## Verification

```bash
npx jest tests/admin-payment-link.test.js
# Expected: 17/17 passing

npm run build
# Expected: exit 0
```

## What Was Built

- **PaymentLinkService** — creates Stripe Payment Links via `stripe.paymentLinks.create()`. Plans: starter ($49), professional ($149), enterprise ($399). Passes `stripe_customer_id` in metadata when available.
- **Route handler** — `GET /api/admin/payment-link-candidates` lists eligible agents; `POST /api/admin/create-payment-link` generates the link. Both protected by `requireApiKey` middleware.
- **Admin UI** — `/admin/payment-links` page shows table of completed-onboarding agents with per-row plan selector and Generate Link button. Copy-to-clipboard modal on success.
- **Tests** — 17 unit tests covering service logic, auth guard, and input validation.

## Why The New Approach Won't Conflict

Branching fresh off current main means there's no rebase step. The files being added are all new (except server.js which adds 4 lines). As long as no other PR touches those exact lines of server.js simultaneously, this will merge cleanly.
