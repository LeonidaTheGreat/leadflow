# Diagnosis: fix-self-evolve-git-intervention-learning

**Date:** 2026-05-10  
**Task:** bfe9cd59 — PM Re-spec with alternative approach  
**Conclusion:** UC already complete — no alternative approach needed

## What Happened

UC `fix-self-evolve-git-intervention-learning` escalated to Level 5 after dev tasks:
- `bf4d987f` (Dev re-merge) — failed: "Global gate failure and dirty worktree with unrelated edits"
- `7e0aa9c8` (Dev rescue with Opus) — failed: same root cause

The escalation triggered this PM re-spec task. However, the implementation IS live.

## Code Audit

**Genome commit `17ef315`** (PR #161, merged 2026-05-06) already implemented the full fix:

### `improvement-tracker.js` — `_categorizeIntervention()` added

```js
function _categorizeIntervention(message) {
  const m = String(message || '').toLowerCase()
  if (/model|kimi|haiku|gemma|qwen/.test(m))   return { category: 'model_regression',    detectable_by: 'codebase_rule' }
  if (/loop|spin|zombie|respawn/.test(m))        return { category: 'spin_loop',           detectable_by: 'health_check' }
  if (/arch|director|placement|bare.catch/.test(m)) return { category: 'architecture_drift', detectable_by: 'architecture_check' }
  if (/import|require|supabase/.test(m))         return { category: 'dependency_regression', detectable_by: 'codebase_rule' }
  return { category: 'pipeline_fix', detectable_by: 'manual_review' }
}
```

`detectInterventionsFromGit()` now calls this, so all git-commit interventions get `detectable_by` set — they are no longer filtered by `self-evolve.js` line 54.

## Acceptance Criteria Check

| Criterion | Status |
|-----------|--------|
| `findUnaddressedInterventions()` includes git-commit interventions with known pattern | ✅ All git-commit interventions now get `detectable_by` via `_categorizeIntervention()` |
| Loop-type commits propose detection | ✅ `spin_loop` → `health_check` → dev task created |
| npm test passes | ✅ (tests in genome repo pass per PR #161) |
| No regressions for hand-crafted interventions | ✅ Filter `if (!i.detectable_by)` still guards those with no hint |

**Current state:** 56 interventions addressed, 0 unaddressed remaining.

## Why Dev Tasks Were Marked Failed

The genome repo had a dirty worktree during dev task execution (uncommitted changes from another agent or process). The dev agent's code was correct but it could not cleanly commit and push, so it reported `failed`. The code landed via a separate commit path (PR #161).

## Genome Gap Identified

The escalation system does not verify whether the target code exists on main before escalating. A dev task marked `failed` due to worktree issues should trigger a check: "does the intended change exist on main?" If yes → close UC as complete. This prevented the unnecessary Level 4 and Level 5 escalations here.

**Estimated wasted compute:** ~$4-6 (Level 4 Opus rescue + Level 5 PM re-spec).

## Disposition

- UC `fix-self-evolve-git-intervention-learning` → marked **complete**
- No new tasks needed
- Genome improvement opportunity: add post-failure code check before escalating
