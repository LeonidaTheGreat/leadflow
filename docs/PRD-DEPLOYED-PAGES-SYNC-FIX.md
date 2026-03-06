# PRD: Fix Deployed Pages Sync - Schema Alignment

**Status:** Approved  
**Version:** 1.2  
**Last Updated:** 2026-03-06  

## Problem Statement

The `sync-system-components.js` script fails to sync deployed Vercel pages to the `system_components` table due to a **schema mismatch**. The script references columns that don't exist in the actual database schema.

### Root Cause Analysis

**Failed Task:** `73e3bfed-9482-4ccb-907e-6c2d08dc681f` (and multiple previous attempts)  
**Error Pattern:** `False completion: no commits on branch` (dev claimed success but didn't commit)  
**Actual Error:** Script fails with "Could not find the 'name' column of 'system_components'"

### Schema Mismatch Details

| Script Uses | Actual Column | Status |
|-------------|---------------|--------|
| `name` | `component_name` | ❌ Mismatch |
| `url` | `metadata->>'url'` | ❌ Mismatch |
| `type` | `category` | ❌ Mismatch |
| `status` | `status` | ✅ OK |

## Requirements

### Functional Requirements

1. **Fix Column Mapping**
   - Change `name` → `component_name`
   - Remove `url` as top-level column, store in `metadata`
   - Map `type` → `category` or remove
   - Set `status_emoji` based on status

2. **Update Upsert Logic**
   - Use correct column names in Supabase upsert
   - Handle `onConflict: 'id'` properly
   - Store URL in `metadata.url`

3. **Add Status Emoji Mapping**
   - `live` → `🟢`
   - `building` → `🟡`
   - `error` → `🔴`
   - `deprecated` → `⚪`

### Acceptance Criteria

- [ ] Script runs without Supabase schema errors
- [ ] All smoke_test entries sync to system_components
- [ ] URLs stored in metadata and accessible
- [ ] Component names display correctly
- [ ] Status emojis set appropriately
- [ ] Manual sync via `node scripts/sync-system-components.js` works
- [ ] Heartbeat integration calls sync successfully

## Implementation Notes

### Current Broken Code (scripts/sync-system-components.js)
```javascript
await this.upsertComponent({
  id: component.id,
  name: test.name,           // WRONG: should be component_name
  type: component.type,      // WRONG: column doesn't exist
  url: test.url,             // WRONG: column doesn't exist
  status: component.status,
  metadata: component.metadata
});
```

### Fixed Code Pattern
```javascript
await this.upsertComponent({
  id: componentId,
  component_name: test.name,
  category: 'health_check',
  status: 'live',
  status_emoji: '🟢',
  metadata: {
    url: test.url,
    test_id: test.id,
    check_type: test.check_type,
    severity: test.severity
  }
});
```

## E2E Test Requirements

1. **E2E-1: Auto-Sync on Heartbeat**
   - Trigger: Heartbeat runs
   - Verify: system_components has entries for all smoke_tests with URLs

2. **E2E-2: Manual Sync API**
   - Trigger: POST /api/admin/sync-deployed-pages (or run script directly)
   - Verify: Returns 200, components updated

3. **E2E-3: URL Accuracy Verification**
   - Verify: All URLs in metadata are accessible HTTP 200

## Related

- Use Case: `fix-deployed-pages-not-registered-in-system-`
- Previous Failed Tasks: Multiple dev attempts with "no commits on branch"
- Learning: Dev agents falsely claimed completion without verifying script execution
