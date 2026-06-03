# Completion Report: Loop Fix — uc-revenue-countdown-widget

**Task:** PM: Loop detected — PM: Investigate stuck UC — uc-revenue-countdown-widget  
**Date:** 2026-04-05  
**Status:** Resolved

## Root Cause

The acceptance check `hides-for-paid-users` used `grep -q` with a pipe character (`|`) in the pattern, intending alternation. Without the `-E` flag, `grep` treats `|` as a literal character, not an alternation operator. The check never matched.

**Broken check:**
```
grep -q 'isTrial.*isPilot|isPilot.*isTrial' TrialStatusBanner.tsx
```

**Actual code (line 105) was correct:**
```typescript
if (!status.isTrial && !status.isPilot) {
  return null
}
```

All 4 other acceptance checks passed. Only `hides-for-paid-users` failed due to the broken grep regex.

## Loop Mechanism

1. Broken acceptance check → UC stuck on `stuck` status
2. `rescueStuckChains()` creates "PM: Investigate stuck UC" task
3. PM task times out (zombie_timeout) because investigation is non-trivial
4. Loop repeats — 3x in 2 hours, 15+ total tasks on this UC

## Fix Applied

1. Updated acceptance checks to use simpler, reliable patterns (no pipe-as-alternation)
2. The `hides-for-paid-users` check now uses two separate greps (AND logic): one for `isTrial`, one for `isPilot`
3. UC `implementation_status` set to `complete` (code was already correct)
4. No active tasks remain on this UC

## Genome Improvement Needed

Acceptance checks using `grep -q 'pattern|pattern'` (without `-E`) are a systemic source of false failures. The genome should:
- Either validate acceptance checks on write (`grep -E` for alternation patterns)
- Or document the constraint: always use `-E` or split into separate commands

**Priority:** P3 (maintenance) — create a dev task to audit other UCs for similar broken checks.
