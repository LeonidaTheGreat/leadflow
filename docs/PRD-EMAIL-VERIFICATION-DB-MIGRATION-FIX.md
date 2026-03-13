# PRD: Email Verification DB Migration Fix

**ID:** prd-email-verification-db-migration-fix  
**Status:** approved  
**Priority:** P0 — CRITICAL (blocks all email verification flows)  
**Version:** 1.0  
**Author:** Product Manager  
**Date:** 2026-03-13  
**Supersedes:** This is a targeted fix PRD. The parent feature PRD remains: `prd-email-verification-before-login`

---

## Background & Root Cause

The `feat-email-verification-before-login` feature was marked "complete" in use_cases but the **DB migration was never executed**. Four previous dev tasks attempted the fix and were marked DONE without verifying the table actually exists in production Supabase. 

**Why previous attempts failed:** Dev agents created migration scripts but left them unrun, or ran them against the wrong environment.

**Critical distinction:** The code in `lib/verification-email.ts` queries `email_verification_tokens` — this code is correct. The **database table does not exist**. No code change is needed — only a DB migration.

---

## Blast Radius

Without `email_verification_tokens` table:
- Every signup fails to create a verification token → no verification email sent
- `/api/auth/resend-verification` returns "Failed to create verification token"
- `/api/auth/verify-email` cannot validate any token
- At least one pilot user (`madzunkov@hotmail.com`) is locked out with `email_verified=false` and no way to self-recover
- The entire email verification feature is dead on arrival despite being "shipped"

---

## Required Actions (EXACT — Do Not Deviate)

### Action 1: Run DB Migration in Supabase

Execute this SQL **directly in Supabase** via the Supabase Dashboard SQL editor OR via `psql` using `SUPABASE_DB_PASSWORD` from `.env`. Use the **idempotent** form (IF NOT EXISTS):

```sql
-- Step 1: Create the missing table (idempotent)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_evt_token    ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_evt_agent_id ON email_verification_tokens(agent_id);

-- Step 3: Verify the table was created
SELECT COUNT(*) AS table_exists
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'email_verification_tokens';
-- EXPECTED: table_exists = 1

-- Step 4: Fix locked-out pilot user (backfill missed by initial migration)
UPDATE real_estate_agents
  SET email_verified = TRUE
  WHERE email = 'madzunkov@hotmail.com'
    AND email_verified = FALSE;

-- Step 5: Full backfill — any account created before verification shipped
-- (email_verified column exists but was not backfilled for all pre-feature accounts)
UPDATE real_estate_agents
  SET email_verified = TRUE
  WHERE email_verified = FALSE
    AND created_at < '2026-03-09 00:00:00+00';
```

### Action 2: Verify in Supabase (MANDATORY — do not skip)

After running the migration, verify by running:

```sql
-- Confirm table exists with correct schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'email_verification_tokens'
ORDER BY ordinal_position;

-- Confirm madzunkov can now log in
SELECT email, email_verified, created_at
FROM real_estate_agents
WHERE email = 'madzunkov@hotmail.com';
-- EXPECTED: email_verified = true
```

### Action 3: End-to-End Smoke Test

After migration, run a full smoke test from the deployed app:

1. **POST /api/auth/resend-verification** with `{ "email": "madzunkov@hotmail.com" }` → expect 200 (idempotent — already verified, returns "Already verified")
2. **POST /api/auth/resend-verification** with a fresh test account (unverified) → expect 200 with "Verification email sent"
3. Confirm a row appears in `email_verification_tokens` via Supabase Table Editor

---

## Definition of Done

All of the following MUST be confirmed before closing this task:

| Check | Verification Method |
|-------|-------------------|
| `email_verification_tokens` table exists | SQL: `SELECT COUNT(*) FROM email_verification_tokens` returns 0 (not error) |
| Indexes exist | SQL: `SELECT indexname FROM pg_indexes WHERE tablename='email_verification_tokens'` |
| madzunkov@hotmail.com unblocked | SQL: `SELECT email_verified FROM real_estate_agents WHERE email='madzunkov@hotmail.com'` = true |
| Token creation works | `POST /api/auth/resend-verification` with unverified account returns 200 |
| Row appears in tokens table | Check Supabase table after resend call |

---

## What NOT to Do

- ❌ Do NOT modify any TypeScript/JS code — the application code is correct
- ❌ Do NOT create a new migration file and leave it unrun
- ❌ Do NOT mark this task DONE without running the verification queries above
- ❌ Do NOT add the `IF NOT EXISTS` clause and then skip running it — you must actually execute it
- ❌ Do NOT use the Supabase JS client to create tables — use SQL directly

---

## Acceptance Criteria

1. **Table exists:** `SELECT COUNT(*) FROM email_verification_tokens` returns `0` (no error — empty table is correct).
2. **Indexes exist:** `idx_evt_token` and `idx_evt_agent_id` appear in `pg_indexes`.
3. **Locked-out user unblocked:** `madzunkov@hotmail.com` has `email_verified = TRUE` in `real_estate_agents`.
4. **Token creation works end-to-end:** `POST /api/auth/resend-verification` for a new unverified account returns 200 and creates a row in `email_verification_tokens`.
5. **No code regressions:** Existing login and signup flows continue to function.
6. **Backfill complete:** No accounts created before 2026-03-09 have `email_verified = FALSE` (they should all be `TRUE`).

---

## Related Use Cases

- `fix-db-migration-incomplete-email-verification-tokens-` — primary bug being fixed
- `fix-madzunkov-hotmail-com-is-locked-out-email-verified` — secondary impact (locked-out user)
- `feat-email-verification-before-login` — parent feature (currently broken in production)

---

## Notes for Dev Agent

This task requires **zero code changes**. It is a pure database operation. The dev agent should:

1. Connect to Supabase via the SQL editor at https://supabase.com/dashboard OR via psql:
   ```
   psql "postgresql://postgres.fptrokacdwzlmflyczdz:[SUPABASE_DB_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
   ```
   (`SUPABASE_DB_PASSWORD` is in `~/projects/leadflow/.env` and `~/.env`)

2. Run the SQL in Action 1 above.

3. Run the verification queries in Action 2 above and confirm results match expected.

4. Report the actual query output in the completion report — not "I ran the migration" but the actual `table_exists = 1` output.
