# Bug Analysis: Onboarding Endpoint 500 Error
**Task ID:** 63ee06f9-a069-436c-ad10-c97dd4c99d87  
**Date:** March 5, 2026  
**Analyst:** Product Manager

---

## Executive Summary

**Decision:** FIX BUG (Critical Priority)

**Root Cause:** Schema collision between orchestrator and product. Both use an `agents` table in the same Supabase database, but with completely different schemas.

**Impact:** Complete signup flow failure. No new real estate agents can onboard.

---

## The Problem

### Symptom
- Onboarding wizard appears to work
- Clicking "Get Started!" on Step 5 fails silently
- Browser console shows: `POST /api/agents/onboard 500 (Internal Server Error)`
- No user account is created
- Login fails with "Invalid email or password"

### Root Cause Analysis

**1. Orchestrator Schema (created first)**
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY,
    project_id TEXT,
    agent_name TEXT,      -- OpenClaw agent name
    agent_type TEXT,      -- dev, qc, product, etc.
    status TEXT,          -- idle, busy, error
    progress_percent INT,
    current_task TEXT,
    blocker TEXT,
    -- ... orchestrator fields
);
```

**2. Product Schema (tried to create second)**
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE,    -- Real estate agent email
    name TEXT,            -- Real estate agent name
    phone TEXT,
    fub_id TEXT,          -- Follow Up Boss ID
    calcom_username TEXT,
    settings JSONB,
    -- ... product fields
);
```

**3. The Collision**
Both the orchestrator and the LeadFlow product use the same Supabase project (`fptrokacdwzlmflyczdz`). When the product migration ran, the `agents` table already existed (from the orchestrator), so the product's `agents` table was never created.

**4. The Failure**
When the onboarding code tries to insert a new real estate agent:
```typescript
const { data: agent, error: agentError } = await supabase
    .from('agents')
    .insert({
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        // ... more fields
    })
```

It fails because:
- The `agents` table doesn't have `email`, `first_name`, `last_name`, `password_hash` columns
- It has `agent_name`, `agent_type`, `project_id`, `status` columns instead
- The insert fails with a schema mismatch error

---

## Decision: FIX BUG

### Why Fix (Not Deprioritize)

1. **Blocks All New Signups**
   - Cannot onboard pilot agents
   - Cannot generate revenue
   - $20K MRR target is impossible without working signup

2. **Core Product Function**
   - Signup is the entry point to the entire product
   - Without it, nothing else matters

3. **Not a Minor UX Issue**
   - This is a complete functional failure
   - Not a "nice to have" — it's table stakes

### Why Not "Add Feature" or "Improve UX"

- The onboarding UI is actually well-designed (5-step wizard)
- The problem is purely backend/schema
- No new features needed — just fix the existing broken one

---

## Recommended Fix

### Option A: Rename Product Table (Recommended)

Rename the product's `agents` table to `customers` or `re_agents` (real estate agents).

**Pros:**
- Clean separation of concerns
- Orchestrator schema stays intact
- Product schema is clearer

**Cons:**
- Requires updating all product code that references `agents`
- Requires updating foreign key references (leads.agent_id, etc.)

**Files to Update:**
- `product/lead-response/dashboard/app/api/agents/onboard/route.ts`
- `product/lead-response/dashboard/lib/supabase-server.ts` (if any hardcoded refs)
- All queries that select from `agents` table
- Migration files that create/alter `agents` table
- Foreign key constraints in `leads`, `bookings`, `events` tables

### Option B: Separate Database

Move the product to a separate Supabase project.

**Pros:**
- Complete isolation
- No schema conflicts ever

**Cons:**
- More infrastructure to manage
- Cross-database queries become harder
- Requires data migration

### Option C: Schema Namespacing

Use PostgreSQL schemas to separate orchestrator and product tables.

**Pros:**
- Both can keep `agents` table name
- Clean separation

**Cons:**
- Requires significant refactoring
- Need to update connection strings
- More complex

---

## Immediate Action Items

### For Dev Team

1. **Rename `agents` table to `customers`** (or `re_agents`)
   ```sql
   -- Migration
   ALTER TABLE agents RENAME TO customers;
   -- Update all foreign keys
   ALTER TABLE leads DROP CONSTRAINT leads_agent_id_fkey;
   ALTER TABLE leads ADD CONSTRAINT leads_customer_id_fkey 
     FOREIGN KEY (agent_id) REFERENCES customers(id);
   ```

2. **Update onboarding endpoint**
   - Change `from('agents')` to `from('customers')`
   - Update field names if needed

3. **Update all product code**
   - Search for all `.from('agents')` references
   - Update to `.from('customers')`

4. **Update foreign key references**
   - `leads.agent_id` → keep column name, update FK
   - `bookings.agent_id` → keep column name, update FK
   - `events.agent_id` → keep column name, update FK

5. **Test the fix**
   - Run through full onboarding journey
   - Verify account creation works
   - Verify login works
   - Verify dashboard access works

### For Product Team

1. **Update documentation**
   - `ARCHITECTURE.md` — document the schema naming
   - `CLAUDE.md` — note the `customers` table (not `agents`)

2. **Update PRDs**
   - Any PRD referencing `agents` table should use `customers`

3. **Verify UC-9 and UC-AUTH-FIX-001**
   - Once fixed, mark as `complete`
   - Clear metadata.blocked flag

---

## Use Case Updates

Updated in Supabase:

| UC | Status | Notes |
|----|--------|-------|
| UC-9 | `in_progress` | Blocked by agents table schema conflict |
| UC-AUTH-FIX-001 | `in_progress` | Signup flow broken - needs table rename |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration fails | Low | High | Test in staging first |
| Foreign key issues | Medium | High | Careful review of all FK constraints |
| Code references missed | Medium | Medium | Global search for `.from('agents')` |
| Orchestrator affected | Low | Critical | Orchestrator uses different columns — verify no collision |

---

## Timeline Estimate

- **Analysis & Planning:** 30 min (done)
- **Migration script:** 1 hour
- **Code updates:** 2-3 hours
- **Testing:** 1 hour
- **Total:** ~5 hours dev work

---

## Conclusion

This is a **critical infrastructure bug** that blocks all new user acquisition. The fix is straightforward (rename table, update references) but must be done carefully to avoid breaking existing functionality.

**Recommendation:** Proceed with Option A (rename to `customers`). It's the cleanest solution and establishes clear naming conventions for future development.

**Do not** attempt pilot recruitment until this is fixed. The signup flow is completely non-functional.
