# Free Pilot Onboarding — No Credit Card Required
## Integration Plan (Research & Planning)

**Decision ID:** 6293dfc3-01c5-4276-b024-df04fbdeda92  
**Task ID:** c46c180d-c35d-4dfd-ad49-0a0dbd19e3a5  
**Date:** 2026-03-10  
**Author:** Dev Agent  

---

## 1. Goal

Enable real estate agents to sign up for a free 60-day pilot without entering a credit card. Remove all payment friction from the onboarding funnel to maximize pilot signups at Day 22.

---

## 2. API Docs Reviewed

### 2.1 Existing Onboarding APIs

| Route | Method | Purpose | Table |
|-------|--------|---------|-------|
| `/api/onboarding/submit` | POST | Full agent account creation | `real_estate_agents` |
| `/api/onboarding/check-email` | GET/POST | Duplicate email check | `real_estate_agents` |
| `/api/onboarding/draft` | POST | Save draft progress | `onboarding_drafts` |
| `/api/onboarding/validate` | POST | Field validation | — |
| `/api/pilot-signup` | POST | Early-stage lead capture | `pilot_signups` |

**Key finding:** `/api/onboarding/submit` is the correct endpoint to modify. It inserts into `real_estate_agents` which is the customer table. It currently does NOT have Stripe payment flow — no credit card step is present in the API code.

### 2.2 Database Schema Analysis

**`real_estate_agents` table** (customer table — DO NOT confuse with `agents` orchestration table):

Current columns relevant to billing:
- `plan_tier` VARCHAR — currently accepts e.g. `'starter'`, `'pro'`
- `stripe_customer_id` VARCHAR — nullable (good)
- `subscription_status` VARCHAR — e.g. `'active'`, `'trialing'`
- `trial_ends_at` TIMESTAMP — for trial expiry

**Missing columns** (need migration):
- `pilot_started_at` TIMESTAMPTZ — nullable
- `pilot_expires_at` TIMESTAMPTZ — nullable

**⚠️ Schema Collision Risk:** The `agents` table in Supabase is the **AI orchestration table** (Dev, QC, Marketing agents). It has `project_id`, `agent_name`, `agent_type`. Do NOT insert real estate agents there. Always use `real_estate_agents`.

### 2.3 Email Integration

- **Library:** Resend (lazy-loaded via `resend` npm package)
- **Service file:** `product/lead-response/dashboard/lib/email-service.ts`
- **From address:** `billing@leadflow.ai` (configured via `FROM_EMAIL` env var in Vercel)
- **Templates:** Existing templates for subscription lifecycle (renewal, payment failed, cancelled)
- **Status:** `RESEND_API_KEY` needs to be set in Vercel (documented in `RESEND_SETUP.md`)

### 2.4 Telegram Notifications

- Telegram bot token available at `~/.env` → `ORCHESTRATOR_BOT_TOKEN`
- Orchestrator sends Telegram notifications via genome pipeline
- For new pilot signups: use the Telegram Bot API directly from the onboarding endpoint or via an `events` table trigger
- Pattern: `POST https://api.telegram.org/bot{token}/sendMessage`

### 2.5 Frontend Onboarding Flow

- Next.js app at `product/lead-response/dashboard/`
- Onboarding wizard with multi-step form
- No credit card step present in current codebase — **pilot flow can skip Stripe entirely**

---

## 3. Integration Plan

### 3.1 Database Migration

**File:** `sql/migration-pilot-fields.sql`

```sql
-- Add pilot tracking columns to real_estate_agents
ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS pilot_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pilot_expires_at TIMESTAMPTZ;

-- Add 'pilot' as valid plan_tier (if using CHECK constraint, update it)
-- Note: If plan_tier has a CHECK constraint, run:
-- ALTER TABLE real_estate_agents DROP CONSTRAINT IF EXISTS <constraint_name>;
-- ALTER TABLE real_estate_agents ADD CONSTRAINT check_plan_tier 
--   CHECK (plan_tier IN ('starter', 'pro', 'team', 'brokerage', 'pilot', 'free'));
```

**Run via:** `pg` module with `SUPABASE_DB_PASSWORD` (direct Postgres connection)

### 3.2 Onboarding Submit Route Changes

**File:** `product/lead-response/dashboard/app/api/onboarding/submit/route.ts`

Changes:
1. Set `plan_tier: 'pilot'` on insert
2. Set `pilot_started_at: NOW()`
3. Set `pilot_expires_at: NOW() + 60 days`
4. Set `stripe_customer_id: null` (already nullable — no change needed)
5. Remove any Stripe payment intent creation (not present — confirmed)
6. After insert: send pilot welcome email via Resend
7. After insert: notify Stojan via Telegram

### 3.3 Welcome Email Template

**File:** `product/lead-response/dashboard/lib/email-service.ts`

Add new template: `pilot_welcome`

```
Subject: 🎉 Welcome to LeadFlow AI — Your Free Pilot Has Started!
Body: 
- Welcome to 60-day free pilot
- No credit card required
- Next steps: connect FUB, Cal.com
- Support contact
- Pilot expiry date
```

### 3.4 Telegram Notification

After successful agent creation, fire-and-forget:
```
POST https://api.telegram.org/bot{ORCHESTRATOR_BOT_TOKEN}/sendMessage
{
  "chat_id": "<Stojan's chat ID>",
  "text": "🎉 New pilot agent signed up: {name} ({email}) - {brokerage}"
}
```

The Telegram chat ID is available in the existing orchestrator config.

### 3.5 Pilot Expiry Logic (Day 60)

**File:** `product/lead-response/dashboard/app/api/cron/` or heartbeat

Add expiry check:
- Query `real_estate_agents` where `plan_tier = 'pilot'` AND `pilot_expires_at < NOW()`
- Set `subscription_status = 'expired'` or similar
- Pause SMS sending for expired pilots by checking `pilot_expires_at` in SMS handler

---

## 4. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `sql/migration-pilot-fields.sql` | CREATE | DB migration script |
| `scripts/run-pilot-migration.js` | CREATE | Migration runner |
| `product/lead-response/dashboard/app/api/onboarding/submit/route.ts` | MODIFY | Set pilot fields, send email + Telegram |
| `product/lead-response/dashboard/lib/email-service.ts` | MODIFY | Add pilot welcome email template |
| `tests/pilot-onboarding.test.ts` | CREATE | Unit + integration tests |

---

## 5. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `agents` vs `real_estate_agents` schema collision | HIGH | Always use `real_estate_agents` for customer data |
| `RESEND_API_KEY` missing in Vercel | MEDIUM | Email send should be fire-and-forget (non-blocking) |
| Telegram bot token not in dashboard env | LOW | Read from Supabase config or `events` table |
| `plan_tier` CHECK constraint blocking 'pilot' | MEDIUM | Check and update constraint in migration |

---

## 6. Acceptance Criteria Validation

- [x] API docs reviewed — `real_estate_agents` schema, onboarding submit route, email-service, Telegram
- [x] Integration plan documented — above sections cover all required components

---

## 7. Sub-task Breakdown (Tasks 2-4)

| Task | Description |
|------|-------------|
| Task 2/4 | DB migration: add `pilot_started_at`, `pilot_expires_at` to `real_estate_agents` |
| Task 3/4 | Onboarding route: set pilot fields, welcome email, Telegram notification |
| Task 4/4 | Tests + deployment: unit tests, E2E smoke test, Vercel deploy |
