# PRD: Daily Strategic Review — 2026-03-29

**PRD ID:** prd-strategic-review-2026-03-29  
**Status:** approved  
**Date:** 2026-03-29  
**Project:** LeadFlow AI (leadflow)

---

## Summary

Daily orchestrator strategic review. Identifies dev agent failure patterns and proposes instruction improvements to reduce retry waste and improve task success rates.

---

## Genome Health

| Metric | Value |
|--------|-------|
| E2E tests | 11/12 passed |
| Codebase rule violations | 0 |
| Genome score | 88/100 |

---

## Dev Agent Failure Analysis (49 failures this week)

### Pattern 1 — Branch Does Not Exist (Fail-Fast Gap)
**Root cause:** Dev agent retries a task 3 times against a branch that does not exist in the remote. All 3 retries fail identically.  
**Fix:** Add pre-flight `git ls-remote` check. If branch is absent, fail immediately and request re-assignment rather than exhausting all retries.

### Pattern 2 — Duplicate Work (No Completed-Task Guard)
**Root cause:** Agent starts work on a UC where a completed task for the same agent type already exists.  
**Fix:** At task start, query task store for a completed task on the same UC. If found, archive immediately as duplicate.

### Pattern 3 — LLM Timeout → Unknown Channel Spam (No Fallback)
**Root cause:** Moonshot model times out; agent does not recover and begins emitting "Unknown Channel" errors.  
**Fix:** Add a 90-second timeout + one retry with fallback model (haiku). Log the model switch. Never emit Unknown Channel errors silently.

### Pattern 4 — Stale PR Retries (No PR-State Check)
**Root cause:** PRs were bulk-closed on 2026-03-09. Agent continues attempting to push to closed PRs.  
**Fix:** Check PR state with `gh pr view` at task start. If PR is closed, stop and report — do not push or re-open.

---

## Required Instruction Additions (Dev Agent SOUL.md / Role Context)

### Rule: Branch Pre-Flight
```
Before starting any task that involves a branch or PR:
1. Run: git ls-remote --heads origin <branch-name>
2. If the branch does not exist, immediately mark the task as blocked with reason "branch not found" and stop.
3. Do NOT attempt any commits or pushes against a non-existent branch.
```

### Rule: Duplicate Work Guard
```
At task start, check whether a completed task already exists for this UC and agent type.
If found: archive this task as "duplicate" and stop. Do not repeat work that is already done.
```

### Rule: LLM Timeout Fallback
```
If the primary LLM model (Moonshot/Kimi) does not respond within 90 seconds:
1. Retry once with fallback model (anthropic/claude-haiku-4-5).
2. Log the model switch in task output.
3. Do NOT emit "Unknown Channel" errors or fail silently.
```

### Rule: Stale PR Awareness
```
At task start, if the task references a PR number:
1. Run: gh pr view <pr-number> --json state
2. If state is "CLOSED" or "MERGED", do not push. Report the PR state and await re-assignment.
3. Only proceed if PR state is "OPEN".
```

---

## Action Items (Concrete Decisions)

| # | Type | Agent | Priority | Description |
|---|------|-------|----------|-------------|
| 1 | improve-agent | dev | P3 | Add branch pre-flight check |
| 2 | improve-agent | dev | P3 | Add duplicate-work guard |
| 3 | improve-agent | dev | P3 | Add LLM timeout fallback |
| 4 | improve-agent | dev | P3 | Add stale-PR awareness check |

---

## Human Action Items

| # | Description | Can Eliminate? | Proposal |
|---|-------------|----------------|---------|
| 1 | 1 of 12 E2E tests is failing — identify root cause | Yes | QC agent reviews failing test log and classifies as flaky or real regression |

---

## Focus Today

Reduce dev agent retry waste by adding branch-existence and duplicate-work pre-flight checks, and recovering gracefully from Moonshot LLM timeouts.

---

## Acceptance Criteria

- [ ] Dev agent SOUL.md or role context updated with 4 new rules above
- [ ] E2E failing test investigated and triaged
- [ ] No new "branch does not exist" retries after next heartbeat
- [ ] No new "Unknown Channel" spam after next heartbeat
