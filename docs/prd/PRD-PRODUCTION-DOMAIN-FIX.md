# PRD: Fix Production Domain leadflow-ai-five.vercel.app

**Status:** Active  
**Priority:** P1 — Blocker  
**Created:** 2026-04-04  
**Author:** PM Agent

## Problem

`leadflow-ai-five.vercel.app` returns HTTP 500 on all routes including `/`, `/login`, `/signup`, `/api/health`. The domain is completely non-functional for users.

Three dev agent attempts ($10.50 total) made zero code changes — they applied `vercel alias` CLI commands that get overridden on each subsequent Vercel deploy.

## Root Cause Analysis

Two separate issues compound:

### Issue 1: Domain Alias Configuration (Infrastructure)
Two Vercel projects fight over the alias:
- `leadflow` (Express/FUB webhook server) previously held the alias
- `leadflow-ai` (Next.js dashboard) should own it
- `vercel alias` commands are temporary — each project deploy resets the alias

**Fix:** Configure the domain in Vercel project settings UI/API permanently, not via CLI alias. This is a one-time infrastructure action.

### Issue 2: Next.js Runtime 500 Error (Code-Fixable)
Even when the alias points to the correct project, `leadflow-ai` returns `FUNCTION_INVOCATION_FAILED` on all routes. This indicates:
- Missing required environment variables in the Vercel `leadflow-ai` project
- Required env vars per `project.config.json`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `API_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`
- Likely missing: `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in the Vercel project environment

## Decomposed Approach

### UC-A: Investigate and fix Next.js 500 error on leadflow-ai Vercel project

**Goal:** `leadflow-ai-five.vercel.app/api/health` returns 200 and all routes render correctly.

**Acceptance Criteria:**
1. `curl https://leadflow-ai-five.vercel.app/api/health` returns HTTP 200
2. `curl https://leadflow-ai-five.vercel.app/` returns HTTP 200 or 307 redirect
3. No `FUNCTION_INVOCATION_FAILED` errors in Vercel function logs
4. Missing env vars identified and documented for Vercel project configuration

**Dev Approach:**
1. Check Vercel function logs for the specific error (`vercel logs --prod`)
2. Compare env vars configured in Vercel `leadflow-ai` project vs required vars in `project.config.json`
3. If env vars are missing: document exactly which ones need to be set (agent cannot set Vercel env vars — that's human action)
4. If it's a code error: fix the Next.js app runtime error in `product/lead-response/dashboard/`

**What dev agents CAN do:**
- Read Vercel function logs to identify exact error
- Add defensive null-checks in Next.js API routes that crash on missing env vars
- Add a `/api/health` route that explicitly checks and reports missing env vars
- Fix any import/module errors in the Next.js app

**What requires human action:**
- Setting env vars in the Vercel project dashboard
- Permanently assigning the domain alias at infrastructure level

### UC-B: Human Action — Configure domain permanently in Vercel

This is an `action_item` for Stojan, not a dev task:
- Go to Vercel dashboard → `leadflow-ai` project → Settings → Domains
- Add `leadflow-ai-five.vercel.app` as a domain (permanent, not alias)
- Remove it from `leadflow` project if present
- This prevents future deploys from fighting over the alias

## Success Metrics
- `leadflow-ai-five.vercel.app` returns non-500 on all routes
- Smoke tests: `vercel-dashboard`, `signup-page`, `login-page` pass consistently
- No circuit breaker re-trigger for this domain within 7 days

## Anti-Patterns (What NOT to do)
- DO NOT run `vercel alias` CLI commands — they are temporary and get overridden
- DO NOT spawn agents to "check if domain works" — check via curl directly
- DO NOT retry the same approach (CLI alias) a 4th time
