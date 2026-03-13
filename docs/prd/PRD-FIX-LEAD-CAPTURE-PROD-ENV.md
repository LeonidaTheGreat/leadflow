# PRD: Fix /api/lead-capture Production Environment Failure

**ID:** PRD-FIX-LEAD-CAPTURE-PROD-ENV  
**Status:** completed  
**Version:** 1.1  
**Use Case:** fix-api-lead-capture-endpoint-returns-db-error-in-prod  
**Updated:** 2026-03-09

---

## Problem Statement

`POST /api/lead-capture` on the Vercel production deployment returned:

```json
{"success":false,"error":"Failed to save. Please try again."}
```

for every valid payload, preventing pilot agent sign-ups from being recorded.

---

## Root Cause (Diagnosed)

**Primary cause:** The `pilot_signups` table has a `NOT NULL` constraint on the `name` column. The endpoint's upsert payload omitted the `name` field entirely, so Postgres rejected every insert:

```
null value in column "name" of relation "pilot_signups"
violates not-null constraint
```

**Secondary issue:** `RESEND_API_KEY` was not configured in Vercel, so email confirmation was silently failing (non-blocking; the endpoint was already coded to degrade gracefully).

**False task failure:** The orchestration genome marked the dev task (795dca51) as "failed" with `"Verification failed (unrecoverable): branch does not exist"`. This is a false negative — the branch `dev/795dca51-dev-fix-api-lead-capture-endpoint-return` was correctly deleted after PR #73 was merged. The post-merge branch-existence check fired against a branch that was intentionally gone.

---

## Fix Applied (PR #73 — Merged)

**File:** `product/lead-response/dashboard/app/api/lead-capture/route.ts`

- Added `name` field to the upsert payload, derived from `firstName` if provided, otherwise from the email prefix (`email.split('@')[0]`)
- 20/20 unit tests pass, including regression for the name-fallback behaviour
- Deployed to Vercel; production endpoint verified returning `{"success":true,"message":"Playbook sent!"}`

---

## Remaining Work

| Item | Priority | Owner |
|------|----------|-------|
| Add `RESEND_API_KEY` to Vercel env vars | High | Stojan / Dev |
| Fix genome post-merge branch verification to handle merged branches | Medium | Orchestrator |

---

## Acceptance Criteria

- [x] `POST /api/lead-capture` with valid email returns `{"success":true}`
- [x] Record inserted into `pilot_signups` with `name`, `email`, and `created_at`
- [x] 20/20 unit tests pass
- [x] Fix deployed and verified on `leadflow-ai-five.vercel.app`
- [ ] Email confirmation sent via Resend when `RESEND_API_KEY` is configured *(blocked on key being added to Vercel)*

---

## E2E Test Spec

**Happy path:**
```
POST /api/lead-capture
Body: { "email": "test@example.com", "firstName": "Jane" }
Expected: 200, { "success": true, "message": "Playbook sent!" }
DB check: pilot_signups row with name="Jane", email="test@example.com"
```

**Email-prefix fallback:**
```
POST /api/lead-capture
Body: { "email": "jsmith@example.com" }
Expected: 200, { "success": true }
DB check: pilot_signups row with name="jsmith"
```

**Duplicate email (upsert):**
```
POST /api/lead-capture (same email twice)
Expected: 200 both times, only one row in pilot_signups
```
