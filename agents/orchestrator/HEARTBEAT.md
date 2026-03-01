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

### Every Heartbeat (5 min)

```javascript
async function heartbeat() {
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
  if (status.ready > 0) {
    const budget = await checkBudget();
    const canSpawn = budget.remaining > 0.5; // Min $0.50 for task
    
    if (canSpawn) {
      const readyTasks = tasks.filter(t => t.status === 'ready');
      for (const task of readyTasks.slice(0, 2)) { // Max 2 per heartbeat
        await spawnAgent(task);
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
  
  // 7. LOG heartbeat
  await logHeartbeat({
    timestamp: new Date().toISOString(),
    status,
    actions: actionsTaken,
    spawned: agentsSpawned.length,
    completed: newlyCompleted.length
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
