# Customers Table Migration Guide

**Priority:** P0 - PILOT BLOCKER  
**Estimated Time:** 10 minutes  
**Method:** Manual (Supabase SQL Editor)

---

## Quick Start

### Option 1: Supabase Dashboard (RECOMMENDED)

1. **Login to Supabase Dashboard**
   - Go to: https://fptrokacdwzlmflyczdz.supabase.co
   - Login with your credentials

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Copy & Paste Migration SQL**
   - Open: `sql/customers-table-migration.sql`
   - Copy entire contents
   - Paste into SQL Editor

4. **Execute Migration**
   - Click "Run" button
   - Wait for completion (should take ~5 seconds)
   - Check for success message

5. **Verify Table Created**
   ```sql
   SELECT COUNT(*) FROM customers;
   -- Should return 0 (empty table)
   
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'customers'
   ORDER BY ordinal_position;
   -- Should show all columns
   ```

---

## Option 2: psql Command Line

If you have `psql` installed:

```bash
# Get database connection string from Supabase dashboard
# Settings → Database → Connection string (Session mode)

psql "postgresql://postgres:[PASSWORD]@db.fptrokacdwzlmflyczdz.supabase.co:5432/postgres" \
  -f sql/customers-table-migration.sql
```

---

## Option 3: Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to project
supabase link --project-ref fptrokacdwzlmflyczdz

# Run migration
supabase db push --file sql/customers-table-migration.sql
```

---

## Verification Checklist

After running migration, verify:

### 1. Customers Table Exists
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'customers';
```
✅ Should return: `customers`

### 2. All Columns Present
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;
```
✅ Should show: id, email, name, phone, company, stripe_customer_id, stripe_subscription_id, plan_tier, plan_price, billing_cycle, status, trial_ends_at, current_period_start, current_period_end, cancel_at_period_end, canceled_at, mrr, lead_count, sms_sent_count, sms_quota, lead_quota, features, metadata, created_at, updated_at

### 3. Indexes Created
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'customers';
```
✅ Should show: idx_customers_email, idx_customers_stripe_customer, idx_customers_status, idx_customers_plan, idx_customers_created_at

### 4. RLS Policies Configured
```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'customers';
```
✅ Should show: "Users can view own customer record", "Users can update own profile", "Service role can manage customers"

### 5. Foreign Keys Updated
```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'customer_id';
```
✅ Should show: subscriptions, payments, checkout_sessions, subscription_events

---

## Troubleshooting

### Error: "relation customers already exists"
**Solution:** Table is already created. Skip to verification step.

### Error: "permission denied for schema public"
**Solution:** Use service role key or admin account with DDL permissions.

### Error: "violates foreign key constraint"
**Solution:** This is normal if you have existing data in subscriptions/payments tables with user_id. Migration script handles this gracefully.

### Error: "column customer_id already exists"
**Solution:** Some tables already have customer_id. This is fine - migration uses IF NOT EXISTS checks.

---

## Post-Migration Steps

### 1. Create Test Customer
```bash
curl -X POST "https://leadflow-ai-five.vercel.app/api/customers" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@leadflow.test",
    "name": "Test Customer",
    "phone": "+12015551234",
    "plan_tier": "pro"
  }'
```

### 2. Verify in Database
```sql
SELECT id, email, name, plan_tier, status, created_at
FROM customers
ORDER BY created_at DESC
LIMIT 5;
```

### 3. Run E2E Tests
```bash
node test/billing-schema-alignment-e2e.js
```

### 4. Deploy Updated API
```bash
# Push changes to Git
git add .
git commit -m "feat: add customers table and billing schema alignment"
git push

# Vercel will auto-deploy
# Or manually trigger deployment
vercel --prod
```

---

## Rollback Plan

If you need to rollback:

```sql
-- WARNING: This will delete all customer data!

-- 1. Drop foreign keys first
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_customer_id_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_customer_id_fkey;
ALTER TABLE checkout_sessions DROP CONSTRAINT IF EXISTS checkout_sessions_customer_id_fkey;
ALTER TABLE subscription_events DROP CONSTRAINT IF EXISTS subscription_events_customer_id_fkey;

-- 2. Drop customers table
DROP TABLE IF EXISTS customers CASCADE;

-- 3. Remove customer_id columns
ALTER TABLE subscriptions DROP COLUMN IF EXISTS customer_id;
ALTER TABLE payments DROP COLUMN IF EXISTS customer_id;
ALTER TABLE checkout_sessions DROP COLUMN IF EXISTS customer_id;
ALTER TABLE subscription_events DROP COLUMN IF EXISTS customer_id;
```

---

## Migration Script Details

The migration does:

1. ✅ Creates `customers` table with 24 columns
2. ✅ Adds 5 indexes for performance
3. ✅ Configures 3 RLS policies for security
4. ✅ Adds `customer_id` to subscriptions, payments, checkout_sessions, subscription_events
5. ✅ Creates foreign key constraints
6. ✅ Updates RLS policies on related tables
7. ✅ Creates auto-update trigger for `updated_at`

**Total SQL Statements:** ~50  
**Estimated Execution Time:** 3-5 seconds  
**Database Impact:** Low (creates new table, doesn't modify existing data)

---

## Support

**Need Help?**
- Review: `docs/BILLING_SCHEMA_ALIGNMENT_COMPLETE.md`
- Check: `sql/customers-table-migration.sql`
- Test: `test/billing-schema-alignment-e2e.js`
- Issues: Report to PM or dev team

---

## Success Criteria

Migration is complete when:
- ✅ `customers` table exists with all fields
- ✅ All indexes created
- ✅ RLS policies active
- ✅ Foreign keys established
- ✅ E2E tests pass
- ✅ Test customer can be created
- ✅ Portal session can be generated

**Next:** Human validation by PM (see BILLING_SCHEMA_ALIGNMENT_COMPLETE.md)
