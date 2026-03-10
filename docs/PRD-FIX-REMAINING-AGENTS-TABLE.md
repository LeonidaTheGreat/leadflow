# PRD: Fix Remaining `agents` Table References in Product Routes

**PRD ID:** PRD-FIX-REMAINING-AGENTS-TABLE  
**Version:** 1.0  
**Status:** Approved  
**Priority:** P0 — Blocking signup, billing, and webhooks  
**Use Case:** fix-remaining-agents-table-references  
**Project:** LeadFlow AI (leadflow)

---

## Summary

The `/api/auth/login` route was already corrected to query `real_estate_agents`. However, **15 product route files** still call `supabase.from('agents')` — the Orchestrator task table — instead of `supabase.from('real_estate_agents')` — the customer table. This causes silent read/write failures across signup, profile, billing, and webhook flows.

---

## Background

LeadFlow has two distinct Supabase tables with confusingly similar semantics:

| Table | Purpose |
|-------|---------|
| `agents` | **Orchestrator task table** — records for AI agent tasks (dev, qc, product). NOT customer data. |
| `real_estate_agents` | **Customer table** — real estate agent accounts, email, password_hash, plan_tier, MRR, Stripe IDs |

The `fix-agents-table-mismatch-auth-routes` UC was previously marked complete, but 15 files were not updated. This PRD covers the remaining cleanup.

---

## Affected Files

All files in `product/lead-response/dashboard/`:

| File | Issue |
|------|-------|
| `app/api/agents/check-email/route.ts` | Email availability check queries `agents` |
| `app/api/agents/profile/route.ts` | GET/PUT profile queries `agents` |
| `app/api/agents/satisfaction-ping/route.ts` | Satisfaction triggers query `agents` (2 occurrences) |
| `app/api/onboarding/check-email/route.ts` | Duplicate email check queries `agents` |
| `app/api/onboarding/submit/route.ts` | New agent INSERT/SELECT goes to `agents` (2 occurrences) |
| `app/api/satisfaction/stats/route.ts` | Stats query `agents` |
| `app/api/stripe/portal-session/route.ts` | Stripe customer lookup queries `agents` (2 occurrences) |
| `app/api/webhook/route.ts` | Webhook agent lookup queries `agents` |
| `app/api/webhook/fub/route.ts` | FUB webhook agent lookup queries `agents` (2 occurrences) |
| `app/api/webhook/twilio/route.ts` | Twilio webhook agent lookup queries `agents` (2 occurrences) |
| `app/api/webhooks/stripe/route.ts` | Stripe event updates query `agents` (4 occurrences) |
| `lib/supabase.ts` | Shared helper may reference `agents` |
| `scripts/update-dashboard.ts` | Dashboard script queries `agents` |
| `scripts/validate-system.ts` | Validation script queries `agents` |

---

## Requirements

### FR-1: Auth & Email Check Routes
- `POST /api/agents/check-email` — change `.from('agents')` → `.from('real_estate_agents')`
- `POST /api/onboarding/check-email` — change `.from('agents')` → `.from('real_estate_agents')`
- Both routes check email availability for new signups; they MUST check the correct customer table

### FR-2: Profile Route
- `GET/PUT /api/agents/profile` — change `.from('agents')` → `.from('real_estate_agents')`
- Profile reads/writes customer account data; must target `real_estate_agents`

### FR-3: Onboarding Submit
- `POST /api/onboarding/submit` — change `.from('agents')` → `.from('real_estate_agents')`
- New customer INSERT must create records in `real_estate_agents`

### FR-4: Satisfaction Routes
- `/api/agents/satisfaction-ping` and `/api/satisfaction/stats` — change `.from('agents')` → `.from('real_estate_agents')`

### FR-5: Stripe Routes
- `GET /api/stripe/portal-session` — Stripe customer lookup must use `real_estate_agents`
- `POST /api/webhooks/stripe` — All Stripe event handlers (`customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`) must update `real_estate_agents`, not `agents`

### FR-6: Webhook Routes
- `/api/webhook/route.ts` — FUB/generic webhook agent lookup → `real_estate_agents`
- `/api/webhook/fub/route.ts` — FUB agent lookup → `real_estate_agents`
- `/api/webhook/twilio/route.ts` — Twilio SMS agent lookup → `real_estate_agents`

### FR-7: Shared Lib & Scripts
- `lib/supabase.ts` — review and fix any `agents` references
- `scripts/update-dashboard.ts` and `scripts/validate-system.ts` — fix `agents` references for customer data

### FR-8: No Regression
- **Do NOT change** `app/api/auth/login/route.ts` — already correct
- **Do NOT touch** any Orchestrator-specific code that legitimately reads from `agents`
- Run `npm test` after changes

---

## Acceptance Criteria

1. `grep -rn "from('agents')" product/ --include="*.ts"` returns **0 results** for customer-data routes (only orchestrator-specific code may remain, and should be clearly commented)
2. `POST /api/agents/check-email` with a new email returns `{ available: true }` (verified against `real_estate_agents`)
3. `POST /api/auth/login` still works (unchanged)
4. Stripe webhook for `customer.subscription.created` updates `real_estate_agents.plan_tier` and `real_estate_agents.mrr`
5. FUB webhook correctly looks up the agent from `real_estate_agents`
6. `npm test` passes with no new failures

---

## Out of Scope

- Schema changes (no migration needed — `real_estate_agents` table already exists with all required columns)
- Login route (already fixed)
- Orchestrator task table (`agents`) — must remain untouched

---

## Definition of Done

- All 15 files updated
- PR reviewed and merged
- QC agent verifies acceptance criteria in staging/production
- `fix-remaining-agents-table-references` UC marked `complete`
