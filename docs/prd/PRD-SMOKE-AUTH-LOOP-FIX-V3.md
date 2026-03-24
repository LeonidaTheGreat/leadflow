# PRD: Fix Auth Smoke Loop — V3

**PRD ID:** prd-smoke-auth-loop-fix-v3  
**Status:** approved  
**Priority:** Critical  
**Created:** 2026-03-24  
**Author:** Product Manager  
**Task ID:** aff3649c-c7b3-4e65-84a4-c3fc57760a0b  
**Supersedes:** prd-smoke-auth-loop-fix-v2 (filesystem only, never DB-registered; dev agents timed out)  
**Genome Project:** `~/.openclaw/genome/`

---

## Problem Statement

The smoke test **"Smoke: Auth: signup then login failing"** is being auto-created **7+ times in 2 hours** every time it runs. This is a runaway task loop that:

- Burns agent budget (~$1–2/task × 7 = $7–14 in 2h)
- Floods the task queue, blocking real product work
- Has now triggered 3 consecutive PM spec tasks (this is V3)

**V1 and V2 PRDs** existed on the filesystem but were **never registered in the database**, so the orchestrator couldn't find or act on them. Dev agents assigned to fix this kept hitting `zombie_timeout` (likely spending budget exploring too broadly). This V3 PRD is in the DB and is scoped more tightly.

---

## Root Cause Analysis (Confirmed)

### RC-1: `signup_login_flow` Check Type Not Implemented in Genome (Primary)

File: `~/.openclaw/genome/health/smoke-tests.js`

`CHECK_FUNCTIONS` contains only: `json_status_ok`, `http_200`, `html_contains`, `supabase_read`.

The test entry in `project.config.json`:
```json
{
  "id": "auth-signup-login-flow",
  "check_type": "signup_login_flow",
  "base_url": "https://leadflow-ai-five.vercel.app",
  "signup_path": "/api/auth/trial-signup",
  "login_path": "/api/auth/login"
}
```

When the runner hits this:
```js
const fn = CHECK_FUNCTIONS["signup_login_flow"]  // → undefined
if (!fn) return { pass: false, detail: `Unknown check_type: signup_login_flow` }
```

The test **always fails unconditionally** — never matters if the endpoints work.

Additionally, this test uses `base_url` instead of `url`, so `test.url` is `undefined` → `fetch(undefined)` → "Failed to parse URL from undefined". The test fails before even checking CHECK_FUNCTIONS.

### RC-2: `lastTaskCompleted` Never Written to Smoke State (Secondary)

File: `~/.openclaw/genome/core/heartbeat-executor.js`

The cooldown gate reads `state.results[id].lastTaskCompleted` but **nothing ever writes it**. Result: no cooldown activates, every heartbeat creates a new task for the perpetually-failing smoke check.

### Why Dev Agents Timed Out

Previous agents tried to implement the full `signup_login_flow` (async fetch to Vercel, signup, login, DB cleanup) in one pass. The implementation is complex and the V2 cleanup code referenced Supabase — which is **fully removed** from leadflow (local PostgreSQL only). This caused confusion + timeouts.

---

## Goals

1. **Stop the loop** — no more runaway smoke task creation for this check
2. **Make the smoke test actually reflect real endpoint health** — not always-fail
3. **Fix cooldown so it works** — write `lastTaskCompleted` after completion

---

## Scope — Two Deliverables, Prioritized

### Deliverable A: Immediate Loop Stop (Fastest Fix)

Change the `auth-signup-login-flow` test in `project.config.json` to use a simple `http_200` check while the full `signup_login_flow` implementation is pending:

```json
{
  "id": "auth-signup-login-flow",
  "name": "Auth: signup endpoint reachable",
  "url": "https://leadflow-ai-five.vercel.app/api/auth/trial-signup",
  "severity": "critical",
  "check_type": "http_200"
}
```

**Why:** The trial-signup endpoint returns HTTP 405 on GET (method not allowed) which is NOT a failure — the endpoint exists and is alive. Alternatively, use the login endpoint which may return 400 on GET. Either way, `http_200` needs to check for 200-499 range, not just 200. Dev agent should verify what the endpoint returns on GET and pick the right check_type.

**Alternative Deliverable A:** Keep `check_type: "signup_login_flow"` but implement a **minimal stub** in smoke-tests.js that does only a GET health check on the signup URL, returning `pass: true` if the server responds (even 4xx). This stops the loop without implementing the full E2E flow yet.

### Deliverable B: Full Implementation (Proper Fix)

Implement the real `signup_login_flow` check in `~/.openclaw/genome/health/smoke-tests.js`:

#### Handler Requirements

```js
async signup_login_flow(response, body, testDef) {
  const nodeFetch = require('node-fetch')  // or global fetch if Node 18+
  const crypto = require('crypto')

  const baseUrl = testDef.base_url
  const signupPath = testDef.signup_path || '/api/auth/trial-signup'
  const loginPath = testDef.login_path || '/api/auth/login'

  // Always use crypto.randomBytes — never Math.random()
  const testEmail = `smoke-${crypto.randomBytes(6).toString('hex')}@test.leadflow.internal`
  const testPassword = 'SmokeTest123!'

  try {
    // Step 1: Signup
    const signupRes = await nodeFetch(`${baseUrl}${signupPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
      timeout: 15000
    })
    const signupBody = await signupRes.text()

    if (signupRes.status !== 200 && signupRes.status !== 201) {
      return { pass: false, detail: `Signup HTTP ${signupRes.status}: ${signupBody.slice(0, 150)}` }
    }

    let signupJson = {}
    try { signupJson = JSON.parse(signupBody) } catch {}
    if (signupJson.error) {
      return { pass: false, detail: `Signup error: ${signupJson.error}` }
    }

    // Step 2: Login
    const loginRes = await nodeFetch(`${baseUrl}${loginPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
      timeout: 15000
    })
    const loginBody = await loginRes.text()

    if (loginRes.status !== 200) {
      return { pass: false, detail: `Login HTTP ${loginRes.status}: ${loginBody.slice(0, 150)}` }
    }

    let loginJson = {}
    try { loginJson = JSON.parse(loginBody) } catch {}
    if (loginJson.error) {
      return { pass: false, detail: `Login error: ${loginJson.error}` }
    }

    return { pass: true, detail: 'Signup and login both succeeded' }
  } catch (err) {
    return { pass: false, detail: `Network error: ${err.message}` }
  } finally {
    // Cleanup: remove test user via local PostgreSQL (Supabase removed from leadflow)
    // Load env from leadflow project
    try {
      const dotenv = require('dotenv')
      dotenv.config({ path: '/Users/clawdbot/projects/leadflow/.env' })
      dotenv.config({ path: '/Users/clawdbot/.env' })
      const { Pool } = require('pg')
      const pool = new Pool({ connectionString: process.env.LOCAL_PG_URL })
      await pool.query('DELETE FROM real_estate_agents WHERE email = $1', [testEmail])
      await pool.end()
    } catch (cleanupErr) {
      console.warn(`[smoke] Cleanup failed for ${testEmail}: ${cleanupErr.message}`)
    }
  }
}
```

**Critical notes for dev agent:**
- ⚠️ LeadFlow uses **local PostgreSQL** (`LOCAL_PG_URL`), NOT Supabase — previous PRD V2 had wrong cleanup code
- The `runAll()` function must `await` the `check()` result since `signup_login_flow` is async
- Verify in `smoke-tests.js` that `result = await test.check(response, body)` — if it's `result = test.check(...)` (no await), it must be fixed
- `node-fetch` may not be in genome's dependencies — use `global.fetch` (Node 18+) or add `node-fetch` to genome's `package.json`

#### Fix `lastTaskCompleted` in `heartbeat-executor.js`

In `runSmokeTests()`, when a smoke task is found to be completed (done/failed), write the timestamp:

```js
// EXISTING CODE (approximately):
const existingSmoke = await this.store.findTaskByTitle(smokeTitle)
if (existingSmoke && !['done', 'failed'].includes(existingSmoke.status)) {
  continue  // task still in progress, skip
}

// ADD THIS BLOCK — write lastTaskCompleted when task just finished:
if (existingSmoke && ['done', 'failed'].includes(existingSmoke.status)) {
  const smokeState = smokeTests.loadState()
  if (!smokeState.results[failure.id]) smokeState.results[failure.id] = {}
  smokeState.results[failure.id].lastTaskCompleted = existingSmoke.updated_at || new Date().toISOString()
  smokeTests.saveState(smokeState)
  // cooldown check already follows (if lastTaskCompleted < 2h, skip new spawn)
}
```

---

## Security Requirements (Mandatory — Auth Feature)

Dev agent must verify these hold for the actual auth endpoints (not just the smoke test). If any fail, file a bug via `product_feedback` table:

| Requirement | Check |
|-------------|-------|
| Password hashing | Passwords in `real_estate_agents.password_hash` use bcrypt ($2a/$2b prefix) |
| Token generation | Session tokens use `crypto.randomBytes()`, not `Math.random()` |
| Token storage | Session tokens in DB are hashed (sha256+), not stored raw |
| Auth middleware | All `/dashboard/*` and `/settings/*` routes enforce server-side auth |
| Session expiry | Sessions have `expires_at` or equivalent; max 30d for regular, 7d for trial |
| Input validation | `/api/auth/*` validates email format, password min 8 chars |
| Rate limiting | Auth endpoints have rate limiting (or a spec gap exists — file bug) |
| Error safety | Auth errors never reveal whether email exists (use generic "Invalid credentials") |

---

## E2E Test Scenarios

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| E2E-1 | Full signup → login | POST trial-signup + POST login same creds | Both 200/201, no error field, login returns user/session |
| E2E-2 | Wrong password | POST trial-signup, then POST login with wrong password | 401, generic error (no email-exists hint) |
| E2E-3 | Duplicate email | POST trial-signup twice same email | Second returns 409, graceful error |
| E2E-4 | Test cleanup | After E2E-1, check DB | No smoke email in `real_estate_agents` |
| E2E-5 | Cooldown | After fix: wait for next heartbeat | No new "Smoke: Auth" task spawned |

---

## Acceptance Criteria

**Loop Stop (required for completion):**
- [ ] `auth-signup-login-flow` smoke test no longer always fails due to unknown check_type
- [ ] No new "Smoke: Auth: signup then login failing" tasks spawned for 4+ hours after fix

**Smoke Test (required for completion):**
- [ ] `smoke-tests.js` handles `signup_login_flow` check_type without throwing
- [ ] Handler constructs URL from `base_url` + `signup_path` (not `testDef.url`)
- [ ] Handler uses `crypto.randomBytes()` for test email (never `Math.random()`)
- [ ] Handler cleans up test user via local PostgreSQL (not Supabase)

**Cooldown (required for completion):**
- [ ] `heartbeat-executor.js` writes `lastTaskCompleted` to smoke state after task completes
- [ ] When `lastTaskCompleted` < 2h ago, heartbeat skips spawning new smoke task

**Auth Endpoints (verify only — file bugs if broken, don't block completion):**
- [ ] `POST /api/auth/trial-signup` with valid email+password returns 200/201
- [ ] `POST /api/auth/login` with correct credentials returns 200 with user/session data
- [ ] `POST /api/auth/login` with wrong password returns 401 with generic message

---

## Definition of Done (Human Testable)

Stojan can verify:
1. **No loop:** Check task queue — no burst of "Smoke: Auth" tasks
2. **State file updated:** `~/.openclaw/genome/state/leadflow/.smoke-test-state.json` shows `lastTaskCompleted` for `auth-signup-login-flow`
3. **Signup works:** Visit `https://leadflow-ai-five.vercel.app/signup`, create account, log in successfully
4. **Passwords hashed:** In local PG: `SELECT email, LEFT(password_hash, 7) FROM real_estate_agents LIMIT 5;` → all start with `$2a$` or `$2b$`

---

## Implementation Notes for Dev Agent

### Working in the Right Repo
- **Genome files:** `~/.openclaw/genome/health/smoke-tests.js` and `~/.openclaw/genome/core/heartbeat-executor.js`
- **Leadflow files:** `project.config.json` (for Deliverable A fallback)
- Do NOT mix the two repos — genome changes go in genome, leadflow changes go in leadflow

### Recommended Approach (Avoids Timeout)
1. **First (5 min):** Implement Deliverable A — change project.config.json to use `http_200` or implement minimal stub. This stops the loop immediately.
2. **Second (15 min):** Implement Deliverable B — full `signup_login_flow` in smoke-tests.js + `lastTaskCompleted` write.
3. **Verify:** Check the smoke test state file and confirm no immediate re-spawn.

### What NOT to Do
- Do NOT implement the full auth system from scratch — it's already built
- Do NOT touch Supabase code — leadflow uses local PostgreSQL
- Do NOT rewrite `heartbeat-executor.js` — surgical edit only (add ~5 lines)
- Do NOT spend time debugging the actual auth endpoints unless smoke test still fails after framework fix
