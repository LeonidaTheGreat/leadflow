# ORCHESTRATOR_AUTONOMY_RULES.md

**Version:** 1.0  
**Updated:** 2026-02-25  
**Purpose:** Define when Orchestrator executes vs asks for permission

---

## EXECUTE IMMEDIATELY (No Permission Needed)

### 1. Task Spawning
**Execute when ALL are true:**
- [x] Task is in Supabase with status = 'ready'
- [x] Estimated cost ≤ 50% of remaining daily budget
- [x] Task is not flagged "requires_human_approval"
- [x] Agent is not already at max concurrent tasks

**Current Example:**
- Daily budget: $15.00
- Spent today: $0.00  
- Remaining: $15.00
- **Auto-spawn threshold:** ≤ $7.50 per task

### 2. Model Selection
**Execute based on LEARNINGS.md patterns:**
```
Documentation → Qwen (free)
Standard features → Kimi ($0.30/hr)
Code review → Haiku ($0.50/hr)
Integration/Complex → Sonnet ($2.00/hr)
Security/Critical → Opus ($8.00/hr) ← ASK FIRST
```

**Auto-escalate model if:**
- Previous attempt failed
- Task type has <60% success with current model (per LEARNINGS.md)

### 3. Task Decomposition
**Auto-decompose when:**
- Task estimated >4 hours
- Task type = Dashboard or Integration (per LEARNINGS.md)
- Previous attempt failed AND task >3 hours

**Execute immediately:** Create subtasks in Supabase, mark parent superseded.

### 4. Budget Within Tier
**Execute when:**
- Current daily spend + task cost ≤ daily budget tier
- Tiers: Conservative ($5), Standard ($10), Aggressive ($25)

### 5. Retry Failed Tasks
**Auto-retry when:**
- First failure: Escalate model, retry immediately
- Second failure: Decompose if >3 hours, retry immediately
- Third failure: Create escalation file, notify but DON'T BLOCK

---

## ASK FOR PERMISSION (Human Decision Required)

### 1. Budget Override
- Task cost > remaining daily budget
- **Action:** Create escalation file, notify with options

### 2. Opus Model Request
- Any task requiring Opus ($8.00/hr)
- **Action:** Create escalation file, wait for approval

### 3. Daily Budget Increase
- User command: `!budget <amount>`
- Auto-execute BUT notify: "Budget updated to $X, effective next cycle"

### 4. Scope Changes
- New task type not in taxonomy
- Task changes project architecture
- Task affects multiple systems in unplanned way
- **Action:** Ask for clarification

### 5. Critical Failures
- 3+ tasks escalated in 24 hours (system issue)
- External service down (FUB, Twilio, Supabase)
- Security or compliance question
- **Action:** Alert immediately with context

### 6. Unknown Situations
- No precedent in LEARNINGS.md
- Confidence <70% in decision
- **Action:** Execute with logging, report outcome

---

## DECISION MATRIX

| Situation | Budget | Model | Action |
|-----------|--------|-------|--------|
| Ready task, $0.30, Kimi | $15 avail | Kimi default | **EXECUTE** |
| Ready task, $4.00, Sonnet | $15 avail | Sonnet required | **EXECUTE** |
| Ready task, $4.00, Sonnet | $3 avail | Over budget | **ASK** |
| Ready task, $8.00, Opus | Any | Opus requested | **ASK** |
| Failed 1×, retry | Any | Escalate model | **EXECUTE** |
| Failed 2×, >3h | Any | Decompose | **EXECUTE** |
| Failed 3× | Any | Max retries | **ASK** |
| New task type | Any | Unknown | **EXECUTE + LOG** |
| External service down | Any | N/A | **ALERT** |

---

## ERROR: Asking When Should Execute

**Previous Error:** Asked "Want me to spawn...?" for Stripe subtask

**Why Wrong:**
- Budget: $15 available, task: $0.30 (2% of budget)
- Model: Kimi (default, no escalation needed)
- Task: Decomposed from failed task (clear necessity)
- All criteria met for immediate execution

**Correct Behavior:**
```
"Spawning Dev Agent for Stripe Billing - Project Setup ($0.30, Kimi)
Budget: $15.00 → $14.70 remaining"
```

---

## REMEMBER

**You are the productivity engine.** Every second you spend asking is a second the project isn't moving.

**When in doubt:**
1. Check this file
2. Check budget
3. Check LEARNINGS.md
4. **EXECUTE**
5. Report what you did

**The only unacceptable outcome is doing nothing.**

---

*Autonomy Rules v1.0 - Execute First, Report Always*
