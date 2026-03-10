# Genome Analysis: feat-lead-experience-simulator Recurring Dev Failure

**Date:** 2026-03-09  
**Task:** 96a4781a-19bf-4c15-87d4-167fb4b39473  
**Status:** RESOLVED — Feature is implemented and in production.

---

## Summary

The Lead Experience Simulator (`feat-lead-experience-simulator`) feature failed multiple times before successfully landing in `main` via PR #74. This document captures the root causes and recommended systemic fixes.

---

## Timeline of Failures

### Attempt 1: ffedfa72 (Original Dev)
- **Model:** `anthropic/claude-opus-4-6`
- **Branch:** `dev/ffedfa72-dev-feat-lead-experience-simulator-lead-`
- **Outcome:** 3× zombie_timeout → Max retries exhausted
- **Root Cause:** Claude Opus 4 is a large, slow model. For complex tasks (building a full feature from scratch), it regularly exceeds the 10-minute embedded session timeout. After 3 retries, the task hit `max_retries=3` and was permanently marked as "failed".

### Attempt 2: f74318d2 (Rescue Dev)
- **Model:** `moonshot/kimi-k2.5`  
- **Branch:** `dev/f74318d2-dev-rescue-feat-lead-experience-simulato`
- **Outcome:** Task marked `status: failed` with `last_error: "Verification failed (unrecoverable): branch does not exist"`
- **Actual outcome:** The agent **successfully built and deployed the feature**. The branch was pushed, the PR was merged (PR #74, merged at `2026-03-09T03:54:13Z`), and the remote branch was deleted as part of the merge. The workflow-engine verification ran **1 second later** at `2026-03-09T03:54:14Z` — found the branch was gone from origin — and incorrectly reported failure.

### Reality: Feature IS Complete
- PR #74 `83b83ac`: "Dev (rescue): feat-lead-experience-simulator - Lead Experience Simulator & Conversation Viewer"
- QC task 42dd3f86 verified: 20/20 E2E tests passed
- Production: `https://leadflow-ai-five.vercel.app/admin/simulator` returns HTTP 307 (auth redirect, expected)
- All simulator files present in `main`:
  - `app/admin/simulator/page.tsx`
  - `app/api/admin/simulate-lead/route.ts`
  - `app/api/admin/conversations/route.ts`
  - `app/api/admin/demo-link/route.ts`
  - `middleware.ts` — admin route protection with demo token bypass

---

## Root Causes

### 1. LLM Timeout (Primary Cause of Repeated Failure)
**What:** Claude Opus 4 (`anthropic/claude-opus-4-6`) is too slow for complex dev tasks in embedded sessions with a 10-minute timeout.  
**Where:** `heartbeat-executor.js` — embedded run timeout: `timeoutMs=600000` (10 min)  
**Fix:** Use faster models (Kimi, Sonnet) for dev tasks. Claude Opus should be reserved for tasks that require maximum reasoning and can tolerate slow responses.  
**Status:** Partially resolved — the rescue task used Kimi, which succeeded within the timeout.

### 2. Post-Merge Verification Race Condition
**What:** After a feature branch is merged and the remote branch is deleted, the workflow-engine's `verifyTaskOutput()` checks for the branch's existence. If verification runs after the branch is deleted (even by 1 second), it incorrectly marks the task as failed.  
**Where:** `workflow-engine.js` `verifyTaskOutput()` function  
**Fix:** The verification should also check if branch commits appear in `main`. If `git log --oneline main | grep <commit>` finds the commits, the task should be marked as verified (and done), even if the remote branch no longer exists.  
**Status:** NOT fixed — this requires modifying `workflow-engine.js`.

---

## Recommended Fixes (for Genome maintainers)

### Fix 1: Improve Post-Merge Verification (workflow-engine.js)
In `verifyTaskOutput()`, after the "branch does not exist" check, add a fallback:
```javascript
// Fallback: check if branch was already merged into main
if (!branchExists) {
  try {
    const mergeBase = execSync(
      `git log --oneline main | head -20`,
      { cwd: projectDir, encoding: 'utf-8', timeout: 5000 }
    )
    // If we can find the task's branch commits in main (recent commits mention the task ID or branch name)
    // consider the task verified
    if (mergeBase.includes(branch.split('/').slice(-1)[0]?.substring(0, 20))) {
      return { verified: true, reason: 'branch was merged into main' }
    }
  } catch {}
  return { verified: false, reason: 'branch does not exist (local and remote)', unrecoverable: true }
}
```

### Fix 2: Model Selection for Dev Tasks (workflow-engine.js)
Prefer faster models for dev tasks. The current default is `kimi` but if a task is spawned with `anthropic/claude-opus-4-6`, it should be downgraded for retry attempts:
```javascript
// On zombie_timeout, switch to faster model
if (diagnosis.category === 'zombie_timeout') {
  const fasterModel = 'moonshot/kimi-k2.5'
  await store.updateTask(task.id, { model: fasterModel })
}
```

### Fix 3: Add Pre-Merge Delay or Async Verification
After pushing a branch and before merging, add a brief delay or run verification asynchronously so the workflow-engine doesn't race with the merge hook.

---

## Current Status
- ✅ Feature implemented and deployed (PR #74, production verified)
- ✅ QC passed (task 42dd3f86)
- ⚠️ Task f74318d2 incorrectly shows `status: failed` in task store (should be `done`)
- ⚠️ Systemic fixes (workflow-engine race condition + model selection) not yet applied

