# PRD: fix-onboarding-500-error — Deployment Fix

**Document ID:** PRD-ONBOARDING-500-FIX  
**Version:** 1.0  
**Date:** March 6, 2026  
**Status:** Critical — Blocking Revenue  
**Related Use Case:** fix-onboarding-500-error

---

## 1. Problem Statement

### 1.1 Current State
The fix for the onboarding 500 error has been **implemented and merged to main** (commit `81e7bea`), but **NOT deployed to production**. The Vercel dashboard deployment is running stale code from 20+ hours ago.

### 1.2 Impact
- **Critical:** New users cannot sign up
- **Revenue Impact:** $0 MRR — complete funnel blockage
- **User Impact:** 100% signup failure rate

### 1.3 Root Cause
1. Dev completed the fix (migration + API updates)
2. Code was merged to main
3. **Deployment to Vercel was NOT executed**
4. QC tested production → found 500 error still present
5. QC task failed because production ≠ main

---

## 2. Solution

### 2.1 Immediate Action Required
Deploy the current main branch to Vercel production.

### 2.2 Deployment Steps

```bash
cd /Users/clawdbot/projects/leadflow/product/lead-response/dashboard
vercel --prod
```

### 2.3 Post-Deployment Verification

**Test 1: Onboarding Endpoint Health Check**
```bash
curl -X POST https://leadflow-ai-five.vercel.app/api/agents/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-verification@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User",
    "phoneNumber": "+15551234567",
    "state": "CA"
  }'
```
**Expected:** HTTP 201 with agent object (not 500)

**Test 2: Login Endpoint**
```bash
curl -X POST https://leadflow-ai-five.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-verification@example.com",
    "password": "TestPassword123!"
  }'
```
**Expected:** HTTP 200 with token (after email verification)

**Test 3: Database Schema Verification**
```sql
-- Verify real_estate_agents table exists with correct schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'real_estate_agents' 
ORDER BY ordinal_position;
```
**Expected:** All columns from migration 013 present

---

## 3. Acceptance Criteria

| # | Criteria | Verification Method |
|---|----------|---------------------|
| 1 | Dashboard deployed to Vercel | `vercel list` shows recent deployment |
| 2 | Onboarding endpoint returns 201 | curl test above |
| 3 | Login endpoint returns 200 | curl test above |
| 4 | real_estate_agents table accessible | Supabase query |
| 5 | Complete signup → login flow works | Manual E2E test |
| 6 | No 500 errors in browser console | DevTools check |

---

## 4. E2E Test Specs

### E2E-ONBOARD-001: Complete Signup Flow
**Given** a new user visits the landing page  
**When** they complete the onboarding form with valid data  
**Then** their account is created successfully (HTTP 201)  
**And** they receive a confirmation email  
**And** they can log in with their credentials  
**And** they are redirected to the dashboard

### E2E-ONBOARD-002: Duplicate Email Prevention
**Given** a user with email "test@example.com" already exists  
**When** a new signup attempts with the same email  
**Then** the endpoint returns HTTP 409 (Conflict)  
**And** the error message indicates email already registered

### E2E-ONBOARD-003: Missing Field Validation
**Given** a signup request with missing required fields  
**When** submitted to /api/agents/onboard  
**Then** the endpoint returns HTTP 400 (Bad Request)  
**And** the error specifies which fields are required

---

## 5. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Deployment fails | Low | Critical | Check build logs, fix errors, retry |
| Database migration not applied | Low | Critical | Verify Supabase migration status |
| Environment variables missing | Medium | High | Check Vercel env vars match local |
| Breaking change in API | Low | Medium | Run full smoke test post-deploy |

---

## 6. Workflow

| Step | Owner | Action | Status |
|------|-------|--------|--------|
| 1 | PM | Diagnose QC failure | ✅ Complete |
| 2 | Dev | Deploy to Vercel | ⏳ Ready |
| 3 | QC | Verify deployment | ⏳ Ready |
| 4 | PM | Update use case status | ⏳ Ready |

---

## 7. Notes

- The code fix is complete and merged
- This is purely a deployment issue
- No code changes required — only `vercel --prod`
- The migration file `013_fix_agents_schema_collision.sql` must be applied to Supabase if not already

---

*This PRD is a deployment specification, not a code specification.*
