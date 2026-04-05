# PRD: Fix Smoke Auth — Deploy Next.js Dashboard to Vercel

**PRD ID:** prd-fix-smoke-auth-deploy-dashboard
**Status:** approved
**Priority:** P1 — Blocker (smoke tests fire every heartbeat, burning budget)
**Created:** 2026-04-04
**Author:** Product Manager
**Task ID:** 5d4522c8-d2af-43c1-8e17-9008356d4c3b
**Use Case:** fix-smoke-auth-dashboard-not-deployed

---

## Problem

Three smoke tests are failing every heartbeat cycle:

| Smoke Test | URL | Expected | Actual |
|---|---|---|---|
| `login-page` | `https://leadflow-ai-five.vercel.app/login` | HTTP 200 | HTTP 500 |
| `signup-page` | `https://leadflow-ai-five.vercel.app/signup` | HTTP 200 | HTTP 500 |
| `vercel-dashboard` | `https://leadflow-ai-five.vercel.app/api/health` | JSON `{status: "ok"}` | HTTP 500 `FUNCTION_INVOCATION_FAILED` |

The Vercel project is linked (`product/lead-response/dashboard/.vercel/project.json` → `leadflow-ai`). The code exists. The deployment is either stale or the latest code is crashing at runtime.

---

## Root Cause Hypotheses (dev agent: diagnose in order)

**Hypothesis 1 (most likely): Stale deployment.**
The latest code has not been deployed. Vercel is serving an older build that has broken imports or crashes. Fix: deploy latest.

**Hypothesis 2: Runtime crash in serverless function.**
`FUNCTION_INVOCATION_FAILED` means the Node.js/Edge function throws an unhandled exception. The health route imports from `@/lib/db` — if that module fails to initialize (e.g., missing env var causes a top-level throw), every page crashes.

**Hypothesis 3: Middleware crash.**
`middleware.ts` runs on every request. If it throws (e.g., Edge runtime incompatible import, missing env var), ALL pages return 500.

---

## Fix Requirements

### Step 1 — Deploy Latest Code
```bash
cd /Users/clawdbot/projects/leadflow
git checkout main && git pull --ff-only

cd /Users/clawdbot/projects/leadflow/product/lead-response/dashboard
vercel --prod --scope stojans-projects-7db98187
```

After deploy, re-check smoke tests:
```bash
curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/login
curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/signup
curl -s https://leadflow-ai-five.vercel.app/api/health
```

If all return 200/valid JSON → DONE. Commit nothing (deploy-only fix).

### Step 2 — If Still Failing: Diagnose Logs
```bash
vercel logs https://leadflow-ai-five.vercel.app --scope stojans-projects-7db98187 2>&1 | head -100
```

Look for: import errors, missing env vars, Edge runtime incompatible packages.

### Step 3 — If Middleware is Crashing
Check `middleware.ts`. Common causes:
- A `require()` instead of `import` (Edge runtime doesn't support CommonJS requires)
- A package that doesn't support Edge runtime (check `edge-compatible` flag)
- A top-level `await` or sync call that throws before any response is sent

Fix: add defensive checks, ensure all imports are ESM-compatible.

### Step 4 — If Health Route is Crashing
The health route (`app/api/health/route.ts`) references Supabase keys in `criticalKeys` that no longer exist (Supabase was removed). The route checks env vars that aren't set → this returns HTTP 503 with `status: "degraded"`, NOT 500. A 503 from the health route is acceptable for the smoke test since `json_status_ok` checks for a parseable JSON response with a `status` field.

If the health route returns 500 instead of 503, the function is crashing before returning anything. Check for:
- Import of a module that doesn't exist or fails to load
- Top-level code in `lib/db.ts` that throws when env vars are absent

Fix: wrap the health route body in try/catch and always return valid JSON.

---

## Acceptance Criteria

All three must pass before declaring done:

1. **Login page reachable:** `curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/login` → `200`
2. **Signup page reachable:** `curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/signup` → `200`
3. **Health endpoint parseable:** `curl -s https://leadflow-ai-five.vercel.app/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status'))"` → prints a value (not crash)

The smoke tests in `project.config.json` use:
- `signup-page` / `login-page`: `check_type: "http_200"` → needs HTTP 200
- `vercel-dashboard`: `check_type: "json_status_ok"` → needs valid JSON with `status` key, any HTTP code

### Machine-Verifiable Checks (run before marking done)
```bash
# Check 1: login returns 200
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/login)
[ "$STATUS" = "200" ] && echo "PASS: login" || echo "FAIL: login got $STATUS"

# Check 2: signup returns 200
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/signup)
[ "$STATUS" = "200" ] && echo "PASS: signup" || echo "FAIL: signup got $STATUS"

# Check 3: health returns JSON with status field
curl -s https://leadflow-ai-five.vercel.app/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS: health status=' + d['status'])" 2>/dev/null || echo "FAIL: health not valid JSON"
```

---

## What NOT to Do

- Do NOT delete or recreate the `.vercel/project.json` — the project is already linked
- Do NOT run `vercel link` — already linked to `leadflow-ai`
- Do NOT modify smoke test config to ignore these failures — fix the root cause
- Do NOT add Supabase dependencies back — they were intentionally removed
- Do NOT modify env vars in Vercel dashboard without confirming they're missing first

---

## Env Vars (Vercel project: leadflow-ai)

Required vars (must be set in Vercel project settings, NOT local `.env`):
- `NEXT_PUBLIC_API_URL` — PostgREST API base URL (`https://api.imagineapi.org`)
- `NEXT_PUBLIC_API_KEY` — public API key
- `API_SECRET_KEY` — server-side API key
- `RESEND_API_KEY` — email service key
- `JWT_SECRET` — for JWT session tokens
- `NEXT_PUBLIC_POSTHOG_KEY` — analytics (optional, non-critical)

If any are missing: `vercel env ls --scope stojans-projects-7db98187` to list, then add via Vercel dashboard.

---

## Security Requirements

(N/A for this task — pure deployment fix, no new auth code)

---

## Out of Scope

- Fixing the health route's Supabase env var references (it degrades gracefully to `status: "degraded"`)
- Adding new smoke tests
- Modifying smoke test configuration

---

## Workflow

**Step 1/3 (PM):** This document ← you are here
**Step 2/3 (Dev):** Deploy + fix, verify all 3 acceptance checks pass
**Step 3/3 (QC):** Verify deployment, confirm smoke tests are green
