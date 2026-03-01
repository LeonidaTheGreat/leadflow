# LeadFlow AI — PM ↔ Orchestrator Alignment

**Purpose:** Define how Product Manager specifications translate to Orchestrator-executed tasks.

**Last Updated:** 2026-02-26  
**Status:** Active — Working Protocol

---

## Roles & Responsibilities

### Product Manager (PM)
| Owns | Does NOT Own |
|------|--------------|
| What gets built (priorities) | How it's built (implementation) |
| Why it matters (PMF, strategy) | Task scheduling |
| Acceptance criteria | Agent assignment |
| Go/No-Go decisions | Retry/decompose decisions |
| Pricing & ICP | Code quality gates |
| Market timing | Resource allocation |

### Orchestrator
| Owns | Does NOT Own |
|------|--------------|
| How work gets done | What the product is |
| Task decomposition | Business strategy |
| Agent spawning & assignment | Pricing decisions |
| Retry/escalate logic | Feature prioritization |
| Cross-agent coordination | Go-to-market timing |
| Quality gates (E2E tests) | Market positioning |

---

## Handoff Protocol

### PM → Orchestrator

```
PM Decision                    Orchestrator Action
─────────────────────────────────────────────────────────────
"Build UC-6"            →      Create task for dev agent
                               Link to E2E_MAPPINGS.md spec
                               Define acceptance criteria
                               
"Deprioritize UC-9"     →      Move task to backlog
                               Notify affected agents
                               
"Pilot is GO"           →      Spawn marketing recruitment
                               Activate onboarding flow
                               
"Pricing change"        →      Update PMF.md
                               Notify when implemented
                               
"Pivot to Teams"        →      Create new feature tasks
                               Reassign queued work
```

### Orchestrator → PM

```
Orchestrator Event             PM Action
─────────────────────────────────────────────────────────────
Task failed 3×              →  Review for spec clarity
                               Adjust acceptance criteria
                               
E2E tests failing           →  Review E2E_MAPPINGS.md
                               Is the spec realistic?
                               
Agent blocked >24h          →  Review blocker
                               Decision: deprioritize?
                               
Pilot metrics ready         →  Review PMF.md
                               Decision: adjust pricing?
                               
New competitor found        →  Update PMF.md
                               Decision: pivot features?
```

---

## Communication Channels

### Async Updates (Daily)
- **Orchestrator → PM:** Dashboard status, blockers, completions
- **PM → Orchestrator:** Priority shifts, market intel

### Sync Reviews (Weekly or Triggered)
| Trigger | Participants | Output |
|---------|--------------|--------|
| Week complete | PM + Orchestrator | Priority adjustments |
| Pilot milestone | PM + Orchestrator | Go/No-Go decision |
| Blocker >24h | PM + Orchestrator | Resolution plan |
| MRR milestone | PM + Orchestrator | Strategy adjustment |

---

## Decision Matrix

| Decision Type | Owner | Escalation To |
|---------------|-------|---------------|
| Feature priority | PM | Stojan (if strategic) |
| Task assignment | Orchestrator | PM (if skill mismatch) |
| Retry vs decompose | Orchestrator | PM (if spec unclear) |
| Pricing changes | PM | Stojan |
| Go-live timing | PM + Orchestrator | Stojan |
| Pivot product | PM | Stojan |
| Add new agent type | PM + Orchestrator | Stojan |
| Budget allocation | Stojan | — |

---

## Workflows

### 1. New Feature Request

```
PM identifies need (from PMF.md analysis)
    ↓
PM writes/edits: USE_CASES.md + E2E_MAPPINGS.md
    ↓
PM notifies Orchestrator: "Ready: UC-X"
    ↓
Orchestrator creates task(s) in Supabase
    ↓
Orchestrator spawns appropriate agent
    ↓
Agent implements + runs E2E tests
    ↓
Pass → Complete | Fail → Orchestrator decides
```

### 2. Pilot Feedback Loop

```
Pilot agents use product
    ↓
Analytics agent tracks metrics
    ↓
Metrics reviewed by PM
    ↓
PM updates PMF.md (ICP, pricing, positioning)
    ↓
PM identifies adjustments needed
    ↓
PM notifies Orchestrator of priority changes
    ↓
Orchestrator adjusts task queue
```

### 3. MRR Tracking to Product Adjustments

```
Weekly MRR check (PMF.md metrics)
    ↓
Below target?
    ↓
YES → PM analyzes: Acquisition? Churn? Pricing?
    ↓
PM decision: Adjust product | Adjust pricing | Adjust ICP
    ↓
PM notifies Orchestrator of changes
    ↓
Orchestrator updates task priorities
```

---

## Key Documents Reference

| Document | PM Owns | Orchestrator Uses |
|----------|---------|-------------------|
| PMF.md | ✅ Full | Read-only |
| USE_CASES.md | ✅ Full | Read-only |
| E2E_MAPPINGS.md | ✅ Full | Test execution |
| PRODUCT_SPEC.md | ✅ Updates | Reference |
| DASHBOARD.md | Read | ✅ Updates |
| .project.json | Read | ✅ Updates |

---

## Current Alignment (Day 12 of 60)

### Active Agreements
1. **MVP is complete** → Orchestrator holding marketing until PM gives GO
2. **Pilot recruitment is next** → Waiting on PM approval
3. **Pricing at $149 Pro** → PM owns, Orchestrator implements in Stripe when ready
4. **UC-4 intro SMS TODO** → PM accepts, not blocking pilot

### Open Decisions
| Item | PM Input Needed | Impact |
|------|-----------------|--------|
| Pilot timing | When to start recruiting | Marketing spawn |
| Free vs paid pilot | Pricing strategy | Revenue timeline |
| Next features post-pilot | UC-9, UC-10 priorities | Dev queue |

---

## Success Metrics for This Alignment

| Metric | Target | Why |
|--------|--------|-----|
| Spec clarity | <10% tasks fail due to unclear acceptance | Quality handoff |
| Response time | PM responds to orchestrator <4 hours | Velocity |
| Pivot speed | Product adjustments implemented <48 hours | Agility |
| MRR tracking | Weekly review, monthly forecast | Accountability |

---

*This document ensures PM and Orchestrator work as a team: PM decides WHAT and WHY, Orchestrator handles HOW and WHEN.*
