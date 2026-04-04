# PRD: Loop Detection Rescue — Wave 9

**PRD ID:** `prd-loop-rescue-wave9`  
**Status:** Approved  
**Priority:** P1 (Blocker)  
**Date:** 2026-04-04  
**Author:** Product Manager  
**Task:** PM (rescue): PM: Loop detected — PM: Distribution — Content Marketing Campaign (ID: `1f7abee7-738f-4c37-a55c-114b165927a9`)  
**Diagnosis:** Rate limited in previous attempts. Root cause analysis confirms existing UC `fix-distribution-collector-task-loop` is the correct routing.

---

## Executive Summary

This is a **rescue task** triggered by loop detection: "PM: Distribution — Content Marketing Campaign" was spawned 3 times in 2 hours on 2026-04-04 06:55.

**Triage Outcome:** Route to **existing UC `fix-distribution-collector-task-loop`** (status: not_started, priority: 3 → **change to 1**).

The underlying bug is well-documented in Wave 8 PRD (`PRD-DISTRIBUTION-LOOP-WAVE8.md`). This task's role is to:
1. Confirm the correct routing
2. **Escalate priority to P1** (current priority=3 is too low)
3. Unlock the blocked dev task that should implement the fix

---

## Root Cause Confirmation

### Why "PM: Distribution — Content Marketing Campaign" Keeps Spawning

The UC `gtm-content` (Content Marketing Campaign) is **complete** in Supabase:
```
id: gtm-content
status: complete
phase: GTM
```

However, the distribution health check in `~/.openclaw/genome/scripts/distribution-collector.js` has **no UC completion gate**. The logic is:

1. `checkDistributionHealth()` runs every heartbeat
2. Detects distribution issue: "zero_traffic" or similar
3. Maps issue to UC template: `content-marketing` → UC `gtm-content`
4. Calls `createDistributionTasks()` to create a task

The dedup guard at line ~268 checks:
```javascript
const { data: recentTask } = await supabase
  .from('tasks')
  .select('id, status, created_at')
  .eq('project_id', PROJECT_ID)
  .ilike('title', title)
  .gte('created_at', sevenDaysAgo)
  .limit(1)
```

**This only checks the tasks table, not whether the UC is complete.**

Result: Task created every heartbeat (~10 min) even though UC is done.

### Evidence

- **Supabase use_cases table:** `gtm-content` has `implementation_status: 'complete'`
- **Supabase tasks table:** 3 tasks created in 2h with titles matching "PM: Distribution — Content Marketing Campaign"
- **Loop detection:** Triggered at 2026-04-04 06:55 (3+ tasks in 2h window)
- **Investigation tasks:** Multiple "PM: Loop detected — PM: Distribution — ..." tasks created by loop detector (meta-loop)

---

## Required Fix

The existing UC `fix-distribution-collector-task-loop` has the exact acceptance criterion needed:
- **"uc-completion-check"** — "Issues for complete UCs are skipped" (machine_verifiable)

### Implementation Requirements

**File:** `~/.openclaw/genome/scripts/distribution-collector.js`

**Acceptance Checks:**
1. **check-uc-completion:** Add gate before creating task: skip if linked UC is complete
2. **check-cooldown-24h:** Enforce 24h cooldown between identical task creations
3. **check-no-postgrest-url:** Remove any LOCAL_POSTGREST_URL references
4. **check-dedup-logic:** Verify dedup guard checks both tasks table AND use_cases table

---

## Triage Outcome

**Action:** `existing_uc`  
**UC ID:** `fix-distribution-collector-task-loop`  
**Reason:** This is the exact UC designed to fix this loop. The acceptance criteria explicitly include "uc-completion-check" and "cooldown-24h".

**Workflow:** Dev > QC  
**Current Priority:** 3 (WRONG — should be 1)  
**Recommended Priority:** 1 (P1 Blocker — prevents product from functioning, consumes agent budget every 10 min)

---

## Why Previous Attempts Failed

Previous PM agents (5 attempts) timed out or were rate-limited:
- Model: moonshot/kimi-k2.5 had "FailoverError: No available auth profile (all in cooldown or unavailable)"
- Process: PID 8510 marked as zombie after 6 minutes

**This rescue attempt avoids rate-limiting by:**
1. Routing to existing UC (no new resources needed)
2. Providing clear triage outcome (no ambiguous decisions)
3. Keeping spec lean and action-oriented

---

## Acceptance Criteria

- [ ] UC `fix-distribution-collector-task-loop` priority updated to 1 in Supabase
- [ ] Triage outcome recorded in completion report
- [ ] Dev task picks up implementation using existing Wave 8 spec

---

## Verification

Once dev implements the fix, these checks must pass:

```javascript
// Check 1: UC completion gate active
grep -n "completedUcIds\|UC_ISSUE_MAP" ~/.openclaw/genome/scripts/distribution-collector.js

// Check 2: Dedup checks use_cases table
grep -A 10 "createDistributionTasks" ~/.openclaw/genome/scripts/distribution-collector.js | grep "use_cases"

// Check 3: No new tasks for complete UCs
// Verify no task created with title "PM: Distribution — Content Marketing Campaign" 
// OR any other UC that has implementation_status='complete'
```

---

## Next Steps

1. **This task (PM):** Complete — output triage outcome
2. **Next task (Dev):** Pick up `fix-distribution-collector-task-loop` with P1 priority
3. **Implementation:** Use existing Wave 8 PRD as reference
4. **QC:** Verify acceptance checks in Supabase pass
