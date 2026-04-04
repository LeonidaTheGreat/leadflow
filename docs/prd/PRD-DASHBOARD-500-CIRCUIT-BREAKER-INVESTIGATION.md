---
id: prd-dashboard-500-circuit-breaker-2026-04-04
title: Dashboard 500 Investigation — Circuit Breaker Root Cause & Fix Path
status: active
created: 2026-04-04
---

# Dashboard 500 Investigation — Circuit Breaker Root Cause & Fix Path

## Summary

The circuit breaker tripped after 3 attempts ($10.50) on task "fix-next-js-customer-dashboard-not-deployed-users-cann". Investigation reveals two distinct issues:

1. **Genome spawn bug (P1):** Dev agents failed because the spawn script contained `cd 'undefined'` — `project_dir` resolved to `undefined`, causing every session to run in the wrong directory. No commits were possible.
2. **Dashboard 500s (P1):** The original "not deployed" framing is stale — the dashboard IS deployed to Vercel. However, all routes (`/signup`, `/login`, `/dashboard`, `/pricing`) return **HTTP 500 FUNCTION_INVOCATION_FAILED**.

## Recommendation: CHANGE APPROACH

- Cancel the original UC (it used wrong framing — "not deployed")
- Fix the genome spawn bug first (P1 genome task)
- Create a properly scoped task targeting the actual 500 errors

---

## Issue 1: Genome Spawn Bug — `cd 'undefined'`

### Root Cause
In all 3 dev agent spawns, the generated shell script (`~/.openclaw/genome/state/leadflow/spawn-logs/lf-2270ba8a-*-run.sh`) contained:

```sh
cd 'undefined'
```

This caused the agent to launch outside the project directory. All file reads, git operations, and commits silently failed or targeted the wrong directory.

### Where to fix
`spawn-consumer.js` in the genome repo — the `buildProjectContext()` or `getConfigForProject()` call returns `project_dir: undefined` for some task configurations. The run script generator must validate `project_dir` is truthy before writing the script, and abort with a clear error if not.

### Acceptance Criteria (genome fix)
- [ ] `grep -r "cd 'undefined'" ~/.openclaw/genome/state/` returns 0 results after fix
- [ ] Newly spawned agents have correct `cd /Users/clawdbot/projects/leadflow` in their run scripts
- [ ] Spawn pipeline validates `project_dir` before writing the shell script; throws if undefined

---

## Issue 2: Dashboard HTTP 500 — FUNCTION_INVOCATION_FAILED

### Current State
- **URL:** `leadflow-ai-five.vercel.app`
- **All routes:** Return HTTP 500 with `FUNCTION_INVOCATION_FAILED`
- **Deployment:** IS live and serving Next.js SSR (HTML returned for `/signup`)
- **Issue:** Runtime crash, not a build/deployment failure

### Likely Root Causes (in priority order)
1. **Missing Vercel env vars** — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or other required vars not set in Vercel project settings for `leadflow-ai`
2. **Rescue branch not merged** — `dev/559f08af-dev-rescue-fix-dashboard-build-errors` contains fixes for env validation, `@ai-sdk/openai` dependency, and turbopack config removal — none merged to main
3. **Import errors** — A missing or misconfigured dependency causes the function to crash at module import time

### Fix Path
1. Check Vercel project `leadflow-ai` env vars in dashboard — compare against `.env.example` or required vars list
2. Review and merge `dev/559f08af-dev-rescue-fix-dashboard-build-errors` after verification
3. Re-run smoke tests after merge to confirm 500s resolved

### Acceptance Criteria (dashboard fix)
- [ ] `curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/signup` returns `200`
- [ ] `curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/login` returns `200`
- [ ] `curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/api/health` returns `200`
- [ ] No FUNCTION_INVOCATION_FAILED in Vercel function logs

---

## User Impact

- **Severity:** Critical / P1 — signup and login are broken for all users
- **Blast radius:** All external users cannot access the product
- **Duration:** Ongoing — all 3 retry attempts failed due to spawn bug, not a code problem

---

## Tasks to Create

### Task 1 (Genome, P1): Fix `cd 'undefined'` spawn bug
- **Project:** `genome`
- **File:** `~/.openclaw/genome/core/spawn-consumer.js`
- **Scope:** Validate `project_dir` before writing run script; abort spawn with error if undefined
- **Estimated size:** Small (< 20 lines changed)

### Task 2 (LeadFlow, P1): Fix dashboard 500s
- **Project:** `leadflow`
- **Scope:** Audit Vercel env vars, review rescue branch, identify and fix the runtime crash
- **Starting point:** `dev/559f08af-dev-rescue-fix-dashboard-build-errors`
- **Do NOT:** Re-create deployment from scratch — the deployment is fine

---

## What NOT to Do

- Do NOT re-spawn the original "not deployed" task — the framing is wrong and will fail again
- Do NOT increase the budget on the original task — the failures were environment failures, not complexity failures
- Do NOT create a new dev task without first fixing the genome spawn bug (it would fail the same way)
