# PRD: Fix Auth Smoke Loop — V2 (Persistent Loop After Prior Fix Not Deployed)

**PRD ID:** prd-smoke-auth-loop-fix-v2  
**Status:** approved  
**Priority:** Critical  
**Created:** 2026-03-24  
**Author:** Product Manager  
**Task ID:** 4f02f819-6610-4993-94ec-b1cee1f0a018  
**Supersedes:** prd-smoke-auth-loop-fix (approved but never implemented)

---

## Problem Statement

The smoke test **"Smoke: Auth: signup then login failing"** is being created **9 times in 2 hours**, forming a runaway task loop that:
- Wastes agent budget (~$0.30–$2/task × 9 = up to $18 in 2h)
- Floods the task queue, blocking real work
- Obscures actual product failures under noise

**Prior PRD** (`prd-smoke-auth-loop-fix`) identified root causes on 2026-03-24 but was never implemented. This PRD supersedes it with identical requirements + additional clarity for the dev agent.

---

## Root Causes (Confirmed by Code + State Inspection)

### Root Cause 1 — `signup_login_flow` Check Type Not Implemented (Primary)

`~/.openclaw/genome/health/smoke-tests.js` uses a dispatch table:

```js
const CHECK_FUNCTIONS = {
  json_status_ok(response, body) { ... },
  http_200(response, body) { ... },
  html_contains(response, body, testDef) { ... },
  supabase_read(response, body, testDef) { ... }
}
```

The `auth-signup-login-flow` test in `project.config.json` declares `check_type: "signup_login_flow"` — which is **not in CHECK_FUNCTIONS**. The fallback:

```js
const fn = CHECK_FUNCTIONS[testDef.check_type]
if (!fn) return { pass: false, detail: `Unknown check_type: ${testDef.check_type}` }
```

…means this test **always fails unconditionally**, regardless of whether the actual auth endpoints work.

**Evidence:** `.smoke-test-state.json` shows `auth-signup-login-flow.lastFail` is always recent; `lastPass` is from a prior period when check_type may have been different.

### Root Cause 2 — `lastTaskCompleted` Never Written (Secondary)

The cooldown logic in `heartbeat-executor.js` (line ~2334):

```js
const lastCompleted = testState.lastTaskCompleted
if (lastCompleted) {
  const hoursSince = (Date.now() - new Date(lastCompleted).getTime()) / (1000 * 60 * 60)
  if (hoursSince < 2) { continue }  // skip if completed within 2h
}
```

`testState.lastTaskCompleted` is **read but never written** anywhere in the genome codebase. `grep -rn "lastTaskCompleted"` returns only this single read site. The cooldown therefore never activates.

**Combined effect:** Every heartbeat (every ~5 min), auth smoke fails → no open task found (prev was marked done) → no cooldown → new task spawned. 9 tasks / 2h ≈ 1 task every 13 minutes.

---

## Goals

1. Implement `signup_login_flow` check type so the auth smoke test reflects **real** endpoint state
2. Write `lastTaskCompleted` to state after a smoke task completes so cooldown works
3. Eliminate false-positive task spam from this smoke check
4. Confirm `/api/auth/trial-signup` and `/api/auth/login` are actually functional in production

---

## Scope

**Files to modify (genome project):**

| File | Change |
|------|--------|
| `~/.openclaw/genome/health/smoke-tests.js` | Add `signup_login_flow` handler to CHECK_FUNCTIONS |
| `~/.openclaw/genome/core/heartbeat-executor.js` | Write `lastTaskCompleted` to state after smoke task completes |

**Files to read (leadflow project, for context only):**

| File | Purpose |
|------|---------|
| `routes/portal.js` | Confirm login route exists |
| `server.js` | Confirm `/api/auth/trial-signup` route registration |

---

## Functional Requirements

### FR-1: Implement `signup_login_flow` in `genome/health/smoke-tests.js`

Add to `CHECK_FUNCTIONS`:

```js
async signup_login_flow(response, body, testDef) {
  // This handler performs an active end-to-end auth flow test.
  // It does NOT use the pre-fetched response/body — it makes its own requests.
  const fetch = require('node-fetch')
  const crypto = require('crypto')

  const baseUrl = testDef.base_url
  const signupPath = testDef.signup_path || '/api/auth/trial-signup'
  const loginPath = testDef.login_path || '/api/auth/login'

  // Use crypto.randomBytes — never Math.random()
  const testEmail = `smoke-${crypto.randomBytes(6).toString('hex')}@test.leadflow.ai`
  const testPassword = 'SmokeTest123!'

  let signupOk = false
  let loginOk = false
  let detail = ''

  try {
    // Step 1: Signup
    const signupRes = await fetch(`${baseUrl}${signupPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword, plan: 'trial' }),
      timeout: 15000
    })
    const signupBody = await signupRes.text()
    let signupJson = {}
    try { signupJson = JSON.parse(signupBody) } catch {}

    if (signupRes.status === 200 || signupRes.status === 201) {
      if (!signupJson.error) {
        signupOk = true
      } else {
        detail = `Signup returned error: ${signupJson.error}`
      }
    } else {
      detail = `Signup HTTP ${signupRes.status}: ${signupBody.slice(0, 200)}`
    }

    if (!signupOk) return { pass: false, detail }

    // Step 2: Login
    const loginRes = await fetch(`${baseUrl}${loginPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
      timeout: 15000
    })
    const loginBody = await loginRes.text()
    let loginJson = {}
    try { loginJson = JSON.parse(loginBody) } catch {}

    if (loginRes.status === 200) {
      if (loginJson.token || loginJson.session || loginJson.user) {
        loginOk = true
      } else if (!loginJson.error) {
        // Login returned 200 but no session object — acceptable if no error field
        loginOk = true
      } else {
        detail = `Login returned error: ${loginJson.error}`
      }
    } else {
      detail = `Login HTTP ${loginRes.status}: ${loginBody.slice(0, 200)}`
    }
  } catch (err) {
    detail = `Network error: ${err.message}`
  } finally {
    // Step 3: Cleanup — always attempt to delete test user
    try {
      const { createClient } = require('@supabase/supabase-js')
      const sb = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      await sb.from('real_estate_agents').delete().eq('email', testEmail)
    } catch (cleanupErr) {
      console.warn(`[smoke] Cleanup failed for ${testEmail}: ${cleanupErr.message}`)
    }
  }

  if (signupOk && loginOk) return { pass: true, detail: 'Signup and login both succeeded' }
  return { pass: false, detail: detail || 'Auth flow failed' }
}
```

**Note:** Because `signup_login_flow` is async and makes its own HTTP calls, the handler needs to be called differently from sync handlers. The `check()` wrapper in `buildTests()` must `await` async handlers:

```js
check(response, body) {
  const fn = CHECK_FUNCTIONS[testDef.check_type]
  if (!fn) return { pass: false, detail: `Unknown check_type: ${testDef.check_type}` }
  return fn(response, body, testDef)  // works for both sync and async (returns Promise or value)
}
```

The caller in `runAll()` must `await result.check(...)` — verify this is already the case.

### FR-2: Write `lastTaskCompleted` After Smoke Task Completes

In `heartbeat-executor.js`, after a smoke task transitions to `done` or `failed`, write `lastTaskCompleted` to state:

Find where smoke task completion is detected (likely in `verifyTaskOutput` callback or the next heartbeat's dedup check). The write should occur when a previously-created smoke task is found with `status === 'done'` or `status === 'failed'`:

```js
// When detecting that a smoke task completed:
const state = smokeTests.loadState()
if (!state.results[smokeTestId]) state.results[smokeTestId] = {}
state.results[smokeTestId].lastTaskCompleted = new Date().toISOString()
// Preserve other fields (devRetries, totalCost, etc.)
smokeTests.saveState(state)
```

**Exact location:** In `runSmokeTests()`, the dedup block already checks:
```js
const existingSmoke = await this.store.findTaskByTitle(smokeTitle)
if (existingSmoke && !['done', 'failed'].includes(existingSmoke.status)) { continue }
```

Add `lastTaskCompleted` write when `existingSmoke` IS done/failed AND the current test still fails (before spawning a new task):

```js
if (existingSmoke && ['done', 'failed'].includes(existingSmoke.status)) {
  // Previous task completed — record timestamp for cooldown
  const state = smokeTests.loadState()
  state.results[failure.id] = {
    ...(state.results[failure.id] || {}),
    lastTaskCompleted: existingSmoke.updated_at || new Date().toISOString()
  }
  smokeTests.saveState(state)
}
```

---

## Security Requirements (Auth Feature)

All acceptance criteria apply to the actual auth endpoints. Dev agent should verify these are already met in production; if not, open a separate bug via `product_feedback`:

- **Token storage**: Session tokens in DB must be hashed (sha256 minimum), not stored plaintext
- **Token generation**: Session tokens use `crypto.randomBytes()`, never `Math.random()`
- **Password hashing**: Passwords stored with bcrypt/scrypt/argon2 — NEVER plaintext or MD5/SHA1
- **Auth middleware**: All `/dashboard/*` routes enforce auth middleware server-side
- **Session expiry**: Sessions expire (max 30 days), tokens are rotatable
- **Input validation**: Email format validated, password min 8 chars, rate limiting on `/api/auth/*`
- **Error messages**: Auth errors must not reveal whether the email exists (use generic "Invalid credentials")

---

## E2E Test Spec

The smoke test itself IS the E2E test for this feature. Define in `e2e_test_specs`:

| Step | Action | Expected |
|------|--------|----------|
| 1 | POST `/api/auth/trial-signup` with new test email | 200/201, no `error` field |
| 2 | POST `/api/auth/login` with same credentials | 200, contains `token`/`session`/`user` |
| 3 | Attempt login with wrong password | 401/400, generic error (no email-exists leak) |
| 4 | Attempt duplicate signup same email | 400/409, graceful error message |
| 5 | Test user cleaned up from DB | No trace of smoke email in `real_estate_agents` |

---

## Acceptance Criteria

- [ ] `genome/health/smoke-tests.js` contains `signup_login_flow` handler
- [ ] Handler uses `crypto.randomBytes()` for test email generation
- [ ] Handler cleans up test user from DB on both success AND failure
- [ ] `genome/core/heartbeat-executor.js` writes `lastTaskCompleted` to smoke state after task completion
- [ ] After fix: `auth-signup-login-flow` smoke test passes (or fails for real reasons only)
- [ ] After fix: no new "Smoke: Auth: signup then login failing" task within 4h (loop stopped)
- [ ] Cooldown: if smoke task completed < 2h ago, no new task is spawned
- [ ] Auth endpoints respond correctly to valid signup → login flow
- [ ] Auth endpoints return generic errors (no email-exists leakage)
- [ ] Test data cleanup leaves no smoke emails in `real_estate_agents`

---

## Definition of Done

Human (Stojan) can:
1. Visit `https://leadflow-ai-five.vercel.app/signup`, create an account with a new email, then log in successfully
2. Confirm in Supabase/local DB that passwords are bcrypt-hashed
3. Observe the genome task queue: no new "Smoke: Auth: signup then login failing" tasks appear every 5 minutes
4. Check `.smoke-test-state.json` and confirm `lastTaskCompleted` is being written

---

## Notes for Dev Agent

- **Genome files are in `~/.openclaw/genome/`** — not in the leadflow project directory
- `smoke-tests.js` exports `{ tests, runAll, loadState, saveState, STATE_PATH }`
- The `CHECK_FUNCTIONS` object may need async support — verify `runAll()` awaits `check()`
- The `lastTaskCompleted` write must go inside `runSmokeTests()` in `heartbeat-executor.js`
- Do NOT modify `project.config.json` — the `check_type: "signup_login_flow"` is correct; the handler needs to be implemented
- State file: `~/.openclaw/genome/state/leadflow/.smoke-test-state.json`
