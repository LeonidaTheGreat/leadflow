# 🚀 Supabase Schema Migration - Step by Step

## Status

**DDL (CREATE TABLE) needs to be executed manually in Supabase Dashboard.**

Supabase's REST API and JavaScript client don't support executing DDL statements. This is a security limitation. We need to use the SQL Editor in the web dashboard.

---

## How to Complete the Migration

### Step 1: Get the SQL File

File location:
```
/Users/clawdbot/projects/leadflow/supabase-schema-migration.sql
```

Content includes:
- 7 tables (project_metadata, system_components, agents, completed_work, action_items, cost_tracking, dashboard_snapshots)
- Indexes for performance
- Initial data for leadflow project

### Step 2: Run in Supabase Dashboard

1. **Open Supabase:**
   https://app.supabase.com

2. **Select your project:**
   Look for: `fptrokacdwzlmflyczdz`

3. **Go to SQL Editor:**
   Click: "SQL Editor" in left sidebar

4. **Create new query:**
   Click: "+ New Query"

5. **Paste the SQL:**
   Open the SQL file in a text editor and copy all content
   Paste into the query editor

6. **Run the SQL:**
   Click the "Run" button (or Cmd+Enter)

7. **Wait for success:**
   Should see checkmark ✅ next to each statement

### Step 3: Verify Tables Were Created

In terminal:
```bash
node query-project.js summary
```

You should see:
```
📊 PROJECT SUMMARY
Project: LeadFlow AI
Goal: $20K MRR within 60 days
Status: 🟢 ACTIVE

🔧 System Components:
  DEPLOYMENT: 1/1 healthy
  ...
```

### Step 4: Done!

Once tables exist, all dashboards will work automatically:
- `DASHBOARD.md` can be generated from tables
- `dashboard.html` can read from tables
- `query-project.js` can fetch all data

---

## Why Manual?

Supabase (and most databases) don't allow DDL via REST API for security reasons:
- REST APIs are untrusted channels
- DDL is powerful and dangerous
- SQL Editor is the safe, authenticated way

---

## If You Get an Error

**Error: "table already exists"**
- Tables were already created previously
- You can skip this migration
- Just run: `node query-project.js summary` to verify

**Error: "permission denied"**
- Check your Supabase credentials
- Ensure you're using the service role key (not anon key)

**Error: "invalid SQL syntax"**
- Make sure you copied the entire file
- Check for missing lines
- Try copying smaller sections at a time

---

## Files Ready to Use

✅ `supabase-schema-migration.sql` — The migration SQL
✅ `query-project.js` — Query tool (test with: `node query-project.js summary`)
✅ `auto-create-tables.js` — Data populator (run after tables exist)
✅ `SUPABASE_SCHEMA_GUIDE.md` — Full documentation
✅ `generate-dashboard-from-db.js` — (will create next) Dashboard generator

---

## Timeline

```
Now: Manual SQL execution in Supabase Dashboard (2 minutes)
    ↓
After: Run data population script
    ↓
Then: DASHBOARD.md auto-generates from tables
    ↓
Finally: dashboard.html auto-syncs from tables
```

---

## Ready?

Tell me once the SQL has been run in Supabase, and I'll populate the data and test everything.
