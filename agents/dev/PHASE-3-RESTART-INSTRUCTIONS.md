---
title: Phase 3 Restart Instructions
date: 2026-02-25
task_id: phase3-decomp
status: READY_TO_SPAWN
author: Orchestrator Subagent
---

# 🚀 Phase 3: UC-7/8 Restart Instructions

## Current State

✅ **UC-6: Cal.com Booking Confirmation** - COMPLETE (deployed, tested)  
🟡 **UC-7: Dashboard Manual SMS** - ASSIGNED (not yet spawned)  
🟡 **UC-8: Follow-up Sequences** - ASSIGNED (not yet spawned)  

**Reason for delay:** Tasks created but no Dev agent spawned to execute them.

---

## What Was Done (Phase 2 - Decomposition)

1. ✅ Read UC-7 and UC-8 full requirements from task files
2. ✅ Analyzed UC-6 completion pattern for technical approach
3. ✅ Broke UC-7 into **4 milestones** (6 hours total)
4. ✅ Broke UC-8 into **4 milestones** (12 hours total)
5. ✅ Identified dependencies and resource gaps
6. ✅ Created execution plan with parallel opportunities
7. ✅ Documented success criteria (testable, clear)

---

## Deliverable: PHASE-3-DECOMPOSITION.json

Full decomposition saved to:
```
/Users/clawdbot/.openclaw/workspace/business-opportunities-2026/agents/dev/PHASE-3-DECOMPOSITION.json
```

**Format:** Machine-readable JSON with all milestones, effort estimates, success criteria, dependencies, and deployment checklist.

---

## Quick Summary

### UC-7: Dashboard Manual SMS (6 hours)

**Goal:** Agents can send SMS from dashboard + see message history + use AI for suggestions

| Milestone | Hours | What It Does |
|-----------|-------|------------|
| **M1** | 2h | Create `/api/sms/send-manual` endpoint + message persistence |
| **M2** | 1.5h | Build MessageThread component (conversation history UI) |
| **M3** | 2.5h | Build SmsComposer (input + AI Assist button) |
| **M4** | 0.5h | Wire into lead detail page + E2E testing |

**Dependencies:** UC-6 complete ✅, Twilio working ✅

---

### UC-8: Follow-up Sequences (12 hours)

**Goal:** Automated SMS follow-ups (24h no response, post-viewing, no-show, nurture sequences)

| Milestone | Hours | What It Does |
|-----------|-------|------------|
| **M1** | 1.5h | Create `lead_sequences` table + sequence types + templates |
| **M2** | 2.5h | Build `/api/cron/follow-up` cron job (hourly runner) |
| **M3** | 1.5h | Implement state machine (pause/resume, max 3 messages) |
| **M4** | 1.5h | Test suite + manual testing + Vercel cron setup |

**Dependencies:** UC-6 complete ✅, UC-7-M1 endpoint working (so cron can call it)

---

## Execution Strategy

### Timeline
- **Phase 1 (4h, parallel):** UC7-M1 + UC7-M2 + UC8-M1
- **Phase 2 (3h, sequential):** UC7-M3 + UC8-M2 (depends on UC7-M1 working)
- **Phase 3 (3h, final):** UC7-M4 + UC8-M3 + UC8-M4 (integration, testing, deploy)

### Checkpoints
1. After Phase 1: UC-7 API verified working, UC-8 schema valid
2. After Phase 2: UC-7 UI wired, UC-8 cron logic complete
3. After Phase 3: All E2E tests passing, code merged to main

### Resource Requirements
- **Vercel Pro plan** (needed for cron) — assumed available
- **Test Twilio number** — use existing
- **Claude Haiku API** (for AI suggestions) — already integrated
- **Supabase** — already connected

### Risk Mitigation
- **AI latency:** Use Haiku (fast), set 5s timeout, show spinner
- **Cron failures:** Comprehensive logging, monitor Vercel logs
- **Race conditions:** Database constraints + atomic transactions
- **Timezone handling:** Start with UTC assumption, add field later if needed

---

## Ready to Spawn?

✅ **YES** — All dependencies verified, requirements clear, milestones defined, effort estimated, success criteria testable.

**Blockers:** None. Ready to go.

---

## Spawn Recommendation

**Target:** Dev Agent (business-opportunities-2026/agents/dev/)

**Prompt Template:**
```
You are the Dev Agent for LeadFlow AI.

UC-6 (Cal.com booking) is COMPLETE and deployed.

UC-7 (Dashboard Manual SMS) and UC-8 (Follow-up Sequences) are now READY TO START.

I've decomposed both UCs into clear milestones with success criteria:
- UC-7: 6 hours (4 milestones)
- UC-8: 12 hours (4 milestones)
- Total: 26 hours

EXECUTION PLAN:
1. Phase 1 (4h, parallel): UC7-M1 API + UC7-M2 MessageThread + UC8-M1 Schema
2. Phase 2 (3h, sequential): UC7-M3 SmsComposer + UC8-M2 Cron
3. Phase 3 (3h, final): UC7-M4 Integration + UC8-M3 Controls + UC8-M4 Testing

CHECKPOINT after each phase. Full decomposition in PHASE-3-DECOMPOSITION.json.

GOAL: Both UCs production-ready for pilot launch by 2026-02-27.

START NOW. No waiting.
```

---

## Reference Files

- **Decomposition:** `PHASE-3-DECOMPOSITION.json` (all milestones + criteria)
- **UC-7 Spec:** `TASK-003-uc7-dashboard-manual-sms.md`
- **UC-8 Spec:** `TASK-004-uc8-follow-up-sequences.md`
- **UC-6 Example:** `TASK-002-COMPLETED.md` (reference implementation quality)
- **Dashboard:** `/business-opportunities-2026/DASHBOARD.md`
- **Use Cases:** `/business-opportunities-2026/USE_CASES.md`

---

## Success Definition

✅ Both UCs production-ready when:
- All TypeScript errors = 0
- All unit tests pass
- All E2E tests pass
- Code merged to main branch
- Deployed to Vercel (staging verified)
- Cron verified running hourly
- Manual SMS verified working (real Twilio number)

---

**Ready to deploy. Waiting for Dev Agent spawn.**

*Generated: 2026-02-25 10:35 EST*  
*Decomposition completed by: Orchestrator Subagent*
