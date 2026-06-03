# QC Review: dccf671d-618a-43ae-bdfb-86e7ae6be63e

**Task:** fix: leads table missing is_sample column — sample lead DB insert fails silently on signup
**Branch:** dev/e8afaee7-dev-fix-leads-table-missing-is-sample-co
**PR:** https://github.com/LeonidaTheGreat/leadflow/pull/878
**Verdict:** APPROVED
**Date:** 2026-04-05

---

## Automated Gates

| Gate | Result |
|------|--------|
| `npm run build` (Next.js) | PASS |
| `npm test` | Pre-existing failure (FUB/Twilio creds not in CI env) — not caused by this PR |
| No junk files | PASS |
| No root .md files | PASS |
| E2E test (17/17) | PASS |

---

## Diff Review

**Changed files:**
- `migrations/007_add_is_sample_columns.sql` — new migration
- `product/lead-response/dashboard/app/api/auth/trial-signup/route.ts` — fix messages insert
- `product/lead-response/dashboard/app/api/leads/sample-status/route.ts` — activate DB query
- `tests/e2e/fix-trial-signup-route-does-not-write-utm-to-agent-rec.test.js` — deleted (merge artifact only, see below)

### Migration

Adds four columns to `leads` (`is_sample BOOLEAN NOT NULL DEFAULT FALSE`, `sample_type TEXT`, `property_interest TEXT`, `budget TEXT`) and one to `messages` (`is_sample BOOLEAN NOT NULL DEFAULT FALSE`). Uses `ADD COLUMN IF NOT EXISTS` — idempotent. DOWN section present. Applied and tracked in `schema_migrations` as version 007.

### trial-signup route fix

Old broken messages insert used `agent_id`, `content`, `sender_type` — none of which match the actual `messages` table schema. New insert correctly uses `message_body`, `direction: 'outbound'`, `channel: 'sms'`, `ai_generated: true`, `is_sample: true`. This matches the DB CHECK constraints exactly.

`SAMPLE_LEADS` array: all 3 entries include `is_sample: true` and `sample_type: 'demo'`. New columns (`property_interest`, `budget`) are populated.

Error handling: `leadsError` is checked, logged, but does not abort signup — correct non-fatal behavior.

### sample-status route

Previously returned hardcoded `{ hasSampleLeads: false, sampleLeadCount: 0 }` with a TODO comment. Now queries `leads` table with `.eq('is_sample', true)` filtered by `agent_id`. Error handling returns safe default (not 500).

---

## DB Verification

Columns confirmed present in live DB:

```
leads: is_sample (boolean NOT NULL DEFAULT false), sample_type (text), property_interest (text), budget (text)
messages: is_sample (boolean NOT NULL DEFAULT false)
```

Live insert test (in transaction, rolled back): sample lead + sample message with is_sample=true inserted and read back successfully.

---

## Findings

### Issues Found

**1. Migration file number conflict (pre-existing, not a regression)**

Two files both prefixed `007_` on disk: `007_activation_email_sent.sql` (on main) and `007_add_is_sample_columns.sql` (this PR). The `activation_email_sent` migration was never tracked via `schema_migrations` — the column exists in the DB via other means. Migration numbering in this repo has been inconsistent (two `005_` files also exist). This is a pre-existing problem not introduced by this PR. The actual DB state is correct and consistent.

**2. Apparent deletion of UTM test file (merge artifact, no actual impact)**

`git diff main...HEAD` shows `tests/e2e/fix-trial-signup-route-does-not-write-utm-to-agent-rec.test.js` as deleted. This is because the branch was cut at `31fba4c` (before `f9ce09d` landed the UTM test on main). The file does not exist at the branch base — a merge will not delete it from main's side. Confirmed: `git merge-base` shows `31fba4c` as the common ancestor, and the file does not exist at that commit.

### No Issues With

- Message schema correctness
- Column constraints respected
- Error handling (non-fatal for sample lead insert failure)
- Auth on sample-status route (checks userId via getAuthUserId)
- No hardcoded secrets
- No SQL injection vectors
- No new patterns inconsistent with codebase

---

## E2E Test

**File:** `tests/integration/test-trial-signup-sample-leads.js`

17 tests: 7 static analysis (route code assertions) + 10 DB assertions including live insert test.

All 17 pass.

---

## Verdict

APPROVED. Fix is correct, complete, and verified.
