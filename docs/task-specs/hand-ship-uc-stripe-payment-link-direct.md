# Hand-Ship: uc-stripe-payment-link-direct

**Recommendation:** CHANGE APPROACH — hand-ship from existing rescue branch  
**Circuit breaker:** $21.15 / 2 tasks ($10 limit)

## Root Cause

Implementation is complete on `dev/c74da0c8-dev-rescue-uc-stripe-payment-link-direct`. The circuit breaker cancelled the rescue task **after implementation was done but before a PR was created**. Previous failures were merge conflicts, not code bugs.

Conflict analysis:
- Fork point: `c7f434ab` (shared with current main)
- Main advanced by 3 commits (2 docs + 1 npm_audit CVE fix)
- Files changed by main since fork: `package-lock.json` + 2 completion-report JSONs
- Files changed by rescue branch: 10 product files
- **Overlap: ONLY `package-lock.json`** — trivially resolvable

## Dev Task Spec

**Task type:** hand-ship (NO reimplementation)  
**Branch:** `dev/c74da0c8-dev-rescue-uc-stripe-payment-link-direct` (already exists, code done)

### Steps

```bash
git checkout dev/c74da0c8-dev-rescue-uc-stripe-payment-link-direct
git fetch origin
git rebase origin/main
```

If `package-lock.json` conflicts:
```bash
git checkout origin/main -- package-lock.json
npm install
git add package-lock.json
git rebase --continue
```

Then verify:
```bash
npx jest tests/admin-payment-link.test.js   # expect 17 passed
npm run build                               # exit 0
cd product/lead-response/dashboard && npm run build  # exit 0
```

Then push and create PR:
```bash
git push -u origin dev/c74da0c8-dev-rescue-uc-stripe-payment-link-direct --force-with-lease
gh pr create --base main --head dev/c74da0c8-dev-rescue-uc-stripe-payment-link-direct \
  --title "feat: Direct Stripe Payment Link — admin endpoint + UI (uc-stripe-payment-link-direct)"
```

### What NOT to do

- Do NOT reimplement anything
- Do NOT create a new branch
- Do NOT modify acceptance criteria
- Do NOT touch any files other than resolving `package-lock.json` if needed

## What's in the Rescue Branch

| File | Type |
|------|------|
| `lib/services/PaymentLinkService.js` | NEW — Stripe Payment Links API, constructor-injected |
| `routes/admin/payment-link.js` | NEW — POST /api/admin/create-payment-link |
| `product/lead-response/dashboard/app/admin/payment-links/page.tsx` | NEW — admin UI page |
| `product/lead-response/dashboard/app/api/admin/create-payment-link/route.ts` | NEW — Next.js route |
| `product/lead-response/dashboard/app/api/admin/payment-ready/route.ts` | NEW — candidates list |
| `tests/admin-payment-link.test.js` | NEW — 17 unit tests |
| `product/lead-response/dashboard/__tests__/admin-create-payment-link.test.ts` | NEW — TS tests |
| `server.js` | MODIFIED — +4 lines (require + app.use) |
| `product/lead-response/dashboard/app/admin/activation/page.tsx` | MODIFIED |
| `product/lead-response/dashboard/app/api/webhooks/stripe/route.ts` | MODIFIED |

## Acceptance Criteria (unchanged)

- POST /api/admin/create-payment-link returns valid Stripe Payment Link URL
- URL format matches `https://buy.stripe.com/*`
- Admin route returns 401 without LEADFLOW_API_KEY
- If agent has `stripe_customer_id`, included in metadata
- `npm test` passes (17 unit tests)
