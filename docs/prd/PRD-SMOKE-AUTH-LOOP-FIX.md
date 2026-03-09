# PRD: Fix Auth Smoke Test Loop — `signup_login_flow` Check Type & Cooldown Tracking

**PRD ID:** prd-smoke-auth-loop-fix  
**Status:** approved  
**Priority:** Critical  
**Created:** 2026-03-24  
**Author:** Product Manager  
**Task ID:** ec86b38c-9f97-419f-985f-5cfc223b3dd9

---

## Problem Statement

The smoke test `"Smoke: Auth: signup then login failing"` is being created **12+ times in a 2-hour window**, creating a runaway task loop that wastes budget, floods the task queue, and obscures real failures.

### Root Causes (Confirmed by Code Analysis)

**Root Cause 1 — Unknown check_type (Primary)**  
The project config defines an auth smoke test with `check_type: "signup_login_flow"`. However, `smoke-tests.js` only implements four check types: `json_status_ok`, `http_200`, `html_contains`, `supabase_read`. There is NO handler for `signup_login_flow`.

The fallback behavior is:
```js
const fn = CHECK_FUNCTIONS[testDef.check_type]
if (!fn) return { pass: false, detail: `Unknown check_type: signup_login_flow` }
```

This means the auth smoke test **always fails on every heartbeat**, regardless of whether the actual auth endpoints work.

**Root Cause 2 — `lastTaskCompleted` never written (Secondary)**  
The heartbeat executor checks a 2-hour cooldown using `testState.lastTaskCompleted`, but this field is **never set** anywhere in the codebase. Every heartbeat, `lastCompleted` is undefined → cooldown check is skipped → a new task is spawned as soon as the previous one is marked `done`.

Combined effect: every 5-minute heartbeat creates a new smoke task if the previous one completed. 12 tasks in 2h = ~10 min average completion time per cycle.

---

## Goals

1. Implement the `signup_login_flow` check type so the auth smoke test reflects **real** endpoint health
2. Fix the `lastTaskCompleted` tracking so the 2-hour cooldown actually works
3. Ensure the auth smoke test self-cleans (no test data pollution in the `real_estate_agents` table)
4. Validate the actual auth endpoints return correct responses for sign-up → login flow

---

## In Scope

- `genome` project: `health/smoke-tests.js` — add `signup_login_flow` handler
- `genome` project: `core/heartbeat-executor.js` — write `lastTaskCompleted` after smoke task completion
- `leadflow` project: auth endpoint validation — confirm `/api/auth/trial-signup` and `/api/auth/login` work end-to-end in production

## Out of Scope

- Redesigning the smoke test architecture
- Modifying Supabase schema
- Changing auth business logic beyond what's needed to make the flow testable

---

## Requirements

### FR-1: Implement `signup_login_flow` Check Type in genome/health/smoke-tests.js

The `signup_login_flow` handler must:

1. Generate a unique test email using `crypto.randomBytes()` (e.g., `smoke-test-{hex}@test.leadflow.ai`)
2. POST to `{base_url}{signup_path}` with `{ email, password: 'SmokeTest123!' }`
3. Assert the signup returns HTTP 200 or 201 with a JSON body (no `error` field)
4. POST to `{base_url}{login_path}` with `{ email, password: 'SmokeTest123!' }`
5. Assert the login returns HTTP 200 with a JSON body containing a session or user object
6. On success, delete the test user from `real_estate_agents` via Supabase service role
7. On any failure, still attempt cleanup before returning the failure result
8. Return `{ pass: true }` only if both signup AND login succeed

**Config shape consumed:**
```json
{
  "id": "auth-signup-login-flow",
  "name": "Auth: signup then login",
  "base_url": "https://leadflow-ai-five.vercel.app",
  "signup_path": "/api/auth/trial-signup",
  "login_path": "/api/auth/login",
  "check_type": "signup_login_flow"
}
```

**Implementation notes:**
- Use `crypto.randomBytes(8).toString('hex')` for unique email suffix — never `Math.random()`
- The test password must meet the 8-character minimum (`SmokeTest123!`)
- Use a 10-second timeout (longer than the standard 5s — auth involves bcrypt)
- Handle network errors gracefully: timeout → `pass: false, detail: 'Timeout (10s)'`
- Cleanup must use `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars directly (not the client from the product app)

### FR-2: Fix `lastTaskCompleted` Tracking in genome/core/heartbeat-executor.js

When a smoke-related QC or dev task transitions to `done` or `failed`, the heartbeat must write `lastTaskCompleted` to the smoke state file for that test ID.

**Specifically:** After `existingSmoke.status === 'done'` or `existingDev.status === 'done'` is detected during the smoke loop, update the state:

```js
state.results[failure.id] = {
  ...testState,
  lastTaskCompleted: new Date().toISOString(),
  devRetries: retryCount + 1,
  totalCost: (testState.totalCost || 0) + modelCost
}
smokeTests.saveState(state)
```

This ensures the 2-hour cooldown (`hoursSince < 2`) actually fires and prevents the loop.

### FR-3: Auth Endpoints Must Return Correct Responses

The `trial-signup` and `login` endpoints must:

1. **Signup** (`/api/auth/trial-signup`): Accept `{ email, password }`, create a record in `real_estate_agents` with `bcrypt`-hashed password, return HTTP 200/201 with `{ success: true }` or similar non-error JSON
2. **Login** (`/api/auth/login`): Accept `{ email, password }`, verify bcrypt hash against `real_estate_agents.password_hash`, return HTTP 200 with session/user data
3. Both endpoints must NOT have `email_verified` blocking the smoke test user (trial signups set `email_verified: true` by default — verify this is still the case)
4. Login must NOT return `EMAIL_NOT_VERIFIED` error for users created via trial signup (already verified by code review — confirm this holds)

### Security Requirements (Mandatory)

- **Password hashing:** bcrypt with cost factor 10 (already implemented — confirm not regressed)
- **Token generation:** `crypto.randomBytes()` for all token/secret generation — no `Math.random()`
- **Token storage:** Any session tokens stored in DB must be hashed (sha256 minimum)
- **Auth middleware:** All protected routes enforce auth middleware server-side (already confirmed)
- **Session management:** Sessions expire; tokens are rotatable (already implemented)
- **Input validation:** Email format validated, password length ≥ 8 chars checked
- **Error messages:** Auth errors must not leak whether email exists (`"Invalid email or password"` for both cases — already implemented)
- **Rate limiting:** Auth endpoints should be rate-limited to prevent abuse (existing implementation acceptable if present)

---

## Acceptance Criteria

### AC-1: `signup_login_flow` Check Type Implemented
- [ ] `CHECK_FUNCTIONS['signup_login_flow']` exists in `smoke-tests.js`
- [ ] Running the auth smoke test manually returns `{ pass: true }` (not "Unknown check_type")
- [ ] Test email is unique per run, generated with `crypto.randomBytes()`
- [ ] Test user is cleaned up from DB after each smoke run (pass or fail)

### AC-2: Cooldown Tracking Fixed
- [ ] `state.results['auth-signup-login-flow'].lastTaskCompleted` is written after task completion
- [ ] Running smoke loop twice within 2 hours does NOT create a second task for the same failure
- [ ] Cooldown log message appears: `"⏳ Smoke: Auth: signup then login failing — cooldown (task completed X.Xh ago)"`

### AC-3: Auth Flow Works End-to-End in Production
- [ ] POST to `https://leadflow-ai-five.vercel.app/api/auth/trial-signup` with valid credentials returns HTTP 200
- [ ] POST to `https://leadflow-ai-five.vercel.app/api/auth/login` with same credentials returns HTTP 200
- [ ] No `EMAIL_NOT_VERIFIED` error for trial signup users
- [ ] No `Unknown check_type` log in heartbeat output

### AC-4: Loop Stopped
- [ ] Zero new `"Smoke: Auth: signup then login failing"` tasks created after fix ships for 2+ hours
- [ ] Circuit breaker counter (`devRetries`) resets to 0 after the smoke test passes

---

## E2E Test Spec

### Test: Smoke Auth Flow Passes End-to-End
**ID:** `e2e-smoke-auth-loop-fix-001`  
**Type:** integration  
**Steps:**
1. Call `smokeTests.runAll()` 
2. Find `auth-signup-login-flow` in results
3. Assert it is in `passed` array, not `failed`
4. Assert `detail` does NOT contain "Unknown check_type"

### Test: Cooldown Prevents Duplicate Tasks
**ID:** `e2e-smoke-auth-loop-fix-002`  
**Type:** integration  
**Steps:**
1. Set `state.results['auth-signup-login-flow'].lastTaskCompleted` to 1 hour ago
2. Trigger the smoke failure handler
3. Assert no new "Smoke: Auth: signup then login failing" task was created

### Test: Test User Cleanup
**ID:** `e2e-smoke-auth-loop-fix-003`  
**Type:** integration  
**Steps:**
1. Run the `signup_login_flow` check once
2. Query `real_estate_agents` for any email matching `smoke-test-*@test.leadflow.ai`
3. Assert zero rows returned (cleanup worked)

---

## Affected Projects

- **genome** (OpenClaw Genome): Primary implementation — smoke-tests.js + heartbeat-executor.js
- **leadflow** (LeadFlow AI): Auth endpoint validation — confirm no regression in trial-signup → login flow

---

## Notes for Dev Agent

1. **Do NOT modify AGENTS.md, agents.json, or any agent configs**
2. **genome files live in `~/.openclaw/genome/`** — not in the leadflow repo
3. The `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available as env vars in the genome environment (`.env` at genome root or `~/.env`)
4. The cleanup call should use the Supabase REST API or `@supabase/supabase-js` — whichever is already used in smoke-tests.js
5. The smoke state file path is available via `smokeTests.STATE_PATH`
6. **Test the fix by running:** `node -e "require('/path/to/smoke-tests').runAll().then(r => console.log(JSON.stringify(r.failed.map(f=>f.id))))"` — auth should NOT appear in failed list
