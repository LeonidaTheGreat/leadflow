# Road to World-Class: Genome + LeadFlow Execution Plan

> **Created:** 2026-03-23 | **Owner:** Stojan + Genome System
> **Day target:** 90 days | **Revenue target:** $20K MRR by month 6
> **Current score:** 4/10 | **Next milestone:** Phase 1 complete (6/10) by Day 45

---

## System Maturity Score (0-10)

Measured automatically every 12h by genome review. Each dimension scored 0-10.

| Dimension | Weight | Current | Day 45 | Day 60 | Day 90 |
|-----------|--------|---------|--------|--------|--------|
| Observability | 15% | 2 | 7 | 8 | 9 |
| Reliability | 15% | 5 | 7 | 8 | 9 |
| Test Coverage | 10% | 1 | 5 | 6 | 7 |
| Code Health | 10% | 4 | 6 | 7 | 8 |
| Merge Pipeline | 10% | 7 | 8 | 9 | 9 |
| Product Quality | 15% | 3 | 5 | 7 | 8 |
| Deployment | 10% | 3 | 7 | 8 | 9 |
| User Validation | 10% | 0 | 0 | 3 | 6 |
| Revenue | 0→10% | 0 | 0 | 0 | 3 |
| Self-Healing | 5% | 5 | 7 | 8 | 9 |
| **Composite** | | **3.1** | **5.6** | **6.7** | **7.8** |

---

## PHASE 1: Genome → World-Class (Days 37-45)

### 1A. Observability (Days 37-39)
- [ ] Replace `stdio: 'pipe'` in heartbeat-wrapper.js with `stdio: 'inherit'`
- [ ] Add structured JSON logging to heartbeat-executor.js (timestamp, step, outcome, duration per step)
- [ ] Create Telegram alerts for: heartbeat failure, agent crash, budget breach, stale tasks >2h
- [ ] Add `/genome-health` REST endpoint to dashboard server
- [ ] Verify: every heartbeat step produces visible output in logs

**Exit criteria:** All heartbeat steps visible in logs. Alert fires within 5 min of a failure.

### 1B. Error Propagation (Days 38-40)
- [ ] Audit all try/catch in heartbeat-executor.js — classify: fatal/degraded/expected
- [ ] Fatal errors: rethrow (abort step, report to Telegram)
- [ ] Add `stepOutcome` tracking: each heartbeat step reports success/failure/skipped
- [ ] Genome review checks: any step with 0 output = silent crash → breach

**Exit criteria:** Zero silent failures per heartbeat for 48h straight.

### 1C. Testing (Days 39-44)
- [ ] Unit tests for local-pg.js: select, insert, update, delete, .not(), .is(), .contains(), .in()
- [ ] Unit tests for workflow-engine.js: selectInitialModel, classifyAreas, checkAreaContention, estimateCost
- [ ] Regression tests for every bug found on 2026-03-23:
  - parseUTC with Date objects
  - .not('is', 'null') with string 'null'
  - insert().select().single() returns inserted row
  - prepareAndQueueSpawn doesn't set in_progress
  - createTask defaults model by agent role
- [ ] Integration test: createTask → findTaskByTitle → updateTask → getTask
- [ ] GitHub Actions CI on openclaw-genome repo

**Exit criteria:** `npm test` passes, >60% coverage on core/, CI green on push.

### 1D. Decomposition (Days 42-45)
- [ ] Extract from heartbeat-executor.js:
  - `merge-pipeline.js` (checkPRReviews, createPRForTask, retryNeedsMergeUCs)
  - `uc-lifecycle.js` (sweepUCCompletions, auditUCCompletions, retryStuckUCs, replenishQueue)
  - `spawn-manager.js` (spawnAgents, detectStuckSpawns, detectZombieTasks)
  - `quality-scanner.js` (checkBuildHealth, checkTestHealth, checkCodeQuality)
  - `action-items-manager.js` (syncActionItems, processActionItemResponses)
- [ ] Each module: own file, exported functions, own test file
- [ ] heartbeat-executor.js becomes orchestrator: calls modules in sequence

**Exit criteria:** No file >1,500 lines. Each module independently testable.

### 1E. Genome CI/CD (Days 43-45)
- [ ] GitHub Actions: lint + test on push to openclaw-genome
- [ ] Pre-heartbeat validation: syntax check all core files
- [ ] Auto-rollback: if heartbeat crashes 3x consecutively, `git checkout` to last tag

**Exit criteria:** Every genome code change is tested before it affects production.

---

## PHASE 2: LeadFlow → Production (Days 45-60)

### 2A. Supabase Migration (Days 45-48)
- [ ] Complete lib/supabase.ts → lib/db.ts re-export
- [ ] Verify all 91 API routes against PostgREST
- [ ] Remove @supabase/supabase-js from package.json
- [ ] Deploy to Vercel with correct env vars
- [ ] Code scan: 0 supabase_import findings

**Exit criteria:** `npm run build` passes with 0 Supabase references. All API routes return 200.

### 2B. End-to-End Flow (Days 48-53)
- [ ] Manual walkthrough: signup → login → onboarding → FUB connect → simulate lead → AI response
- [ ] Fix every blocker (each becomes UC with dev→QC)
- [ ] Stripe test mode: complete one full subscription flow
- [ ] Twilio: send and receive a real SMS via the platform
- [ ] Cal.com: book a real appointment through the flow

**Exit criteria:** One person can sign up and receive an AI SMS response to a simulated lead.

### 2C. CI/CD for LeadFlow (Days 50-55)
- [ ] GitHub Actions: build + test on PR
- [ ] Auto-deploy to Vercel on merge to main
- [ ] Post-deploy health check
- [ ] Branch protection: require build pass + test pass

**Exit criteria:** Every merge to main auto-deploys. No manual `vercel --prod`.

### 2D. Quality Gates (Days 53-60)
- [ ] Build must pass to merge (GitHub branch protection)
- [ ] Test pass rate >85% required
- [ ] Code scan: 0 critical, <3 high findings
- [ ] QC agent approval required for all PRs
- [ ] No new files at repo root (enforced by createPRForTask guard)

**Exit criteria:** Quality gates block bad code from reaching production.

---

## PHASE 3: Pilot → Revenue (Days 60-90)

### 3A. First Pilot (Days 60-67)
- [ ] Recruit 1 real estate agent (Stojan's network)
- [ ] White-glove onboarding: FUB setup, Twilio number, AI tuning
- [ ] Daily PM reviews during pilot (switch from weekly)
- [ ] Track: response time <30s, response quality, appointment rate

### 3B. Iterate (Days 67-75)
- [ ] Every pilot feedback → action item → UC → dev → deploy
- [ ] Fix top 3 pain points per week
- [ ] A/B test AI response quality
- [ ] NPS survey at day 7 and day 14

### 3C. Convert + Expand (Days 75-90)
- [ ] Pilot → paid conversion (Starter $49 or Pro $149)
- [ ] 2 more pilots from referral
- [ ] Self-serve signup working end-to-end
- [ ] Target: 10 agents, $1.5-3K MRR by day 90

---

## How This Document Is Used

1. **Genome review reads this file** every 12h and scores each dimension
2. **PM agent references this** when creating product reviews
3. **Human weekly review** checks progress vs targets
4. **Phase completion** triggers: update scores, adjust weights, plan next phase
5. **This file is updated** as phases complete (checked into git)

## Phase Ownership

| Phase | Primary | Secondary | Duration |
|-------|---------|-----------|----------|
| 1A-1E | Claude (you) + Genome dev agents | Stojan reviews | 8 days |
| 2A-2D | Genome dev agents (autonomous) | Claude reviews, Stojan validates | 15 days |
| 3A-3C | Stojan (relationships) | Genome handles product iteration | 30 days |
