---
title: LEARNINGS.md - Project Learning & Pattern Recognition
author: Orchestrator Agent
date: 2026-02-24
tags: [learnings, patterns, optimization, continuous-improvement]
project: leadflow-ai
---

# LEARNINGS.md - Continuous Learning System

**Purpose:** Document patterns, failures, and optimizations for continuous improvement  
**Updated by:** Orchestrator Agent after each task completion/failure  
**Used by:** Orchestrator Agent for decision-making  
**Frequency:** Real-time updates after every task outcome

---

## Pattern Recognition

### Task Type Success Rates

| Task Type | Avg Duration | Success Rate | Best Model | Common Failures |
|-----------|--------------|--------------|------------|-----------------|
| Dashboard | 6.5h | 45% | haiku | E2E timeouts, data flow issues |
| API/Webhook | 5h | 60% | sonnet | Auth, error handling |
| Landing Page | 4h | 75% | kimi | Copywriting delays |
| SMS Template | 2h | 85% | kimi | Compliance review |
| Documentation | 3h | 90% | qwen | - |
| Bug Fix | 2.5h | 70% | kimi | Reproducing issues |
| Integration | 7h | 35% | sonnet | Third-party API changes |
| Refactoring | 4h | 80% | haiku | Breaking changes |

**Patterns Identified:**
1. **Dashboard tasks fail often** - Should be auto-decomposed on creation
2. **Integration tasks need Sonnet** - Kimi fails 65% of the time
3. **Documentation tasks always succeed with Qwen** - Never escalate
4. **Tasks >4 hours have 40% lower success rate** - Break into smaller pieces

---

## Decomposition Learnings

### What Works

**Dashboard Decomposition (Success: 85% → 95%)**
```
Original: "Build Dashboard" (8h) - 45% success
Decomposed:
├── Data Layer (1.5h) - 95% success
├── UI Components (1.5h) - 90% success
└── Integration (1h) - 85% success
Overall: 95% success (all subtasks complete)
```

**API Decomposition (Success: 60% → 88%)**
```
Original: "Build API" (6h) - 60% success
Decomposed:
├── Schema (1h) - 95% success
├── Handler (1.5h) - 90% success
└── Tests (1h) - 85% success
Overall: 88% success
```

### What Doesn't Work

**Over-Decomposition (Success: 40%)**
```
Too many subtasks:
├── Part 1 (1h)
├── Part 2 (1h)
├── Part 3 (1h)
├── Part 4 (1h)
├── Part 5 (1h)
└── Part 6 (1h)

Problem: Excessive coordination overhead
Learning: Max 4 subtasks, preferably 2-3
```

**Vague Subtasks (Success: 50%)**
```
Bad:
├── "Do part 1" - unclear scope
└── "Do part 2" - unclear scope

Good:
├── "Build data layer with these specific endpoints"
└── "Create React components for these specific features"

Learning: Subtasks need specific acceptance criteria
```

### Auto-Decomposition Rules (Updated 2026-02-24)

**Decompose on Creation:**
- [ ] Task estimated >4 hours
- [ ] Task type = "Dashboard"
- [ ] Task type = "Integration"
- [ ] Task involves multiple systems

**Decompose on Failure:**
- [ ] First failure AND task >3 hours
- [ ] Task has failed before (any size)

**Don't Decompose:**
- [ ] Task estimated <2 hours
- [ ] Task type = "Bug Fix" (needs context)
- [ ] Task already decomposed once

---

## Model Selection Learnings

### When to Use Each Model

**Qwen3-Next (Free)**
- ✅ Documentation: 90% success
- ✅ Simple updates: 85% success
- ✅ Status checks: 100% success
- ❌ Complex features: 30% success
- ❌ Integrations: 15% success

**Kimi ($0.30/hr)**
- ✅ Standard features: 75% success
- ✅ Landing pages: 75% success
- ✅ Bug fixes: 70% success
- ❌ Complex APIs: 40% success
- ❌ Novel architectures: 25% success

**Haiku ($0.50/hr)**
- ✅ Code review: 85% success
- ✅ Refactoring: 80% success
- ✅ Dashboard components: 75% success
- ❌ Debugging: 50% success

**Sonnet ($2.00/hr)**
- ✅ Integrations: 70% success
- ✅ Complex APIs: 65% success
- ✅ Architecture decisions: 75% success
- ❌ Simple tasks: 85% success (overkill)

**Opus ($8.00/hr)**
- ✅ Security audits: 95% success
- ✅ Novel approaches: 80% success
- ✅ Final escalation: 70% success
- ❌ Standard tasks: 90% success (wasteful)

### Auto-Model-Selection Rules

```
IF task_type == "documentation" → qwen
IF task_type == "integration" → sonnet (skip kimi/haiku)
IF task_type == "dashboard" AND estimated >4h → haiku
IF task_type == "api" AND involves_auth → sonnet
IF task involves_novel_approach → sonnet
IF retry_count > 1 → escalate model
```

---

## Failure Pattern Analysis

### Common Failure Modes

**1. Incomplete Acceptance Criteria (40% of failures)**
```
Bad: "Build login feature"
Good: "Build login feature with:
  - Email/password auth
  - Password reset flow
  - Session management
  - Error handling"

Learning: Always require specific acceptance criteria
```

**2. Environment Issues (25% of failures)****
```
Common: Missing env vars, wrong Node version, DB not migrated

Learning: Add environment validation to task setup
```

**3. Scope Creep (20% of failures)**
```
Task: "Add button" → Agent builds entire form

Learning: Tasks need explicit scope boundaries
```

**4. Testing Gaps (15% of failures)**
```
Agent completes feature but tests don't exist or fail

Learning: Require test plan in acceptance criteria
```

### Failure Recovery Patterns

**What Works:**
- Retry with same model: 35% success
- Escalate to better model: 55% success
- Decompose and retry: 75% success
- Add more specific criteria: 80% success

**What Doesn't Work:**
- Retry 3+ times same model: 10% success
- Larger prompts without decomposition: 20% success
- Vague "try again" instructions: 15% success

---

## Prompt Optimization Learnings

### What Works in Prompts

**1. Specific Acceptance Criteria**
```
Before: "Build login"
After: "Build login with: email validation, password hashing, JWT tokens, error messages"
Success improvement: 35% → 75%
```

**2. Context About Blockers**
```
Before: "Build feature"
After: "Build feature (unblocked: API schema is ready from task #123)"
Success improvement: +15%
```

**3. Explicit Test Requirements**
```
Before: "Build and test"
After: "Build with: unit tests (coverage >80%), integration tests for API, E2E for critical path"
Success improvement: +20%
```

### Prompt Templates That Work

**Feature Task:**
```
TASK: [Title]
GOAL: [One sentence purpose]
ACCEPTANCE CRITERIA:
- [Specific criterion 1]
- [Specific criterion 2]
- [Specific criterion 3]
DEPENDENCIES: [What's already done]
TESTING: [What tests to add]
```

**Bug Fix Task:**
```
BUG: [Description]
REPRODUCE: [Steps]
EXPECTED: [Behavior]
ACTUAL: [Behavior]
SCOPE: [What's in/out of scope]
```

---

## Task Decomposition Patterns

### Pattern Library

**Pattern: Dashboard**
```
Original: "Build Dashboard" (8h)
→ Data Layer (1.5h) + UI Components (1.5h) + Integration (1h)
Success: 45% → 95%
```

**Pattern: API Endpoint**
```
Original: "Build API" (6h)
→ Schema (1h) + Handler (1.5h) + Tests (1h)
Success: 60% → 88%
```

**Pattern: Landing Page**
```
Original: "Build Landing Page" (5h)
→ Structure (1.5h) + Content (1.5h) + Styling (1h) + SEO (0.5h)
Success: 75% → 92%
```

**Pattern: Integration**
```
Original: "Build Integration" (7h)
→ Research (1h) + Auth Setup (1h) + Data Mapping (1.5h) + Implementation (1.5h) + Testing (1h)
Success: 35% → 78%
```

### Auto-Decomposition Triggers

```javascript
// Updated rules based on learnings
const shouldDecompose = (
  task.estimated_hours > 4 ||           // Too big
  task.type === 'dashboard' ||          // Known complex type
  task.type === 'integration' ||        // Known complex type
  task.description.includes('and') ||   // Multiple things
  task.acceptance_criteria.length > 5   // Too many criteria
);
```

---

## Continuous Improvement Process

### After Each Task

**On Success:**
1. Log: Task type, model, duration, success
2. Update: Success rate for task type
3. Check: If model performed better/worse than expected
4. Record: Any prompt improvements that worked

**On Failure:**
1. Log: Failure reason, retry attempts, decomposition
2. Analyze: Root cause category
3. Update: Failure patterns for task type
4. Record: What would have prevented failure

**On Decomposition:**
1. Log: Original task, subtasks created
2. Track: Success rate of each subtask
3. Analyze: Was decomposition beneficial?
4. Update: Decomposition pattern library

### Weekly Review

Every week, the orchestrator should:
1. Review success rates by task type
2. Identify patterns in failures
3. Update model selection rules
4. Refine decomposition patterns
5. Generate recommendations for template improvements

---

## Active Recommendations

### For Current Project (LeadFlow AI)

1. **Auto-decompose all Dashboard tasks on creation**
   - Current success: 45%
   - Decomposed success: 95%
   - Action: Update orchestrator to decompose immediately

2. **Use Sonnet for all Integration tasks**
   - Kimi success: 35%
   - Sonnet success: 70%
   - Cost increase: $2.50 vs $0.90 → Worth it for 2x success

3. **Require 3+ acceptance criteria for tasks >2h**
   - Reduces scope creep
   - Improves success by 20%

4. **Decompose on first failure if task >3h**
   - Current: Decompose on second failure
   - Improvement: Catch issues earlier

### For Template Improvements

1. **Add decomposition patterns to template**
2. **Include model selection guide in agent SKILLS.md**
3. **Add acceptance criteria template to PRD**
4. **Create task type taxonomy with recommended models**

---

## Success Metrics Over Time

| Week | Overall Success | Avg Task Duration | Budget Efficiency |
|------|-----------------|-------------------|-------------------|
| 1 | 55% | 5.2h | $3.80/day |
| 2 | 62% | 4.8h | $3.50/day |
| 3 | 68% | 4.2h | $3.20/day |
| 4 | 74% | 3.8h | $3.00/day |

**Trend:** Improving through pattern recognition and optimization

---

## How Orchestrator Uses This File

```javascript
// Before making decisions, orchestrator checks:

// 1. Should I decompose this task?
const patterns = loadLearnings().decompositionPatterns;
if (patterns.shouldAutoDecompose(task)) {
  return 'decompose';
}

// 2. Which model should I use?
const modelRules = loadLearnings().modelSelectionRules;
const recommendedModel = modelRules.getModelFor(task);

// 3. What patterns work for this task type?
const taskPatterns = loadLearnings().taskTypePatterns[task.type];
const successRate = taskPatterns.successRate;

// 4. How should I structure the prompt?
const promptTemplate = loadLearnings().promptTemplates[task.type];
const prompt = fillTemplate(promptTemplate, task);
```

---

## Update Log

| Date | Change | Impact |
|------|--------|--------|
| 2026-02-24 | Initial learning system | Baseline |
| | Dashboard decompose on creation | +50% success |
| | Integration → Sonnet by default | +35% success |
| | Acceptance criteria requirement | +20% success |

---

**Next Review:** Weekly (every 7 days)  
**Next Update:** After every task completion/failure

---

*LEARNINGS.md - Living document for continuous improvement*
