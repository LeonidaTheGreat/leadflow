# PRD: Fix Auth Smoke Loop — V5 (Atomic Config Patch)

**PRD ID:** prd-smoke-auth-loop-fix-v5
**Status:** approved
**Priority:** Critical (P0 — loop burning agent budget every heartbeat)
**Created:** 2026-03-24
**Author:** Product Manager
**Task ID:** 891a6683-ae8b-401a-a6a8-0f6d46e14600
**Supersedes:** prd-smoke-auth-loop-fix-v4
**Linked Use Case:** fix-smoke-auth-signup-login-loop

---

## Why V4 Failed

V4 prescribed `check_type: "http_200_post_405"` — which **does not exist** in `CHECK_FUNCTIONS` in `smoke-tests.js`. Dev agents timed out 3x trying to implement a complex solution. QC agents marked tasks done without applying the config patch.

**This is V5. It is one JSON block replacement. Nothing else.**

---

## Root Cause (Final — Confirmed Across 6+ Tasks)

**File:** `/Users/clawdbot/projects/leadflow/project.config.json`

The smoke test config uses:
- `check_type: "signup_login_flow"` — **does not exist in CHECK_FUNCTIONS**
- `base_url` + `signup_path` + `login_path` keys — **not read by `buildTests()`** (which reads `url`, not `base_url`)

Result: `testDef.url` is `undefined`, `CHECK_FUNCTIONS["signup_login_flow"]` is `undefined`.
Every run returns `{ pass: false, detail: "Unknown check_type: signup_login_flow" }`.
Every failure spawns a new task. Infinite loop.

**Available CHECK_FUNCTIONS (confirmed from `~/.openclaw/genome/health/smoke-tests.js`):**
- `json_status_ok`
- `http_200`
- `html_contains`
- `supabase_read`

**Only use one of the above. No others exist.**

---

## The Fix — One JSON Block in `project.config.json`

### File: `/Users/clawdbot/projects/leadflow/project.config.json`

**Find this exact JSON object** (in the `smoke_tests` array):

```json
{
  "id": "auth-signup-login-flow",
  "name": "Auth: signup then login",
  "base_url": "https://leadflow-ai-five.vercel.app",
  "signup_path": "/api/auth/trial-signup",
  "login_path": "/api/auth/login",
  "severity": "critical",
  "check_type": "signup_login_flow"
}
```

**Replace it with this exact JSON object:**

```json
{
  "id": "auth-signup-login-flow",
  "name": "Auth: login page reachable",
  "url": "https://leadflow-ai-five.vercel.app/login",
  "severity": "critical",
  "check_type": "http_200",
  "note": "Downgraded from signup_login_flow (unimplemented check_type) — PRD-SMOKE-AUTH-LOOP-FIX-V5"
}
```

### Why This Is Correct
- `http_200` exists in CHECK_FUNCTIONS ✅
- `url` key is read by `buildTests()` ✅
- `/login` page returns HTTP 200 (already passing `login-page` smoke test) ✅
- This immediately stops the loop ✅

### What This Does NOT Break
- The existing `login-page` smoke test is a different ID (`login-page`) — no conflict
- The existing `signup-page` smoke test is also separate — no conflict
- Full `signup_login_flow` implementation can be a Phase 2 genome task (separate PRD)

---

## Verification Steps (Run After Making the Change)

1. **Validate JSON is still valid:**
   ```bash
   cd /Users/clawdbot/projects/leadflow
   node -e "JSON.parse(require('fs').readFileSync('project.config.json', 'utf8')); console.log('JSON valid')"
   ```

2. **Confirm the old config is gone:**
   ```bash
   grep -c "signup_login_flow" /Users/clawdbot/projects/leadflow/project.config.json
   # Expected output: 0
   ```

3. **Commit the change:**
   ```bash
   cd /Users/clawdbot/projects/leadflow
   git add project.config.json
   git commit -m "fix: replace signup_login_flow smoke test with http_200 (stops loop)"
   git push
   ```

4. **Wait for next heartbeat.** The smoke test should now pass. No new "Auth: signup then login failing" tasks should be created.

---

## Acceptance Criteria

1. `project.config.json` smoke_tests array contains NO entry with `check_type: "signup_login_flow"`
2. `project.config.json` contains entry with `id: "auth-signup-login-flow"` and `check_type: "http_200"`
3. `node -e "JSON.parse(...)"` validates the JSON is well-formed
4. Change is committed and pushed to git
5. No new "Smoke: Auth: signup then login failing" tasks are created in the next 2 heartbeat cycles

---

## Security Requirements (Maintained From Prior Auth PRDs)

This is a smoke test config change only. No auth code changes. Auth security requirements from PRD-BILLING remain in effect:
- Passwords: bcrypt (already implemented)
- Tokens: stored as hashed values (already implemented)
- Session cookies: httpOnly, secure, expiring (already implemented)
- Auth middleware on protected routes (already implemented)
- Input validation and rate limiting (already implemented)
- Error messages do not leak email existence (already implemented)

---

## What Is Out of Scope (Do NOT Do)

- Do NOT modify `~/.openclaw/genome/health/smoke-tests.js`
- Do NOT add `signup_login_flow` to CHECK_FUNCTIONS
- Do NOT modify any auth routes
- Do NOT create any scripts
- Do NOT modify any other files

**This is a one-block JSON replacement in `project.config.json`. Nothing more.**

---

## Phase 2 (Future — Separate PRD)

If full signup+login flow testing is desired:
- Add `signup_login_flow` handler to `~/.openclaw/genome/health/smoke-tests.js`
- Handler must: POST to signup → capture token → POST to login → verify success
- Use `crypto.randomBytes()` for test account email generation to avoid collisions
- Create separate PRD targeting genome project

This is NOT part of the current task.
