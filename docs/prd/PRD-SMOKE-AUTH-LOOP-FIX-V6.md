# PRD: Fix Auth Smoke Loop — V6 (Git-Conflict-Aware + Loop Detector Cooldown)

**PRD ID:** prd-smoke-auth-loop-fix-v6
**Status:** approved
**Priority:** Critical (P0 — loop burning agent budget every heartbeat)
**Created:** 2026-05-22
**Author:** Product Manager
**Task ID:** 5fdc6d0a-d3b1-416d-891b-58eb7213ee93
**Supersedes:** prd-smoke-auth-loop-fix-v5
**Linked Use Case:** fix-smoke-auth-signup-login-loop

---

## Why V5 Failed (And V1–V4 Before It)

Every previous PRD prescribed the same one-line JSON fix. Every dev agent either:
1. Hit a **git conflict** when trying to apply the change (confirmed by 5 `git_conflict` failure patterns in LEARNINGS)
2. Reported success without actually running the commit/push

**This is V6. It addresses BOTH issues:**
1. The `project.config.json` fix (same as V5) — with explicit git conflict resolution
2. A new **genome task** to add a cooldown to the PM loop-detector in `task-store.js`

---

## Root Cause (Final — Confirmed Across 10+ Tasks)

### Issue 1: Smoke Test Config (leadflow)
**File:** `/Users/clawdbot/projects/leadflow/project.config.json`

The smoke test entry uses:
- `check_type: "signup_login_flow"` — **does not exist in CHECK_FUNCTIONS**
- `base_url` + `signup_path` + `login_path` keys — **not read by `buildTests()`** (needs `url`)

Result: `testDef.url` is `undefined`, `CHECK_FUNCTIONS["signup_login_flow"]` is `undefined`.
Every run returns `{ pass: false, detail: "Unknown check_type: signup_login_flow" }`.
Every failure spawns a new smoke task. The circuit breaker fires after 3 retries, but resets on next cycle.

**Available CHECK_FUNCTIONS (confirmed from `~/.openclaw/genome/health/smoke-tests.js`):**
- `json_status_ok`
- `http_200`
- `html_contains`
- `supabase_read`

### Issue 2: Loop Detector Doesn't Self-Dedup (genome)
**File:** `~/.openclaw/genome/core/task-store.js` lines 139–152

The loop detector creates `PM: Loop detected — Smoke: Auth: signup then login failing` only when
no active (non-done/non-failed) PM loop task exists. Once the PM task completes, the loop
detector can create a NEW one the next cycle when smoke still fails. This generates infinite
PM loop-detected tasks, each consuming ~$0.50–$2.00.

**The check should also enforce a cooldown on the PM loop-detected task itself** (e.g., don't
create a new one if one completed in the last 24h for the same title prefix).

---

## Fix 1: project.config.json Patch (leadflow)

### Pre-Flight: Resolve Git Conflicts First

**Before making any change**, run:
```bash
cd /Users/clawdbot/projects/leadflow
git status
git pull origin main --rebase
```

If `project.config.json` shows conflicts:
```bash
git diff HEAD -- project.config.json
# If conflicted:
git checkout HEAD -- project.config.json   # reset to latest HEAD
git pull origin main                        # pull latest
```

### The Exact JSON Change

**File:** `/Users/clawdbot/projects/leadflow/project.config.json`

Find this exact block in the `smoke_tests` array:
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

Replace with:
```json
{
  "id": "auth-signup-login-flow",
  "name": "Auth: login page reachable",
  "url": "https://leadflow-ai-five.vercel.app/login",
  "severity": "critical",
  "check_type": "http_200",
  "note": "Downgraded from signup_login_flow (unimplemented check_type) — PRD-SMOKE-AUTH-LOOP-FIX-V6"
}
```

### Post-Change Verification
```bash
# 1. Validate JSON is still valid
node -e "JSON.parse(require('fs').readFileSync('project.config.json', 'utf8')); console.log('JSON valid')"

# 2. Confirm old config is gone
grep -c "signup_login_flow" /Users/clawdbot/projects/leadflow/project.config.json
# Expected: 0

# 3. Commit and push
git add project.config.json
git commit -m "fix: replace signup_login_flow smoke test with http_200 — stops loop (PRD-V6)"
git push origin main
```

---

## Fix 2: Loop Detector Cooldown (genome)

**File:** `~/.openclaw/genome/core/task-store.js`

**Location:** ~line 146 — the `if (!existingInv?.length)` check inside the loop detector block

**Current behavior:** Creates a new PM loop-detected task whenever no _active_ one exists.

**Required change:** Also check if a PM loop-detected task for this prefix was completed recently (within 24h). If it was, skip creating a new one.

### Spec for Genome Dev Agent

Replace the existing PM loop task dedup logic (approximately lines 146–151):

**Current:**
```javascript
const { data: existingInv } = await this.supabase.from('tasks').select('id').eq('project_id', this.projectId).eq('title', invTitle).not('status', 'in', '("done","failed","cancelled")').limit(1)
if (!existingInv?.length) {
  await this.supabase.from('tasks').insert({ ... }).select().single()
}
```

**Required:**
```javascript
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
const { data: existingInv } = await this.supabase.from('tasks')
  .select('id,status,updated_at')
  .eq('project_id', this.projectId)
  .eq('title', invTitle)
  .or(`status.not.in.("done","failed","cancelled"),updated_at.gte.${oneDayAgo}`)
  .limit(1)
if (!existingInv?.length) {
  await this.supabase.from('tasks').insert({ ... }).select().single()
}
```

**Explanation:** This prevents creating a new PM loop-detection task if:
- An active one already exists (existing behavior), OR
- One was completed/failed within the last 24 hours

---

## Acceptance Criteria

### Fix 1 — project.config.json (leadflow)
1. `project.config.json` smoke_tests array contains NO entry with `check_type: "signup_login_flow"`
2. Entry `id: "auth-signup-login-flow"` exists with `check_type: "http_200"` and `url` key
3. `node -e "JSON.parse(...)"` validates JSON is well-formed — exit code 0
4. Change is committed and pushed (no pending changes in `git status`)
5. No new `Smoke: Auth: signup then login failing` tasks created in next 2 heartbeat cycles
6. No new `PM: Loop detected — Smoke: Auth: signup then login failing` tasks in next 24h

### Fix 2 — task-store.js cooldown (genome)
7. Loop detector checks for recently-completed PM loop tasks (within 24h) before creating a new one
8. A PM loop-detected task completed within 24h prevents a duplicate from being created
9. The existing `if (!existingInv?.length)` guard is not removed — only enhanced

---

## Security Requirements

This is a smoke test config change and a loop-detector enhancement. No auth code changes.
Auth security requirements from prior PRDs remain in effect:
- Passwords: bcrypt (already implemented)
- Tokens: crypto.randomBytes(), stored as hashed values (already implemented)
- Session cookies: httpOnly, secure, with expiry (already implemented)
- Auth middleware on all protected routes (already implemented)
- Input validation and rate limiting on auth endpoints (already implemented)
- Error messages do not reveal whether email/username exists (already implemented)

---

## What Is Out of Scope

- Do NOT add `signup_login_flow` to CHECK_FUNCTIONS (separate genome PRD if desired)
- Do NOT modify auth routes
- Do NOT create any scripts that are left un-run

---

## Affected Projects

- **leadflow** — `project.config.json` smoke test config (Fix 1)
- **genome** — `~/.openclaw/genome/core/task-store.js` loop detector cooldown (Fix 2)

---

## Phase 2 (Future — Separate PRD)

Full signup+login flow testing:
- Add `signup_login_flow` handler to `~/.openclaw/genome/health/smoke-tests.js`
- Handler: POST to signup → capture token → POST to login → verify success
- Use `crypto.randomBytes()` for test account email generation to avoid collisions
- Separate PRD targeting genome project
