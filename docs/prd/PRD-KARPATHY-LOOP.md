# PRD: Karpathy Loop — Agent Self-Improvement via Prompt Mutation

**Author:** Leonida (orchestrator) + Stojan
**Created:** 2026-03-30
**Status:** In Progress
**Target activation:** 2026-04-04 (when first 7-day improvement verdicts land)

---

## Why This Exists

The genome has three layers: Detect ($0), Act ($0), Assess & Improve (~$1/day). The first two are operational. The Karpathy Loop is the engine for the third layer — making the genome improve *itself* rather than just the projects it manages.

**The problem it solves:** Agent RULES.md files (dev, QC, PM) were written by humans based on observed failures. They capture known failure patterns but:
- They don't evolve as the codebase changes
- They miss patterns only visible in aggregate data (2171+ task outcomes)
- They can't A/B test alternative instructions
- There's no feedback loop from task success/failure back to the prompts that generated the behavior

**The name:** Inspired by Andrej Karpathy's observation that the most powerful optimization loop is the one that optimizes itself. In our case: the genome's agent instructions are "weights" that can be tuned by measuring outcomes.

## What It Does

The Karpathy Loop is a **controlled mutation + evaluation cycle** for agent prompts:

```
┌─────────────────────────────────────────────────────┐
│                  KARPATHY LOOP                       │
│                                                      │
│  1. ANALYZE: Read learnings data (task outcomes,     │
│     model performance, failure patterns, recovery    │
│     patterns) to find improvement opportunities      │
│                                                      │
│  2. PROPOSE: Generate a specific RULES.md mutation   │
│     (add rule, modify rule, remove rule) with        │
│     hypothesis and expected metric improvement       │
│                                                      │
│  3. TEST: Run N tasks with the mutated prompt        │
│     alongside the baseline prompt. Compare:          │
│     - Success rate                                   │
│     - Retry rate                                     │
│     - Cost per success                               │
│                                                      │
│  4. EVALUATE: After sufficient data (min 5 tasks     │
│     per variant), determine if mutation improves     │
│     metrics beyond noise threshold (>5% delta)       │
│                                                      │
│  5. PROMOTE or REVERT:                               │
│     - If better: promote mutated RULES.md to         │
│       production, record in improvement tracker      │
│     - If worse/neutral: discard, record why          │
│     - If production degrades within 48h: auto-revert │
│                                                      │
│  6. LEARN: Record the experiment outcome so future   │
│     cycles don't re-propose failed mutations         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## When It Activates

**Gate conditions (ALL must be true):**
1. Improvement tracker has >= 1 evaluated verdict (7-day data maturity)
2. Learnings file has >= 500 task outcomes (statistical significance)
3. No active experiment already running (one at a time)
4. Daily budget has >= $5 remaining (experiments cost ~$1-2)

**Cadence:** Every 24 hours (checked in heartbeat). If gate conditions aren't met, skips silently.

**First expected run:** ~2026-04-04 (7 days after improvements were seeded on March 28).

## What It Mutates

Only agent RULES.md files:
- `~/.openclaw/workspace-dev/RULES.md`
- `~/.openclaw/workspace-qc/RULES.md`
- `~/.openclaw/workspace-product-manager/RULES.md`

It does NOT mutate:
- SOUL.md (agent personality — too high risk)
- Genome code (heartbeat, dispatcher, workflow engine)
- project.config.json (runtime config)
- Codebase rules or E2E tests

## How Mutations Are Proposed

The mutation proposer reads:
1. **Learnings data** (`state/leadflow/.learnings.json`) — 2171+ task outcomes, failure reasons, recovery patterns
2. **Model performance** — success rates by task type x model
3. **Recent failures** — tasks that failed in the last 7 days, grouped by pattern
4. **Current RULES.md** — the baseline prompt being mutated

It then identifies the highest-impact improvement opportunity:
- If a failure pattern appears 3+ times and isn't covered by RULES.md → propose a new rule
- If a rule exists but tasks still fail for that reason → propose a refined rule
- If a rule hasn't been relevant in 30+ days → propose removal (reduce prompt bloat)

## Versioning

Prompt versions are stored in: `~/projects/genome/state/leadflow/prompts/`

```
prompts/
  dev-v1.md          ← baseline (copy of current RULES.md)
  dev-v2.md          ← proposed mutation
  dev-experiment.json ← experiment metadata (hypothesis, metrics, status)
  qc-v1.md
  ...
```

Each experiment file tracks:
```json
{
  "agent": "dev",
  "version": 2,
  "baseline_version": 1,
  "hypothesis": "Adding rule about PostgREST column verification will reduce 'column not found' failures",
  "mutation_type": "add_rule",
  "mutation_diff": "+ - Before using a column name in a query, verify it exists: ...",
  "status": "running|promoted|reverted|discarded",
  "created_at": "2026-04-04T...",
  "metrics": {
    "baseline": { "success_rate": 0.82, "retry_rate": 0.12, "cost_per_success": 0.45, "sample_size": 50 },
    "mutation": { "success_rate": null, "retry_rate": null, "cost_per_success": null, "sample_size": 0 }
  },
  "min_sample_size": 5,
  "significance_threshold": 0.05,
  "promoted_at": null,
  "reverted_at": null,
  "revert_reason": null
}
```

## Cost Model

| Component | Cost |
|-----------|------|
| Mutation proposal | ~$0.10 (one LLM call to analyze learnings + propose) |
| Testing | $0 incremental (tasks run anyway; we just track which prompt version was used) |
| Evaluation | $0 (pure computation) |
| Total per cycle | ~$0.10-0.20 |
| Daily (1 cycle/day) | ~$0.10-0.20 |
| Monthly | ~$3-6 |

Key insight: **testing is free** because agent tasks run regardless. We just route some tasks to use the mutated prompt and compare outcomes. No additional spawns needed.

## Success Criteria

After 30 days of operation:
- At least 3 mutations promoted to production
- Agent success rate improved by >= 5% vs March 28 baseline
- Zero production degradation events from promoted mutations (auto-revert catches them)
- Mutation experiment log provides clear audit trail of what was tried and why

## Failure Modes & Safeguards

| Risk | Safeguard |
|------|-----------|
| Bad mutation degrades agent performance | 48h auto-revert if success rate drops below baseline |
| Mutation removes a critical rule | Mutations are additive-first; removals require 30+ days of irrelevance |
| Cost spiral from experiments | Gate: $5 minimum budget; experiments cost ~$0.10 each |
| Prompt bloat from accumulated rules | Track rule count; flag when RULES.md exceeds 80 lines |
| Simultaneous mutations confound results | One experiment at a time, per agent |
| Small sample size → false positives | Minimum 5 tasks per variant before evaluation |

## Integration Points

- **Heartbeat step:** New step in heartbeat-executor.js (24h cadence)
- **Workflow engine:** `buildRoleContext()` reads active experiment version if one exists
- **Improvement tracker:** Promoted mutations auto-recorded as improvements
- **Telegram:** Experiment outcomes reported to Genome topic
- **Learnings:** Experiment results feed back into learnings for future cycles

## Relationship to Existing Systems

```
Learnings System (intelligence/learning-system.js)
  ↓ reads outcomes
Karpathy Loop (core/karpathy-loop.js)
  ↓ proposes mutations to
Agent RULES.md
  ↓ influences
Task execution (spawn-consumer.js → buildRoleContext)
  ↓ produces
Task outcomes → Learnings System (closes the loop)
```

## Non-Goals

- This is NOT about changing which model runs a task (that's `selectInitialModel()`)
- This is NOT about decomposing tasks (that's `auto-decompose.js`)
- This is NOT about changing genome code (that requires human review)
- This is NOT about A/B testing product features (that's a product concern)
