# PRD: Fix Onboarding 500 Error — Agents Table Schema Alignment

**Document ID:** PRD-FIX-ONBOARDING-500-001  
**Version:** 1.0  
**Date:** March 6, 2026  
**Status:** Specification Complete — Ready for Dev Implementation  
**Related:** fix-onboarding-500-error use case

---

## 1. Problem Statement

### 1.1 Current Failure
The onboarding endpoint `/api/agents/onboard` returns a **500 error**, completely blocking new user signups. This is a **P0-CRITICAL** blocker preventing all revenue.

### 1.2 Root Cause Analysis

**The Schema Collision Problem:**

1. **Two different `agents` tables exist in the same Supabase database:**
   - **Orchestrator `agents` table**: Contains OpenClaw agent metadata (columns: `project_id`, `agent_name`, `agent_type`, `status`, `progress_percent`, etc.)
   - **Product `agents` table** (intended): Should contain real estate agent customer data (columns: `email`, `password_hash`, `first_name`, `stripe_customer_id`, etc.)

2. **The collision occurred because:**
   - The orchestrator's `agents` table was created first for tracking OpenClaw agents
   - The product's onboarding code tries to use the same `agents` table name
   - The product's expected columns (`email`, `password_hash`) don't exist in the orchestrator table
   - Queries fail with column-not-found errors

3. **Current Database State:**
   - `agents` table: EXISTS (contains orchestrator data, 5 rows)
   - `real_estate_agents` table: EXISTS (empty, created by migration 013)
   - `customers` table: DOES NOT EXIST
   - Code files: Still reference old `agents` table (16+ files)

4. **QC Failure Evidence:**
   - 12 endpoints still query the old `agents` table
   - Only 4 of 16 files were updated in previous attempt
   - Migration 013 exists but code changes incomplete

---

## 2. Solution Overview

### 2.1 Decision: Use `real_estate_agents` Table

**Rationale:**
- Migration `013_fix_agents_schema_collision.sql` already created `real_estate_agents`
- This name is explicit and avoids future confusion
- Changing to `customers` would require redoing the migration
- The `real_estate_agents` table has the correct schema for product data

### 2.2 Implementation Strategy

**Phase 1: Update All Code References** (Dev task)
- Update 16+ files that reference `.from('agents')` to `.from('real_estate_agents')`
- Files span: API routes, webhook handlers, debug endpoints, scripts

**Phase 2: Update Foreign Key References** (Dev task)
- Update `agent_integrations.agent_id` foreign key
- Update `agent_settings.agent_id` foreign key
- Update any other tables referencing the old table

**Phase 3: Verification** (QC task)
- Run E2E tests for all affected endpoints
- Verify signup → login → dashboard flow works
- Confirm no 500 errors

---

## 3. Files Requiring Updates

### 3.1 API Routes (Dashboard)

| File | Current Table | Line Count | Priority |
|------|---------------|------------|----------|
| `product/lead-response/dashboard/app/api/agents/check-email/route.ts` | `agents` | ~1 | P0 |
| `product/lead-response/dashboard/app/api/agents/profile/route.ts` | `agents` | ~2 | P0 |
| `product/lead-response/dashboard/app/api/onboarding/check-email/route.ts` | `agents` | ~1 | P0 |
| `product/lead-response/dashboard/app/api/onboarding/submit/route.ts` | `agents` | ~2 | P0 |
| `product/lead-response/dashboard/app/api/health/route.ts` | `agents` | ~1 | P0 |
| `product/lead-response/dashboard/app/api/stripe/portal-session/route.ts` | `agents` | ~3 | P1 |
| `product/lead-response/dashboard/app/api/webhooks/stripe/route.ts` | `agents` | ~4 | P1 |
| `product/lead-response/dashboard/app/api/webhook/route.ts` | `agents` | ~1 | P1 |
| `product/lead-response/dashboard/app/api/webhook/fub/route.ts` | `agents` | ~2 | P1 |
| `product/lead-response/dashboard/app/api/webhook/twilio/route.ts` | `agents` | ~2 | P1 |
| `product/lead-response/dashboard/app/api/debug/test-formdata/route.ts` | `agents` | ~1 | P2 |
| `product/lead-response/dashboard/app/api/debug/test-full-flow/route.ts` | `agents` | ~1 | P2 |

### 3.2 Library/Utility Files

| File | Current Table | Priority |
|------|---------------|----------|
| `product/lead-response/dashboard/lib/supabase.ts` | `agents` | P0 |
| `product/lead-response/dashboard/scripts/validate-system.ts` | `agents` | P2 |
| `product/lead-response/dashboard/scripts/update-dashboard.ts` | `agents` | P2 |

### 3.3 Root-Level Files (Non-Dashboard)

| File | Current Table | Priority |
|------|---------------|----------|
| `check-agents-table.js` | `agents` | P2 |
| `query-project.js` | `agents` | P2 |

---

## 4. Database Schema Reference

### 4.1 `real_estate_agents` Table Structure

```sql
CREATE TABLE real_estate_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  state TEXT,
  status TEXT DEFAULT 'onboarding',
  timezone TEXT DEFAULT 'America/New_York',
  email_verified BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  plan_tier TEXT,
  mrr INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);
```

### 4.2 Related Tables

```sql
-- agent_integrations
CREATE TABLE agent_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  cal_com_link TEXT,
  twilio_phone_number TEXT,
  follow_up_boss_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- agent_settings
CREATE TABLE agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  auto_response_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 5. User Stories

### US-1: New User Signup
**As a** real estate agent  
**I want to** complete the onboarding wizard without errors  
**So that** I can create my account and access the dashboard  

**Acceptance Criteria:**
- Onboarding form submits successfully
- Account created in `real_estate_agents` table
- User can immediately log in after signup
- No 500 errors in browser console

### US-2: Email Uniqueness Check
**As a** prospective user  
**I want to** know if my email is already registered  
**So that** I can either login or use a different email  

**Acceptance Criteria:**
- `/api/onboarding/check-email` returns correct availability status
- Check queries `real_estate_agents` table
- Response time < 200ms

### US-3: User Profile Access
**As a** logged-in user  
**I want to** view and edit my profile  
**So that** my information is up to date  

**Acceptance Criteria:**
- `/api/agents/profile` returns user data from `real_estate_agents`
- Profile updates persist to correct table
- Changes reflect immediately in dashboard

### US-4: Health Check Passes
**As a** system administrator  
**I want** the health endpoint to verify database connectivity  
**So that** I know the system is operational  

**Acceptance Criteria:**
- `/api/health` queries `real_estate_agents` successfully
- Returns 200 status when database is healthy
- Returns meaningful error if database connection fails

### US-5: Webhook Integration
**As a** user with active integrations  
**I want** webhooks to correctly associate data with my account  
**So that** leads and events appear in my dashboard  

**Acceptance Criteria:**
- FUB webhook finds correct agent by ID from `real_estate_agents`
- Twilio webhook finds correct agent by phone number
- Stripe webhook updates correct agent record

---

## 6. Acceptance Criteria

### 6.1 Functional Requirements

| ID | Requirement | Priority | Test Method |
|----|-------------|----------|-------------|
| FR-1 | All 16+ files updated to use `real_estate_agents` | P0 | Code review + grep |
| FR-2 | Onboarding endpoint returns 200 for valid requests | P0 | E2E test |
| FR-3 | User record created in `real_estate_agents` on signup | P0 | DB verification |
| FR-4 | Login queries `real_estate_agents` table | P0 | E2E test |
| FR-5 | Email uniqueness check queries correct table | P0 | E2E test |
| FR-6 | Profile endpoints use correct table | P0 | E2E test |
| FR-7 | Health check uses correct table | P0 | E2E test |
| FR-8 | All webhook handlers use correct table | P1 | E2E test |
| FR-9 | Stripe integration uses correct table | P1 | E2E test |
| FR-10 | Foreign key constraints remain valid | P1 | DB verification |

### 6.2 Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-1 | No regression in existing functionality | P0 |
| NFR-2 | Query performance remains < 200ms | P1 |
| NFR-3 | No data loss during migration | P0 |
| NFR-4 | Backward compatibility not required (no existing users to migrate) | P2 |

---

## 7. E2E Test Specifications

### E2E-ONBOARD-001: Successful Signup Flow

**Preconditions:**
- Database has `real_estate_agents` table
- No existing user with test email

**Steps:**
1. POST `/api/onboarding/check-email` with new email
2. Verify response: `{ available: true }`
3. POST `/api/onboarding/submit` with complete profile
4. Verify response: 200 status, user object returned
5. Query database: verify record in `real_estate_agents`
6. POST `/api/auth/login` with credentials
7. Verify successful login
8. GET `/api/agents/profile`
9. Verify profile data matches signup data

**Expected Result:** All steps pass without 500 errors

### E2E-ONBOARD-002: Email Already Exists

**Steps:**
1. Create user in `real_estate_agents` with email `test@example.com`
2. POST `/api/onboarding/check-email` with `test@example.com`

**Expected Result:** `{ available: false }`

### E2E-ONBOARD-003: Health Check

**Steps:**
1. GET `/api/health`

**Expected Result:** 
- Status 200
- Database connectivity confirmed
- No errors in logs

### E2E-ONBOARD-004: End-to-End User Journey

**Steps:**
1. Navigate to landing page
2. Click "Get Started" CTA
3. Complete Step 1: Email/password
4. Complete Step 2: Profile info
5. Complete Step 3: Integrations (optional)
6. Submit onboarding
7. Verify redirect to dashboard
8. Verify user data displayed correctly

**Expected Result:** Complete flow works without errors

---

## 8. Implementation Notes

### 8.1 Search Pattern for Updates

Use these grep patterns to find all files needing updates:

```bash
# Find all .from('agents') references
grep -r "\.from('agents')" --include="*.ts" --include="*.js" . | grep -v node_modules | grep -v ".next"

# Find all table references in SQL
grep -r "agents" --include="*.sql" . | grep -v "real_estate_agents"
```

### 8.2 Critical Files (Must Update)

1. **Onboarding submit route** — Creates user records
2. **Login route** — Authenticates users
3. **Check-email route** — Prevents duplicates
4. **Profile route** — Reads/updates user data
5. **Health route** — System health checks

### 8.3 Migration Status

- ✅ Migration 013 exists and creates `real_estate_agents`
- ✅ Table exists in database
- ❌ Code files still reference `agents`
- ❌ No data migration needed (table is empty, no existing users)

---

## 9. Rollback Plan

**If issues occur:**

1. **Database:** No rollback needed — `agents` table (orchestrator) untouched
2. **Code:** Revert to previous commit
3. **Data:** No user data at risk — `real_estate_agents` is currently empty

---

## 10. Success Criteria

This PRD is successful when:

- [ ] All 16+ code files updated to use `real_estate_agents`
- [ ] Onboarding endpoint returns 200 (not 500)
- [ ] New users can complete signup → login → dashboard flow
- [ ] E2E-ONBOARD-001 test passes
- [ ] E2E-ONBOARD-004 test passes
- [ ] No references to `.from('agents')` remain in product code
- [ ] QC verification confirms fix

---

## 11. Related Documents

- **Revenue Recovery PRD:** `docs/PRD-REVENUE-RECOVERY-001.md`
- **Migration File:** `supabase/migrations/013_fix_agents_schema_collision.sql`
- **Use Case:** `fix-onboarding-500-error` (in Supabase)
- **QC Failure Report:** `completion-reports/COMPLETION-0099e68e-cdfd-4036-99e8-a0ade780d93f-1772800051338.json`

---

*This PRD is ready for Dev implementation. The specification is complete and unambiguous.*
