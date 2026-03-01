#!/bin/bash
# Orchestrator Re-spawn Script
# Use this to trigger the next monitoring cycle

TASK="ORCHESTRATOR MONITORING CYCLE - LeadFlow AI

You are the Orchestrator for LeadFlow AI (business-opportunities-2026 project).

**Previous cycle:** See ORCHESTRATOR-REPORT-*-*.md for last check
**State file:** .orchestrator-state.json

**This Cycle Tasks:**
1. Read .project.json (current state)
2. Read agents/*/NOTES/ (latest agent status)  
3. Check for stalled tasks (>4h no progress)
4. Check for new completions or blockers
5. Spawn ready tasks if approved by user
6. Report status ONLY if changed (or 4h since last full report)

**Context from last cycle:**
- UC-6/7/8: ✅ COMPLETE
- QC Compliance: ✅ COMPLETE  
- Analytics Dashboard: ✅ COMPLETE
- Design: Unblocked with copy (should be completing)
- Marketing: ON HOLD (user directive)
- Ready tasks: Onboarding Guide, Email Notif, Load Test (awaiting user approval)

**Decision Logic:**
- IF Design completed → Notify user
- IF user approved ready tasks → Spawn them
- IF task stalled >4h → Investigate + decompose
- IF new blocker → Report + propose solution
- IF no changes → HEARTBEAT_OK (no message)

**Authority:**
✅ Spawn non-marketing tasks when ready
✅ Unblock agents  
✅ Investigate stalls
❌ Marketing recruitment (HOLD)
❌ Business decisions

Complete check, update state, report if needed, then signal ready for next cycle."

echo "Spawning orchestrator cycle..."
echo "$TASK"

# Uncomment to actually spawn:
# openclaw agent spawn --label "orchestrator-cycle" --task "$TASK"
