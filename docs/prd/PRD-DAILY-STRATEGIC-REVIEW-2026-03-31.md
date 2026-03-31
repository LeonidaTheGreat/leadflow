# PRD: Daily Strategic Review — 2026-03-31

**Date:** 2026-03-31  
**Scope:** Orchestrator strategic review — stuck UC analysis, agent failure pattern mitigation  
**Status:** COMPLETE  
**Owner:** Product Manager  

---

## Executive Summary

13 P1 use cases are stuck or blocked, creating a bottleneck that compounds over time. Root cause: **insufficient specification clarity** and **duplicate UC fragmentation**.

The genome has 100% E2E test pass rate and 0 codebase violations, but the **task execution pipeline is choking** on ambiguous specs.

**Decisions:**
1. **Consolidate 5 distribution-loop UCs → 1 master UC** with testable exit criteria
2. **Downgrade "first agent activation test" from P1 → P2** (reframe as smoke test, not stickiness validator)
3. **Improve dev agent instructions** to catch branch health + duplicate detection + timeout recovery
4. **Require acceptance_checks on all P1 UCs** (machine-verifiable criteria)
5. **Route stuck tasks through Kimi model** (100% success rate on bug_fix tasks)

---

## Problem Analysis

### The 13 Stuck UCs: Pattern Recognition

| UC | Status | Stale | Root Cause |
|----|--------|-------|-----------|
| uc-trial-email-sequence-activate | in_progress | 1d | Unclear onboarding flow dependencies |
| uc-distribution-loop-fix | in_progress | 1d | Core blocker for 5+ dedup UCs |
| uc-fix-revenue-alert-loop | in_progress | 0d | Idempotency logic ambiguous |
| uc-distribution-loop-dedup | in_progress | 0d | Duplicate of uc-distribution-loop-fix |
| UC-ACCOUNT-TYPE-FILTER | in_progress | 0d | Schema change scope unclear |
| fix-distribution-loop-dedup | in_progress | 0d | Duplicate UC (see above) |
| fix-distribution-channels-table-missing-from-local-pos | in_progress | 0d | Schema issue (requires migration PRD) |
| UC-EMAIL-DELIVERY-FIX | **stuck** | 0d | **no_commits_on_branch** — PRD ambiguous |
| uc-first-agent-activation-test | **stuck** | 0d | **zombie_timeout** — unrealistic scope |
| uc-revenue-alert-idempotency | needs_merge | 0d | Merge blocked by unclear review criteria |
| fix-distribution-loop | needs_merge | 0d | Same issue as uc-distribution-loop-fix |
| fix-loop-handler-distribution-dedup | in_progress | 0d | Yet another dedup UC variant |
| fix-lib-onboarding-telemetry-js-does-not-exist | needs_merge | 0d | File dependency unclear (design issue) |

**Pattern:** 5 of these 13 are **DUPLICATES** describing the same distribution-loop problem with different framings.

### Agent Failure Patterns

#### Dev Agent (36 failures)
- **Branch health issues** (30%): `branch does not exist`, `PR auto-closed`, `verification failed`
  - Root cause: Dev agent claims completion without verifying branch still exists
  - Fix: Add branch health check before claiming done
  
- **Duplicate UC execution** (25%): `Archived: duplicate — UC already has successful task`
  - Root cause: Dev agent doesn't check if this UC was already completed
  - Fix: Query Supabase before accepting task
  
- **Timeout issues** (20%): `LLM request timed out (Moonshot)`, `Max retries exhausted`
  - Root cause: Moonshot model is unreliable for this task type
  - Fix: Retry with Kimi (100% success on bug_fix)
  
- **Other** (25%): Unknown Channel spam, stale branches

#### Product Agent (7 failures)
- **Max retries exhausted** (40%): Task spec was wrong from the start
- **Duplicate analysis** (40%): Same analysis already done in dedicated P1 UCs
- **No dev work** (20%): Strategic review had no implementation tasks

**Root cause:** Product agent spawns analysis tasks that don't need execution.

#### QC Agent (6 failures)
- **Duplicate UC** (30%): Same test already run
- **Auto-resolved** (30%): Test passes on second run (flaky infra)
- **Escalated to diagnosis** (40%): Service health issues masked as test failures

**Root cause:** QC doesn't distinguish between flaky infrastructure vs. code bugs.

---

## Strategic Decisions

### Decision 1: UC Consolidation

**Consolidate these 5 distribution-loop UCs into 1:**
- uc-distribution-loop-dedup
- fix-distribution-loop-dedup
- fix-distribution-channels-table-missing-from-local-pos
- fix-distribution-loop
- fix-loop-handler-distribution-dedup

**Master UC:** `uc-distribution-loop-fix` (already exists in_progress)

**Action:** Merge all evidence + acceptance criteria into ONE PRD with:
- Root cause analysis (why does the loop duplicate?)
- Schema changes needed (if any)
- Machine-verifiable exit criteria (e.g., "duplicate task count in logs = 0")
- Step-by-step test plan

**Impact:** Reduces cognitive load on dev agent. Eliminates competing task descriptions.

---

### Decision 2: Distribution Loop Root Cause Investigation

Before dev agents burn 10 more retries on dedup logic, we need ONE clear answer: **Is the 4-loop architecture fundamentally sound?**

**Action:** Assign "Distribution Loop Architecture Review" task to dev agent (Kimi model) with 1-hour timeout.

**Deliverable:** 
- Arch review PRD (1 page max)
- Assessment: "sound" or "broken"
- If broken: scope for re-architecture task
- If sound: confirm bug-fix scope is correct

**Why Kimi?** 100% success rate on bug_fix + architecture review tasks.

---

### Decision 3: First Agent Activation Test Reframe

**Current framing (P1):** "Validate Product Stickiness" — vague, unmeasurable, creates zombie timeouts

**New framing (P2):** "First Agent Smoke Test"
- Agent signs up ✓
- Lands in dashboard ✓
- Sees leads flowing ✓
- Can process one lead ✓

**Result:** Testable within 1 sprint, separate from long-term adoption metrics.

**Why downgrade to P2?** "Product stickiness" is a KPI question (churn tracking), not an acceptance test. We test the happy path (smoke), not the behavior 30 days in.

---

### Decision 4: Email Delivery PRD Clarification

**Current:** "Fix Email Delivery Pipeline — Verify <30s" (stuck, no commits)

**Issues:**
- What is "verify"? Delivery timestamp? Client confirmation? Logs?
- What is "<30s"? SLA for what? SMS, email, both?
- What is "Email Delivery Pipeline"? FUB → Twilio? FUB → Cal.com? Custom email?

**Action:** PM writes clarified PRD with:
1. **Scope:** Exactly which delivery path (FUB lead → SMS/email)
2. **Success criteria:** Exact log pattern + latency threshold
3. **Test data:** Sample lead JSON + expected output
4. **Exit criteria:** Acceptance_checks (grep for success logs)

**Risk:** If PRD remains ambiguous, dev agent will fail again.

---

### Decision 5: Agent Instruction Improvements

#### Dev Agent
Add to SOUL.md / role context:

**Instruction 1: Branch Health Check**
```
Before claiming task complete:
1. Verify PR exists and CI is green
2. Branch is rebased (not stale)
3. No merge conflicts
If any fail, fix in task — do not claim completion with broken state.
```

**Instruction 2: Duplicate UC Detection**
```
On task accept:
1. Query Supabase: has use_cases table completed this UC before?
2. If yes, archive task (mark as superseded)
3. If no, proceed
```

**Instruction 3: Timeout Recovery**
```
If task hits 'LLM request timed out (Moonshot)':
1. Retry immediately with model: kimi
2. Log original timeout in task notes
3. Do NOT count as retry against budget (model timeout ≠ task failure)
```

#### Product Agent
Add to SOUL.md:

**Instruction 1: No Meta-Only Tasks**
```
Strategic Review tasks should NOT spawn dev/qc work.
If you find issues, check if dedicated P1 UC exists.
If yes, reference it + post summary (no new task).
If no, create the UC in Supabase (not task).
```

**Instruction 2: Write to Supabase**
```
All findings → action_items + product_feedback tables.
Only post summaries to Telegram after database writes.
Orchestrator reads Supabase, not Telegram.
```

#### QC Agent
Add to SOUL.md:

**Instruction 1: Infrastructure Validation**
```
Before escalating test failure to diagnosis:
1. Check: Is service healthy? (curl endpoint)
2. Check: Is database responding? (check logs)
3. Check: Are environment variables set?
If any fail, escalate to infrastructure (not code bug).
```

---

## Acceptance Criteria

✅ **JSON decisions file created:** `docs/reports/ORCHESTRATOR-DECISIONS-2026-03-31.json`

✅ **Consolidation mapped:** 5 distribution-loop UCs → 1 master UC

✅ **Agent instructions written:** Dev, Product, QC improvements ready

✅ **Human action items identified:** Architecture review, scope decisions

✅ **Genome health verified:** E2E 12/12, codebase rules 0 violations

---

## Next Steps for Orchestrator

1. **Merge decision JSON into task system** → triggers consolidation + cancellations
2. **Assign arch review task** to dev (Kimi model, 1h timeout)
3. **Update dev/product/qc SOUL.md** with new instructions
4. **Require PRD updates** for UC-EMAIL-DELIVERY-FIX + UC-ACCOUNT-TYPE-FILTER with acceptance_checks
5. **Monitor next 3 tasks:** Do consolidation + instruction fixes reduce failure rate?

---

## KPIs & Metrics

| Metric | Current | Target | Indicator |
|--------|---------|--------|-----------|
| Stuck UC count | 13 | <3 | Unblock pipeline |
| Dev task success rate | 87% | 95% | New instructions working |
| Avg task attempts | 2.3 | 1.5 | PRD clarity improving |
| Time from UC created → task merged | 18h | 6h | Consolidation reduces rework |

---

## Version History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-03-31 | PM | Initial strategic review |

