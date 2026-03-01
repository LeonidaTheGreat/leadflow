---
title: HEARTBEAT.md - LeadFlow Orchestrator
author: Stojan
date: 2026-02-24
tags: [heartbeat, orchestrator, always-on]
project: leadflow-ai
template_version: 1.4
---

# Orchestrator Agent - HEARTBEAT.md

**Purpose:** Define proactive behavior for always-on orchestrator agent  
**Frequency:** Every 5 minutes (300 seconds)  
**Platform:** Discord (always-on presence)

---

## Blocker Detection: How It Works

**Goal:** Surface blockers after 1 hour of zero meaningful progress

**Mechanics:**
1. **Activity state file** (`.activity-state.json`) tracks:
   - `lastMeaningfulChange`: when work last advanced
   - `lastBlockerAlert`: when last stall alert fired
   - `blockerAlertDebounce`: 1 hour (prevents alert spam)

2. **On each heartbeat (5m):**
   - Check elapsed time since last meaningful change
   - If >60 min **AND** last alert >60 min ago → fire blocker alert
   - Alert lists blocked tasks + their reasons
   - Update `lastBlockerAlert` to reset 1-hour debounce

3. **When work advances:**
   - Task completes, OR
   - New task spawns, OR
   - Ready queue grows → update `lastMeaningfulChange`

4. **Result:**
   - First 60min stalled: quiet (NO_REPLY)
   - After 60min stalled: blocker alert fires (visible)
   - Every 60min stalled thereafter: re-alert (if still blocked)

---

## 4-Loop Integration (v2)

> **Full docs: [`docs/4-LOOP-ARCHITECTURE.md`](docs/4-LOOP-ARCHITECTURE.md)**

The heartbeat now runs 4 interconnected loops in `heartbeat-executor.js`:

```
1.  queryState()              -- Read queue from Supabase
2.  detectZombieTasks()       -- PID-check, handle zombies
3.  checkCompletions()        -- Process completion reports
4.  spawnAgents()             -- Cross-loop learning + budget check + spawn
5.  checkBlockers()           -- Check blocked tasks
5b. runSelfHealChecks()       -- Self-heal (Loop 4: Self-Learning)
6.  replenishQueue()          -- UC roadmap -> tasks (Loop 1: Execution)
6b. processProductFeedback()  -- Feedback -> PM tasks (Loop 3: Product)
6c. checkPRReviews()          -- Merge/rework PRs (Loop 2: QC)
7.  updateDashboard()         -- Regenerate dashboard
8.  reportToTelegram()        -- Telegram report
9.  logHeartbeat()            -- Write to metrics table + log file
```

**Key additions over v1:**
- `replenishQueue()` reads from `use_cases` table, creates tasks for next UC workflow step
- `createFollowUpTasks()` chains PM->Dev->QC automatically on task completion
- `processProductFeedback()` routes feedback to PM agent for analysis
- `checkPRReviews()` auto-merges approved PRs, creates fix tasks for rejected ones
- `runSelfHealChecks()` detects and auto-heals critical issues
- Metrics written to `metrics` table (not just local files)
- Learning system drives model selection in `spawnAgents()`

---

## Heartbeat Schedule

```
Every 5 minutes:
├── 09:00 - Heartbeat 1
├── 09:05 - Heartbeat 2
├── 09:10 - Heartbeat 3
├── 09:15 - Heartbeat 4 + REPORT to Stojan
├── 09:20 - Heartbeat 5
├── 09:25 - Heartbeat 6
├── 09:30 - Heartbeat 7
├── 09:35 - Heartbeat 8
├── 09:40 - Heartbeat 9
├── 09:45 - Heartbeat 10 + REPORT to Stojan
└── ... continues
```

**Reporting to Stojan:** Every 3rd heartbeat (every 15 minutes)

---

## Heartbeat Actions

### Activity State Management

Before every heartbeat, check `.activity-state.json`:

```bash
# Check for stalls (no meaningful changes >1hr)
STATE_FILE="./.activity-state.json"
LAST_CHANGE=$(jq -r '.lastMeaningfulChange' "$STATE_FILE")
LAST_ALERT=$(jq -r '.lastBlockerAlert' "$STATE_FILE")
ALERT_DEBOUNCE=$(jq -r '.blockerAlertDebounce' "$STATE_FILE")

LAST_CHANGE_SEC=$(date -d "$LAST_CHANGE" +%s)
LAST_ALERT_SEC=$(date -d "$LAST_ALERT" +%s)
NOW_SEC=$(date +%s)

ELAPSED=$((NOW_SEC - LAST_CHANGE_SEC))
ALERT_ELAPSED=$((NOW_SEC - LAST_ALERT_SEC))
DEBOUNCE_SEC=3600  # 1 hour

if [ $ELAPSED -gt $DEBOUNCE_SEC ] && [ $ALERT_ELAPSED -gt $DEBOUNCE_SEC ]; then
  TRIGGER_BLOCKER_ALERT=1
else
  TRIGGER_BLOCKER_ALERT=0
fi
```

### Every Heartbeat (5 min)

```javascript
async function heartbeat() {
  // 0. CHECK activity state for stalls
  const activityState = readActivityState('./.activity-state.json');
  const elapsedSinceChange = (Date.now() - new Date(activityState.lastMeaningfulChange).getTime()) / 1000 / 60;  // minutes
  const elapsedSinceAlert = (Date.now() - new Date(activityState.lastBlockerAlert).getTime()) / 1000 / 60;  // minutes
  
  // If stalled >60min AND alert debounce >60min, flag blockers
  if (elapsedSinceChange > 60 && elapsedSinceAlert > 60) {
    // Report blocker alert (don't reply NO_REPLY; surface this)
    await reportBlockerAlert({
      stalledMinutes: Math.round(elapsedSinceChange),
      lastMeaningfulChange: activityState.lastMeaningfulChange
    });
    
    // Update alert timestamp to debounce next alert for 1hr
    activityState.lastBlockerAlert = new Date().toISOString();
    writeActivityState('./.activity-state.json', activityState);
  }
  
  // 1. QUERY Supabase for current state
  const tasks = await store.getTasks();
  const status = {
    ready: tasks.filter(t => t.status === 'ready').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    done: tasks.filter(t => t.status === 'done').length
  };
  
  // 2. CHECK for newly completed tasks
  const newlyCompleted = tasks.filter(t => {
    const completed = new Date(t.completed_at);
    return completed > lastHeartbeatTime;
  });
  
  for (const task of newlyCompleted) {
    // Read test results
    const testResults = await loadTestResults(task.id);
    
    if (testResults.allPassed) {
      // Mark done, unblock next
      await handleTaskCompletion(task);
    } else {
      // Decide: retry / decompose / escalate
      await handleTestFailure(task, testResults);
    }
  }
  
  // 3. SPAWN agents if ready tasks exist and budget allows
  let workAdvanced = false;
  if (status.ready > 0) {
    const budget = await checkBudget();
    const canSpawn = budget.remaining > 0.5; // Min $0.50 for task
    
    if (canSpawn) {
      const readyTasks = tasks.filter(t => t.status === 'ready');
      for (const task of readyTasks.slice(0, 2)) { // Max 2 per heartbeat
        await spawnAgent(task);
        workAdvanced = true;
      }
    }
  }
  
  // 4. CHECK blocked tasks
  if (status.blocked > 0) {
    const blockedTasks = tasks.filter(t => t.status === 'blocked');
    for (const task of blockedTasks) {
      // Check if blocker resolved
      if (await isBlockerResolved(task)) {
        await unblockTask(task);
      } else if (isNewBlocker(task)) {
        // Create task to resolve blocker
        await createBlockerResolutionTask(task);
      }
    }
  }
  
  // 5. CHECK queue depth
  if (status.ready < 2) {
    // Queue running low - create new tasks
    await createAnticipatoryTasks(3 - status.ready);
  }
  
  // 6. UPDATE dashboard (verify real-time connection)
  await verifyDashboardConnection();
  
  // 7. UPDATE activity state if meaningful work happened
  const meaningfulWork = (newlyCompleted.length > 0 || workAdvanced || 
                          (status.ready > 0 && status.ready !== lastStatus.ready));
  
  if (meaningfulWork) {
    activityState.lastMeaningfulChange = new Date().toISOString();
    writeActivityState('./.activity-state.json', activityState);
    const updateMsg = `✅ Meaningful progress: ${newlyCompleted.length} tasks done, spawned ${agentsSpawned.length}, ready tasks ${status.ready}`;
  } else if (elapsedSinceChange <= 60) {
    // Still within quiet window, no alert needed
    return { status, message: 'NO_REPLY' };
  }
  
  // 8. LOG heartbeat
  await logHeartbeat({
    timestamp: new Date().toISOString(),
    status,
    actions: actionsTaken,
    spawned: agentsSpawned.length,
    completed: newlyCompleted.length,
    meaningfulWork
  });
}
```

### Every 3rd Heartbeat (15 min) - REPORT

```javascript
async function reportToStojan() {
  const tasks = await store.getTasks();
  const report = generateStatusReport(tasks);
  
  // Post to Discord
  message({
    action: "send",
    message: `
📊 LeadFlow AI Status (${new Date().toLocaleTimeString()})
├── Progress: ${report.done}/${report.total} tasks (${report.percent}%)
├── Today: ${report.completedToday} completed, ${report.decomposedToday} decomposed
├── Active Agents: ${report.inProgress} (${report.agentList.join(', ')})
├── Queue: ${report.ready} ready | ${report.blocked} blocked
├── Budget: $${report.budgetSpent.toFixed(2)}/$5.00 (${report.budgetPercent}%)
└── Dashboard: dashboard.html
    `.trim()
  });
  
  // Also report productivity metrics
  const productivity = await calculateAgentProductivity();
  if (productivity.hasChanges) {
    message({
      action: "send",
      message: `
📈 Agent Productivity (7-day)
${Object.entries(productivity.agents).map(([agent, stats]) => 
  `├── ${agent}: ${stats.tasks} tasks, ${stats.avgTime}h avg, ${stats.successRate}% success`
).join('\n')}
└── Overall: ${productivity.overall.successRate}% success rate
      `.trim()
    });
  }
}
```

---

## Proactive Behaviors

### 1. Queue Never Empty

```
IF ready_tasks < 2:
  CREATE new_tasks(3 - ready_tasks)
  NOTIFY: "📝 Queue running low. Created 2 new tasks."
```

### 2. Agents Never Idle

```
IF in_progress == 0 AND ready > 0:
  SPAWN agents immediately
  NOTIFY: "🚀 All agents idle. Spawning for ready tasks."

IF in_progress == 0 AND ready == 0:
  CREATE exploratory_tasks()
  NOTIFY: "📝 No work available. Creating exploration tasks."
```

### 3. Blockers Resolved Quickly

```
FOR each blocked_task:
  IF blocked_duration > 30 minutes:
    INVESTIGATE blocker
    CREATE resolution_task
    NOTIFY: "⏸️  Blocker detected. Created resolution task."
```

### 4. Budget Monitoring

```
IF daily_spend > $4.00:
  ALERT: "⚠️  Budget 80% used. Slowing spawn rate."
  
IF daily_spend > $4.50:
  ALERT: "🚨 Budget 90% used. Only critical tasks."
  
IF daily_spend > $5.00:
  ALERT: "❌ Budget exceeded. Stopping spawns until tomorrow."
  HALT spawns
```

### 5. Dashboard Health Check

```
IF dashboard_connection_stale > 5 minutes:
  RESTART dashboard subscription
  NOTIFY: "🔄 Dashboard reconnected"
  
IF dashboard_data_mismatch:
  FORCE dashboard refresh
  NOTIFY: "🔄 Dashboard sync issue resolved"
```

---

## Heartbeat Quiet Hours

**No reporting during:**
- 11:00 PM - 7:00 AM (unless critical)

**Critical events ALWAYS reported:**
- Budget exceeded
- System errors
- External service failures
- Security issues

---

## Heartbeat Logging

```javascript
// Log each heartbeat for debugging
{
  "timestamp": "2026-02-24T14:30:00Z",
  "heartbeat_number": 42,
  "status": {
    "ready": 3,
    "in_progress": 2,
    "blocked": 1,
    "done": 24
  },
  "actions": [
    "spawned_dev_agent_for_auth_flow",
    "marked_landing_page_done",
    "unblocked_cal_com_integration"
  ],
  "metrics": {
    "spawned": 1,
    "completed": 1,
    "budget_remaining": 1.80
  }
}
```

---

## Heartbeat Response Patterns

### When User Says "HEARTBEAT_OK"

This means: "Continue your loop, nothing special needed"

Your response: Continue normal heartbeat operations

### When User Says "Status?"

Run `reportToStojan()` immediately (out-of-band report)

### When User Says "Spawn [agent] for [task]"

Execute spawn immediately, then continue heartbeat

### When User Says "Block [task] because [reason]"

Update task status, create resolution task, continue heartbeat

---

## Heartbeat Self-Checks

### Check 1: Am I Still Connected?
```javascript
// Verify Discord connection
if (!discordConnected) {
  reconnectDiscord();
  notifyStojan("🔄 Reconnected to Discord");
}
```

### Check 2: Is Supabase Responding?
```javascript
// Verify Supabase connection
try {
  await store.getTasks({ limit: 1 });
} catch (error) {
  notifyStojan("⚠️  Supabase connection issue");
  retryConnection();
}
```

### Check 3: Is Dashboard Updating?
```javascript
// Verify dashboard subscription
if (dashboardLastUpdate < Date.now() - 5 * 60 * 1000) {
  restartDashboardSubscription();
}
```

---

## Heartbeat vs Discord Commands

| Trigger | Action | Frequency |
|---------|--------|-----------|
| Heartbeat | Monitor, spawn, evaluate | Every 5 min |
| Heartbeat ×3 | Report to Stojan | Every 15 min |
| `!status` command | Immediate full report | On demand |
| `!spawn` command | Immediate spawn | On demand |
| Task completion | Immediate evaluation | Event-driven |
| Test failure | Immediate decision | Event-driven |

---

## Example Heartbeat Log

```
[14:00:00] Heartbeat #42
  Status: 3 ready | 2 in progress | 1 blocked | 24 done
  Actions: Spawned Dev Agent for "Auth Flow"
  
[14:05:00] Heartbeat #43
  Status: 2 ready | 3 in progress | 1 blocked | 24 done
  Actions: None (agents working)
  
[14:10:00] Heartbeat #44
  Status: 2 ready | 3 in progress | 1 blocked | 24 done
  Actions: None (agents working)
  
[14:15:00] Heartbeat #45 + REPORT
  Status: 2 ready | 3 in progress | 1 blocked | 24 done
  Actions: Posted status to Discord
  📊 Report: 24/50 tasks (48%), 3 active agents, $2.20/$5 budget
  
[14:20:00] Heartbeat #46
  Status: 2 ready | 2 in progress | 1 blocked | 25 done
  Actions: Marketing Agent completed "Landing Page"
```

---

## Success Criteria

**Heartbeat is working when:**
- ✅ Supabase queried every 5 minutes
- ✅ Agents spawned within 5 min of task ready
- ✅ Completed tasks evaluated within 5 min
- ✅ Stojan receives report every 15 min
- ✅ Dashboard connection verified each heartbeat
- ✅ Blockers investigated within 30 min
- ✅ Queue never empty for >10 min

---

## Failure Modes

| Issue | Detection | Action |
|-------|-----------|--------|
| Supabase down | Query fails | Retry 3×, then alert Stojan |
| Discord disconnected | Send fails | Reconnect, alert Stojan |
| Dashboard stale | No updates >10 min | Restart subscription |
| No tasks for 1 hour | ready=0, in_progress=0 | Create exploration tasks |
| Budget exceeded | spent > $5 | Halt spawns, alert Stojan |

---

## Activity State Helpers

### readActivityState(filePath)
```javascript
function readActivityState(filePath) {
  const fs = require('fs');
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {
      lastMeaningfulChange: new Date().toISOString(),
      lastBlockerAlert: new Date().toISOString(),
      blockerAlertDebounce: "1h"
    };
  }
}
```

### writeActivityState(filePath, state)
```javascript
function writeActivityState(filePath, state) {
  const fs = require('fs');
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}
```

### reportBlockerAlert(context)
```javascript
async function reportBlockerAlert(context) {
  const tasks = await store.getTasks();
  const blockedTasks = tasks.filter(t => t.status === 'blocked');
  const readyTasks = tasks.filter(t => t.status === 'ready');
  
  const report = `
⚠️  ORCHESTRATOR STALL DETECTED
├── No meaningful progress for ${context.stalledMinutes} minutes
├── Last change: ${context.lastMeaningfulChange}
├── Ready tasks: ${readyTasks.length}
├── Blocked tasks: ${blockedTasks.length}
├── Blockers:
${blockedTasks.map(t => `│  • ${t.id}: ${t.blockReason || 'unknown reason'}`).join('\n')}
└── Action: Investigate and resolve blockers to resume work
  `;
  
  await message({
    action: "send",
    message: report.trim()
  });
}
```

---

## Remember

**The heartbeat is your lifeline.** Without it:
- Tasks pile up unspawned
- Completed work sits unevaluated
- Stojan doesn't know status
- Blockers linger unresolved
- Queue runs empty

**With heartbeat:**
- Continuous flow of work
- Immediate evaluation
- Proactive reporting
- No idle time
- Maximum productivity

**Be relentless about your heartbeat.**

---

*Orchestrator Heartbeat v1.0 - Always On*
