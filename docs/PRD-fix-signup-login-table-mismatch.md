# PRD: Fix Signup/Login Table Mismatch — Remaining `agents` Table References

**PRD ID:** prd-fix-signup-login-table-mismatch  
**Status:** approved  
**Priority:** High  
**Created:** 2025-07-15  
**Author:** Product Manager  

---

## Problem Statement

LeadFlow has two tables with confusingly similar names:
- `real_estate_agents` — the **customer** table (real estate agents who pay for LeadFlow)
- `agents` — the **orchestrator task** table (AI agent task assignments, no customer data)

Previous fixes (UC `fix-agents-table-mismatch-auth-routes`, `fix-remaining-agents-table-references`) corrected the login, signup, onboarding, check-email, profile, Stripe webhook, and other critical routes. However, **5 remaining references** still query `from('agents')` instead of `from('real_estate_agents')` in product routes:

### Affected Files

| File | Line(s) | Impact |
|------|---------|--------|
| `app/api/agents/satisfaction-ping/route.ts` | 26, 63 | Reads/writes satisfaction config on orchestrator table — never finds customer records |
| `app/api/satisfaction/stats/route.ts` | 26 | Queries satisfaction stats from wrong table — returns empty/wrong data |
| `app/api/debug/test-formdata/route.ts` | 9 | Debug route queries wrong table |
| `app/api/debug/test-full-flow/route.ts` | 9 | Debug route queries wrong table |

### User Impact

- **Satisfaction ping toggle:** Agent enables/disables satisfaction pings → update goes to `agents` table → has no effect on their actual record in `real_estate_agents`. Feature silently broken.
- **Satisfaction stats:** Admin views satisfaction metrics → queries `agents` table → returns zero or garbage data.
- **Debug routes:** Lower severity but will produce misleading results during troubleshooting.

---

## Solution

Replace all `supabase.from('agents')` with `supabase.from('real_estate_agents')` in the affected product routes. No schema changes needed — `real_estate_agents` already has the required columns (`satisfaction_ping_enabled`, `updated_at`, etc.).

---

## Requirements

### FR-1: Fix satisfaction-ping route
- `app/api/agents/satisfaction-ping/route.ts` line 26: change `.from('agents')` to `.from('real_estate_agents')`
- `app/api/agents/satisfaction-ping/route.ts` line 63: change `.from('agents')` to `.from('real_estate_agents')`
- PATCH request must successfully toggle `satisfaction_ping_enabled` on a real customer record

### FR-2: Fix satisfaction stats route
- `app/api/satisfaction/stats/route.ts` line 26: change `.from('agents')` to `.from('real_estate_agents')`
- GET request must return stats aggregated from actual customer records

### FR-3: Fix debug routes
- `app/api/debug/test-formdata/route.ts` line 9: change `.from('agents')` to `.from('real_estate_agents')`
- `app/api/debug/test-full-flow/route.ts` line 9: change `.from('agents')` to `.from('real_estate_agents')`

### FR-4: Verification sweep
- Run `grep -rn "from('agents')" app/ lib/` in the dashboard directory
- Confirm zero remaining `from('agents')` references (excluding any intentional orchestrator queries, which should not exist in product routes)

---

## Acceptance Criteria

1. **All 5 occurrences** of `from('agents')` in the listed files are replaced with `from('real_estate_agents')`
2. No other product route files contain `from('agents')` references
3. `PATCH /api/agents/satisfaction-ping` successfully updates a record in `real_estate_agents`
4. `GET /api/satisfaction/stats` returns data sourced from `real_estate_agents`
5. Existing login, signup, onboarding, profile, and webhook routes remain unaffected (already correct)
6. `npm run build` passes with no TypeScript errors

---

## Out of Scope

- The original login/signup mismatch (already fixed in previous UCs)
- Schema changes to `real_estate_agents` table
- Renaming the `agents` table or creating a `customers` table alias

---

## Test Plan

| Test | Method | Expected Result |
|------|--------|-----------------|
| Grep sweep | `grep -rn "from('agents')" app/ lib/` | Zero matches in product routes |
| Satisfaction toggle | PATCH `/api/agents/satisfaction-ping` with valid agentId | 200 OK, record updated in `real_estate_agents` |
| Satisfaction stats | GET `/api/satisfaction/stats` | Returns aggregated data from `real_estate_agents` |
| Build | `npm run build` | Success, no TypeScript errors |
| Login flow | POST `/api/auth/login` | Still works (regression check) |
| Signup flow | POST `/api/auth/trial-signup` | Still works (regression check) |
