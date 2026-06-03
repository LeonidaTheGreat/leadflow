# QC Review: Database Migration — UTM Columns
**Task ID:** 4256f8c0-defd-4c4b-a72a-b27dda9db1bf  
**Branch:** dev/0d815eb7-dev-fix-database-migration-not-run-utm-c  
**Date:** 2026-04-04  
**Reviewer:** QC  

---

## ❌ VERDICT: REJECT

The PR adds the required UTM migration files but **the E2E test is fundamentally broken** and will not execute assertions correctly. The PR cannot be approved until the test is fixed.

---

## AUTOMATED GATES

### ✅ Gate 1: No Junk Files
```
PASS: no junk files
```
No `coverage/`, `node_modules/`, or `.next/` committed.

### ✅ Gate 2: No Root-Level .md Files
```
PASS: no root .md files (from this PR)
```
Note: LEARNINGS.md and SCHEMA.md pre-exist in main and are not added by this PR.

### ❌ Gate 3: Test Validity
**FAIL:** E2E test has critical async bug (see findings below).

### ✅ Gate 4: Changed Files
```
migrations/003_add_utm_columns_to_agents.sql
supabase/migrations/021_add_utm_columns_to_agents.sql
tests/e2e/utm-columns-migration.test.js
```
All files are in correct directories per PROJECT_STRUCTURE.md.

---

## CRITICAL FINDINGS

### 🚨 ISSUE 1: E2E Test Async Function Bug (BLOCKING)

**Severity:** CRITICAL  
**Location:** `tests/e2e/utm-columns-migration.test.js`, lines 28-36  
**Status:** REJECT

The test wrapper function doesn't await async test functions:

```javascript
function test(label, fn) {
  try {
    fn()  // ❌ Async function called without await
    console.log(`  ✅ PASS: ${label}`)  // Executes immediately
    passed++
  } catch (err) {
    // Never catches async errors
    console.error(`  ❌ FAIL: ${label}`)
    failed++
  }
}
```

**Why this fails:**
1. `fn()` returns a Promise immediately
2. `console.log()` and `passed++` execute synchronously before async work completes
3. Assertions inside `fn` run asynchronously and errors are never caught
4. **Result:** All tests report PASS even if every assertion fails

**Example breakage:**
```javascript
test('Column utm_source exists', async () => {
  const info = await getColumnInfo('utm_source')
  assert.ok(info, `Column not found`)  // This error never propagates
})
// Output: ✅ PASS: Column utm_source exists (WRONG)
```

**Fix required:**
```javascript
async function test(label, fn) {
  try {
    await fn()  // ✅ Await the async function
    console.log(`  ✅ PASS: ${label}`)
    passed++
  } catch (err) {
    console.error(`  ❌ FAIL: ${label}`)
    console.error(`         ${err.message}`)
    failed++
  }
}

async function runTests() {
  // ... existing code ...
  
  for (const col of columns) {
    await test(`Column ${col} exists`, async () => {  // ✅ Await each test
      const info = await getColumnInfo(col)
      assert.ok(info, `Column ${col} not found in real_estate_agents`)
    })
  }
}
```

---

## MIGRATION FILES — ANALYSIS

### Migration 1: `migrations/003_add_utm_columns_to_agents.sql`

**Status:** ✅ CORRECT

```sql
ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text;
```

**Verification:**
- ✅ Adds all 5 required columns: utm_source, utm_medium, utm_campaign, utm_content, utm_term
- ✅ Uses `IF NOT EXISTS` for idempotency
- ✅ Column type `text` is correct for UTM parameters
- ✅ Includes indices for query optimization
- ✅ Includes proper DOWN clause for rollback

### Migration 2: `supabase/migrations/021_add_utm_columns_to_agents.sql`

**Status:** ✅ IDENTICAL TO MIGRATION 1

Migration logic is correct. Both files are needed (local migrations + Supabase).

---

## ACCEPTANCE CRITERIA

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Issue is resolved | ❓ UNVERIFIED | Migration files are present but test doesn't verify |
| Existing functionality not broken | ❌ UNTESTED | Test is broken; can't verify |
| Tests pass | ❌ BROKEN | E2E test has async bug |

---

## SECURITY CHECKLIST

- ✅ No secrets hardcoded
- ✅ No SQL injection (uses parameterized migrations)
- ✅ No unauthorized access changes
- ✅ No dead code
- ✅ No risky crypto patterns

---

## CODE QUALITY

| Check | Status | Notes |
|-------|--------|-------|
| Strict equality | ✅ | Test uses `assert.strictEqual()` |
| Error handling | ❌ | Async errors not caught properly |
| No hardcoded values | ✅ | Uses env vars for DB connection |

---

## SEMANTIC CORRECTNESS

- ✅ Table name: `real_estate_agents` (correct per SOUL.md domain model)
- ✅ Column names match specification: utm_source, utm_medium, utm_campaign, utm_content, utm_term
- ✅ Data types: `text` (correct for UTM parameters)
- ✅ Nullable: ✅ (columns allow NULL for agents without UTM data)

---

## DEPLOYMENT READINESS

**NOT READY** — Test must pass before deployment.

---

## NEXT STEPS (FOR DEV)

1. **Fix the async test wrapper:**
   - Make `test()` function async
   - Add `await` before `fn()`
   - Ensure all `test()` calls use `await`

2. **Commit the fix:**
   ```bash
   git add tests/e2e/utm-columns-migration.test.js
   git commit -m "fix: E2E test async handling for UTM migration"
   git push origin <branch>
   ```

3. **Run the test locally:**
   ```bash
   LOCAL_PG_URL="postgresql://..." node tests/e2e/utm-columns-migration.test.js
   ```
   All tests must show ✅ PASS before PR can be approved.

---

## SUMMARY

- **Migration files:** ✅ Correct and complete
- **E2E test:** ❌ Broken (async bug makes it unreliable)
- **Overall:** ❌ REJECT — Fix test, then resubmit for approval

