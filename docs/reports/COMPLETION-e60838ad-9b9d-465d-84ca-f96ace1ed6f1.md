# Completion Report: Improve Product Agent Instructions — DEDUP CHECK

**Task ID:** e60838ad-9b9d-465d-84ca-f96ace1ed6f1
**Status:** completed
**Date:** 2026-06-10

## Summary

Added DEDUP CHECK rule to product agent instructions to prevent duplicate task creation.

## Root Cause Analysis

- **Failure point:** Product agent creating duplicate tasks for UCs that already have completed/active tasks.
- **Why:** `buildRoleContext()` in `role-context.js` did not include a dedup check instruction for the product role; the rule existed in SOUL.md but was only loaded for expensive models or complex tasks (tier 2).
- **Fix:** Added DEDUP CHECK to the product role's `spawnRole` section in `buildRoleContext()` so it is always injected regardless of model tier.

## Changes Made

### genome repo (commit d51a297)
- **File:** `core/food/role-context.js` — Added `## DEDUP CHECK` section to product role `spawnRole` array (always injected)
- **Genome commit:** `d51a297 feat(product-agent): add DEDUP CHECK rule to product spawnRole`

### workspace-product-manager/SOUL.md
- **File:** `/Users/clawdbot/.openclaw/workspace-product-manager/SOUL.md`
- DEDUP CHECK section already present at lines 75–91 (was present prior to this task).

## Verification

```bash
# Confirm DEDUP CHECK in role-context.js
grep -n "DEDUP CHECK" /Users/clawdbot/projects/genome/core/food/role-context.js
# Expected: line ~216

# Confirm DEDUP CHECK in SOUL.md
grep -n "DEDUP CHECK" /Users/clawdbot/.openclaw/workspace-product-manager/SOUL.md
# Expected: line ~75
```

Both checks pass.

## Test Results

- `npm test` passes (no changes to leadflow product code)
- `npm run build` passes (no changes to leadflow product code)
- Genome commit verified: `d51a297` on genome main
