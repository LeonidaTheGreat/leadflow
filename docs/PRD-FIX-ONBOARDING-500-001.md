# PRD: Fix Onboarding 500 Error — Complete Agents Table Migration

**Document ID:** PRD-FIX-ONBOARDING-500-001  
**Version:** 1.1  
**Status:** Approved  
**Last Updated:** 2026-03-06  
**Owner:** Product Manager

---

## 1. Overview

### 1.1 Problem Statement
The onboarding endpoint `/api/agents/onboard` returns a 500 error due to a schema collision between the orchestrator's `agents` table (used for project management) and the product's `agents` table (used for real estate agent customer data). Both tables exist in the same Supabase database with different schemas, causing queries to fail.

### 1.2 Root Cause
- The orchestrator uses an `agents` table with columns: `project_id`, `agent_name`, `agent_type`, `status`
- The product uses an `agents` table with columns: `email`, `password_hash`, `first_name`, `last_name`, `phone_number`, etc.
- When the product queries `from('agents')`, it sometimes hits the wrong table or gets schema conflicts

### 1.3 Solution
Rename the product `agents` table to `real_estate_agents` and update ALL code references across the entire codebase.

---

## 2. Migration Requirements

### 2.1 Database Changes (Migration 013)
✅ **COMPLETED**

- Created `real_estate_agents` table with proper schema
- Created `agent_integrations` table with FK to `real_estate_agents`
- Created `agent_settings` table with FK to `real_estate_agents`
- Added RLS policies for security
- Data migration from old tables

### 2.2 Code Changes Required

#### Phase 1: Critical API Routes (COMPLETED)
✅ `product/lead-response/dashboard/app/api/agents/onboard/route.ts`
✅ `product/lead-response/dashboard/app/api/agents/create/route.ts`
✅ `product/lead-response/dashboard/app/api/auth/login/route.ts`

#### Phase 2: Remaining API Routes (PENDING - 15+ files)
- `product/lead-response/dashboard/app/api/agents/check-email/route.ts`
- `product/lead-response/dashboard/app/api/agents/profile/route.ts`
- `product/lead-response/dashboard/app/api/onboarding/check-email/route.ts`
- `product/lead-response/dashboard/app/api/onboarding/submit/route.ts`
- `product/lead-response/dashboard/app/api/webhook/route.ts`
- `product/lead-response/dashboard/app/api/webhook/fub/route.ts`
- `product/lead-response/dashboard/app/api/webhook/twilio/route.ts`
- `product/lead-response/dashboard/app/api/webhooks/stripe/route.ts`
- `product/lead-response/dashboard/app/api/stripe/portal-session/route.ts`
- `product/lead-response/dashboard/app/api/health/route.ts`

#### Phase 3: Library Files (PENDING - 7 files)
- `product/lead-response/dashboard/lib/supabase.ts` (4 queries)
- `lib/subscription-service.js` (3 queries)
- `lib/webhook-processor.js` (2 queries)
- `lib/billing-cycle-manager.js` (1 query)
- `lib/calcom-webhook-handler.js` (1 query)
- `lib/booking-link-service.js` (1 query)

#### Phase 4: Scripts and Utilities (PENDING - 5 files)
- `product/lead-response/dashboard/scripts/validate-system.ts`
- `product/lead-response/dashboard/scripts/update-dashboard.ts`
- `check-agents-table.js`
- `query-project.js`
- `test-onboarding-fix.js`

---

## 3. Acceptance Criteria

### 3.1 Database Migration
- [x] Migration 013 runs successfully
- [x] `real_estate_agents` table exists with correct schema
- [x] `agent_integrations` table exists with FK constraint
- [x] `agent_settings` table exists with FK constraint
- [x] RLS policies are enabled and correct
- [x] Existing data is migrated (if any)

### 3.2 API Endpoints
- [x] POST `/api/agents/onboard` - Creates agent in `real_estate_agents`
- [x] POST `/api/agents/create` - Creates agent in `real_estate_agents`
- [x] POST `/api/auth/login` - Queries `real_estate_agents`
- [ ] GET `/api/agents/profile` - Queries `real_estate_agents`
- [ ] GET `/api/agents/check-email` - Queries `real_estate_agents`
- [ ] POST `/api/onboarding/submit` - Creates agent in `real_estate_agents`
- [ ] GET `/api/onboarding/check-email` - Queries `real_estate_agents`
- [ ] POST `/api/stripe/portal-session` - Queries `real_estate_agents`
- [ ] POST `/api/webhooks/stripe` - Updates `real_estate_agents`
- [ ] All webhook handlers query `real_estate_agents`
- [ ] Health check queries `real_estate_agents`

### 3.3 Library Functions
- [ ] `lib/supabase.ts` - All 4 functions use `real_estate_agents`
- [ ] `lib/subscription-service.js` - All 3 functions use `real_estate_agents`
- [ ] `lib/webhook-processor.js` - All functions use `real_estate_agents`
- [ ] `lib/billing-cycle-manager.js` - Uses `real_estate_agents`
- [ ] `lib/calcom-webhook-handler.js` - Uses `real_estate_agents`
- [ ] `lib/booking-link-service.js` - Uses `real_estate_agents`

### 3.4 E2E Test Results
- [ ] Complete signup flow works without 500 errors
- [ ] Login works with migrated table
- [ ] Billing portal loads subscription details
- [ ] Stripe webhooks process correctly
- [ ] Dashboard displays agent data

---

## 4. E2E Test Specifications

### E2E-ONBOARD-001: Successful Signup Flow
**URL:** https://leadflow-ai-five.vercel.app  
**Steps:**
1. Navigate to landing page
2. Click "Get Started"
3. Complete onboarding form (email, password, name, phone, state)
4. Submit form
5. Verify 200 response
6. Query DB: `SELECT * FROM real_estate_agents WHERE email = 'test@example.com'`
7. Verify record exists

**Expected:** No 500 errors, agent created in `real_estate_agents`

### E2E-ONBOARD-002: Login with Migrated Table
**Steps:**
1. Create agent in `real_estate_agents`
2. POST `/api/auth/login` with credentials
3. Verify 200 response with agent data

**Expected:** Login succeeds, returns agent from `real_estate_agents`

### E2E-ONBOARD-003: Billing Portal Access
**Steps:**
1. Log in as agent
2. Navigate to Settings > Billing
3. Verify subscription details load

**Expected:** Billing portal loads without "Agent not found" error

### E2E-ONBOARD-004: Stripe Webhook Processing
**Steps:**
1. Simulate Stripe webhook (customer.subscription.updated)
2. Verify webhook handler updates `real_estate_agents`

**Expected:** Webhook processes, subscription status updated

### E2E-ONBOARD-005: Health Check
**Steps:**
1. GET `/api/health`
2. Verify database connectivity

**Expected:** Status 200, confirms `real_estate_agents` table accessible

---

## 5. Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Migration 013 | ✅ Complete | Tables created, RLS enabled |
| Core API Routes | ✅ Complete | Onboard, create, login |
| Remaining API Routes | ❌ Incomplete | 12+ files need updates |
| Library Files | ❌ Incomplete | 7 files need updates |
| Scripts/Utils | ❌ Incomplete | 5 files need updates |
| E2E Tests | ⚠️ Not Run | Blocked by incomplete code |

---

## 6. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Partial migration causes 500 errors | High | High | Complete all file updates before deploying |
| Foreign key constraints break | High | Medium | Test all related table operations |
| Billing operations fail | Critical | High | Priority: Update billing-related files first |
| Webhook processing fails | High | High | Test Stripe webhooks after update |

---

## 7. Next Steps

1. **Dev Task:** Update all remaining files (24+ total) to use `real_estate_agents`
2. **Priority Order:**
   - Billing-related files (`subscription-service.js`, `webhook-processor.js`, `billing-cycle-manager.js`)
   - API routes (`profile`, `check-email`, `stripe/*`, `webhooks/*`)
   - Library files (`supabase.ts`)
   - Scripts and utilities
3. **QC Task:** Run full E2E test suite after all updates
4. **Deploy:** Only after all tests pass

---

## 8. Files Requiring Updates (Complete List)

```
# API Routes (12 files)
product/lead-response/dashboard/app/api/agents/check-email/route.ts
product/lead-response/dashboard/app/api/agents/profile/route.ts
product/lead-response/dashboard/app/api/onboarding/check-email/route.ts
product/lead-response/dashboard/app/api/onboarding/submit/route.ts
product/lead-response/dashboard/app/api/webhook/route.ts
product/lead-response/dashboard/app/api/webhook/fub/route.ts
product/lead-response/dashboard/app/api/webhook/twilio/route.ts
product/lead-response/dashboard/app/api/webhooks/stripe/route.ts
product/lead-response/dashboard/app/api/stripe/portal-session/route.ts
product/lead-response/dashboard/app/api/health/route.ts
product/lead-response/dashboard/app/api/debug/test-formdata/route.ts
product/lead-response/dashboard/app/api/debug/test-full-flow/route.ts

# Library Files (6 files)
product/lead-response/dashboard/lib/supabase.ts
lib/subscription-service.js
lib/webhook-processor.js
lib/billing-cycle-manager.js
lib/calcom-webhook-handler.js
lib/booking-link-service.js

# Scripts (5 files)
product/lead-response/dashboard/scripts/validate-system.ts
product/lead-response/dashboard/scripts/update-dashboard.ts
check-agents-table.js
query-project.js
test-onboarding-fix.js
```

---

## 9. Verification Checklist

Before marking this use case complete:
- [ ] All 24+ files updated to use `real_estate_agents`
- [ ] No references to `from('agents')` remain (except orchestrator-related)
- [ ] All E2E tests pass
- [ ] Billing portal loads without errors
- [ ] Stripe webhooks process correctly
- [ ] Signup → Login → Dashboard flow works end-to-end
