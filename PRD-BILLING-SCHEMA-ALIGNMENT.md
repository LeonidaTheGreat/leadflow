# PRD: Billing System Schema Alignment

**Document Type:** Product Requirements Document  
**Status:** CRITICAL ISSUE - Blocks Pilot Launch  
**Date:** 2026-02-26  
**Author:** Product Manager  
**Priority:** P0 - Pilot Blocker

---

## 1. Executive Summary

### Problem Statement
The Stripe Customer Portal was built expecting a `customers` table schema that **does not exist** in our database. The current `agents` table tracks **worker agents** (dev, marketing, qc), not **paying customers** (real estate agents).

### Impact
| Area | Impact |
|------|--------|
| **Pilot Launch** | 🔴 **BLOCKED** - Cannot onboard paying customers without working billing |
| **Stripe Integration** | 🔴 Non-functional - Portal creates sessions for wrong entity type |
| **Data Integrity** | 🟡 Risk of conflating worker agents with paying customers |
| **Revenue** | 🔴 Cannot collect $20K MRR without billing system |

### Root Cause
Orchestrator built the Stripe Customer Portal feature **without a defined Use Case or database schema review**. The portal route (`/api/stripe/portal-session`) assumes:
```javascript
// Expected (doesn't exist):
agents: {
  id, email, stripe_customer_id, stripe_subscription_id, 
  plan_tier, mrr, status
}

// Actual (exists):
agents: {
  id, project_id, agent_name, agent_type, 
  status, progress_percent, current_task  // worker agent tracking
}
```

---

## 2. Current State Analysis

### 2.1 What Was Built
| Component | Location | Status |
|-----------|----------|--------|
| Portal Module | `lib/stripe-portal.js` | ✅ Code complete |
| API Route | `app/api/stripe/portal-session/route.ts` | ✅ Code complete |
| Portal Routes | `routes/portal.js` | ✅ Code complete |
| Tests | `integration/test-stripe-portal.js` | ✅ 13/13 passing |
| Documentation | `docs/STRIPE_CUSTOMER_PORTAL.md` | ✅ Complete |

### 2.2 What's Missing
| Component | Status | Impact |
|-----------|--------|--------|
| **Customer data model** | ❌ Doesn't exist | Cannot store billing data |
| **Customer <> User relationship** | ❌ Undefined | Don't know who pays |
| **Subscription state tracking** | ❌ Missing | Can't track MRR accurately |
| **Use Case documentation** | ❌ Not in USE_CASES.md | Not part of product spec |
| **E2E test specs** | ❌ Not in E2E_MAPPINGS.md | No validation criteria |

### 2.3 Database Schema Gap

**Current Schema (agents table - WORKER AGENTS):**
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  project_id TEXT,
  agent_name TEXT,      -- "dev", "marketing", "qc"
  agent_type TEXT,      -- worker type
  status TEXT,          -- ACTIVE, READY, COMPLETE
  progress_percent INT,
  current_task TEXT,
  blocker TEXT,
  last_activity TIMESTAMP,
  metadata JSONB
);
```

**Required Schema (customers table - PAYING CUSTOMERS):**
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  
  -- Stripe billing
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  plan_tier TEXT,       -- 'starter', 'pro', 'team', 'brokerage'
  plan_price INTEGER,   -- in cents
  billing_cycle TEXT,   -- 'monthly', 'annual'
  
  -- Subscription state
  status TEXT,          -- 'trialing', 'active', 'past_due', 'canceled'
  trial_ends_at TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  
  -- Metrics
  mrr INTEGER,          -- Monthly Recurring Revenue
  lead_count INTEGER,
  sms_sent_count INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. Required Solution

### 3.1 Database Changes

**Step 1: Create customers table**
```sql
-- Create customers table for paying real estate agents
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  
  -- Stripe integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  
  -- Plan details
  plan_tier TEXT CHECK (plan_tier IN ('starter', 'pro', 'team', 'brokerage')),
  plan_price INTEGER, -- cents
  billing_cycle TEXT DEFAULT 'monthly',
  
  -- Subscription state
  status TEXT DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  trial_ends_at TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  
  -- Usage metrics
  mrr INTEGER DEFAULT 0,
  lead_count INTEGER DEFAULT 0,
  sms_sent_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customers_stripe_customer ON customers(stripe_customer_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_plan ON customers(plan_tier);
```

**Step 2: Update portal API to use customers table**
```typescript
// Change FROM:
const { data: agent } = await supabase
  .from('agents')
  .select('id, email, stripe_customer_id')
  .eq('id', agentId)

// Change TO:
const { data: customer } = await supabase
  .from('customers')
  .select('id, email, stripe_customer_id, plan_tier, status')
  .eq('id', customerId)
```

**Step 3: Rename parameter for clarity**
```typescript
// Change FROM:
const { agentId } = body

// Change TO:
const { customerId } = body
```

### 3.2 Authentication & Authorization

Add middleware to ensure users can only access their own billing:
```typescript
// Verify the authenticated user matches the customerId
const user = await getAuthenticatedUser(request)
if (user.id !== customerId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}
```

### 3.3 Webhook Handling

Update Stripe webhooks to update `customers` table, not `agents`:
```typescript
// Handle subscription created/updated/canceled
// Update customers.status, customers.mrr, etc.
```

---

## 4. Acceptance Criteria

### 4.1 Database (Must Have)
- [ ] `customers` table exists with all required columns
- [ ] Migration script runs successfully
- [ ] Indexes created for performance
- [ ] Foreign key relationships defined (if applicable)

### 4.2 API Changes (Must Have)
- [ ] `/api/stripe/portal-session` uses `customers` table
- [ ] Parameter renamed from `agentId` to `customerId`
- [ ] Authentication middleware prevents unauthorized access
- [ ] Error handling for missing customers

### 4.3 Stripe Integration (Must Have)
- [ ] Creating a customer in Stripe creates row in `customers` table
- [ ] Portal session creation works end-to-end
- [ ] Webhook updates sync to `customers` table
- [ ] Subscription changes reflect in database

### 4.4 Human Validation (Required)
- [ ] **Test:** Create test customer via API
- [ ] **Verify:** Customer appears in database with correct data
- [ ] **Test:** Create Stripe customer and subscription
- [ ] **Verify:** Portal URL generates and loads Stripe UI
- [ ] **Test:** Click through portal → update payment method
- [ ] **Verify:** Changes sync back to database
- [ ] **Test:** Webhook simulation (subscription updated)
- [ ] **Verify:** Database reflects webhook changes

### 4.5 Documentation (Must Have)
- [ ] Update `USE_CASES.md` with UC-X: Customer Billing Management
- [ ] Update `E2E_MAPPINGS.md` with billing test specs
- [ ] Update `STRIPE_CUSTOMER_PORTAL.md` with new schema
- [ ] Document customer onboarding flow

---

## 5. Implementation Plan

### Phase 1: Database (2 hours)
1. Create `customers` table migration
2. Add indexes and constraints
3. Run migration on production
4. Verify table structure

### Phase 2: API Updates (3 hours)
1. Update `/api/stripe/portal-session` route
2. Add authentication middleware
3. Update webhook handlers
4. Test locally

### Phase 3: Integration (2 hours)
1. Test Stripe customer creation → DB
2. Test portal session generation
3. Test webhook synchronization
4. Run E2E tests

### Phase 4: Documentation (1 hour)
1. Write Use Case for billing
2. Add E2E test specs
3. Update API documentation
4. Create customer onboarding guide

**Total Estimate:** 8 hours

---

## 6. Testing Instructions

### Manual Test (Human Validation)

**Step 1: Create Test Customer**
```bash
curl -X POST "https://leadflow-ai-five.vercel.app/api/customers" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test Agent",
    "phone": "+12015551234"
  }'
```

**Step 2: Create Stripe Customer**
```bash
curl -X POST "https://leadflow-ai-five.vercel.app/api/billing/create-customer" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "<uuid-from-step-1>"
  }'
```

**Step 3: Create Subscription**
```bash
curl -X POST "https://leadflow-ai-five.vercel.app/api/billing/create-subscription" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "<uuid-from-step-1>",
    "priceId": "price_pro_monthly"
  }'
```

**Step 4: Generate Portal URL**
```bash
curl -X POST "https://leadflow-ai-five.vercel.app/api/stripe/portal-session" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user-token>" \
  -d '{
    "customerId": "<uuid-from-step-1>",
    "returnUrl": "https://leadflow-ai-five.vercel.app/settings"
  }'
```

**Step 5: Human Verification**
- [ ] Open portal URL in browser
- [ ] Verify LeadFlow branding (logo, colors)
- [ ] View subscription details ($149 Pro)
- [ ] See payment methods section
- [ ] View invoice history
- [ ] Click "Return to LeadFlow" → returns to dashboard

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data migration issues | Medium | High | Test migration on staging first |
| Stripe webhook failures | Low | High | Add webhook retry logic |
| Customer confusion (agents vs customers) | Medium | Medium | Clear naming in UI and docs |
| Authentication bypass | Low | Critical | Security review of middleware |

---

## 8. Success Criteria

**Definition of Done:**
1. Real estate agents can sign up and create a customer record
2. Stripe customer is created and linked to database record
3. Agents can click "Manage Billing" and access Stripe portal
4. Subscription changes sync via webhooks
5. MRR is accurately tracked in database
6. PM has manually validated the entire flow

---

## 9. Related Documents

| Document | Purpose | Status |
|----------|---------|--------|
| `USE_CASES.md` | Add UC-X: Customer Billing Management | ❌ Needs update |
| `E2E_MAPPINGS.md` | Add billing test specs | ❌ Needs update |
| `PMF.md` | Verify pricing tiers match implementation | ⚠️ Review needed |
| `docs/STRIPE_CUSTOMER_PORTAL.md` | Update with correct schema | ⚠️ Needs update |
| `LEARNINGS.md` | Document "spec-schema mismatch" pattern | ✅ Will add |

---

## 10. Appendix: What Went Wrong (Learning)

### The Mistake
Orchestrator built a complete Stripe Customer Portal feature **without**:
1. A defined Use Case in `USE_CASES.md`
2. Database schema review
3. E2E test specs with human validation criteria
4. PM approval before implementation

### The Lesson
**No billing feature should be built without:**
- Use Case defining who pays, how much, and what they get
- Database schema design review
- Human-testable acceptance criteria
- PM sign-off on approach

### The Fix
This PRD defines the proper approach. Future billing work must:
1. Start with Use Case in `USE_CASES.md`
2. Include database schema in PRD
3. Define human validation steps in `E2E_MAPPINGS.md`
4. Get PM approval before implementation

---

**Next Action:** Assign to Dev agent for implementation. Estimated 8 hours.
