# 🤖 Leonida Orchestrator - Supabase Integration Guide

## Architecture

```
Supabase (tasks table)  ← Single Source of Truth
       ↓
orchestrator-supabase.js  ← My task lifecycle manager
       ↓
DASHBOARD.md  ← Generated snapshot
       ↓
dashboard-simple.html  ← Live browser view (auto-refreshes)
```

## How I Work

### 1. Check Queue on Heartbeat
```javascript
const orch = new OrchestratorSupabase()
const status = await orch.getQueueStatus()
// { ready: 4, in_progress: 16, blocked: 4, done: 3 }
```

### 2. Get Ready Tasks
```javascript
const ready = await orch.getReadyTasks()
// Returns P0/P1/P2 tasks in order
ready.forEach(task => {
  console.log(`${task.title} [${task.model}] $${task.estimated_cost_usd}`)
})
```

### 3. Spawn Agent
```javascript
// Before spawning
await orch.taskSpawned(taskId, 'qc', 'haiku')
// ✅ Task status → 'in_progress'
// ✅ DASHBOARD.md regenerated
```

### 4. Complete Task
```javascript
// After agent finishes
await orch.taskCompleted(taskId, {
  success: true,
  output: 'Validation passed',
  duration_ms: 1800000,
  cost_usd: 0.45
})
// ✅ Task status → 'done'
// ✅ Dependent blocked tasks → 'ready' (auto-unblocked)
// ✅ DASHBOARD.md regenerated
```

## CLI Commands

```bash
# Check queue status
node orchestrator-supabase.js status

# Get Telegram report
node orchestrator-supabase.js report

# View full queue
node orchestrator-supabase.js queue

# See critical (P0) tasks
node orchestrator-supabase.js critical

# Regenerate DASHBOARD.md
node orchestrator-supabase.js dashboard

# Watch queue live (updates every 5s)
node supabase-client.js watch
```

## Supabase Integration Points

### Column Mapping
| When | Column | Value |
|------|--------|-------|
| Task created | `status` | `backlog` \| `ready` |
| Spawning | `status` | `in_progress` |
| | `metadata.spawned_at` | ISO timestamp |
| | `metadata.agent_id` | `qc`, `dev`, `marketing`, etc. |
| Completed | `status` | `done` |
| | `metadata.completed_at` | ISO timestamp |
| | `metadata.result_success` | `true` \| `false` |
| | `metadata.actual_cost_usd` | Real cost |
| Blocked | `status` | `blocked` |
| | `metadata.blocked_by` | Parent task ID |
| Unblocked | `status` | `ready` |
| | `metadata.unblocked_at` | ISO timestamp |

### Key Metadata Fields
```javascript
{
  spawned_at: "2026-02-25T12:30:00Z",
  agent_id: "qc",
  model: "haiku",
  completed_at: "2026-02-25T15:30:00Z",
  result_success: true,
  result_output: "Validation: all tests passed",
  duration_ms: 10800000,
  actual_cost_usd: 0.45,
  result_error: null,
  completion_event: "orchestrator_complete"
}
```

## Dashboard Updates

Every time I update a task status:
1. Supabase table updates immediately
2. `DASHBOARD.md` is regenerated (local snapshot)
3. `dashboard-simple.html` auto-refreshes (browser sees new data in 10s)

This keeps all three in sync automatically.

## Task Lifecycle State Machine

```
backlog
  ↓
ready ←─────────────────────────── unblocked (auto)
  ↓
in_progress (when spawned)
  ├─→ done (success)
  ├─→ blocked (dependency failed)
  └─→ ready (retry)
```

## Cost Tracking

**Estimated cost** (set when task created):
- Used for planning & budget forecasting
- Updated: `estimated_cost_usd` column

**Actual cost** (set when task completes):
- Real cost from agent execution
- Updated: `metadata.actual_cost_usd`

## Blocking Dependencies

Simple parent-child model:
- `task.parent_task_id = UUID` → points to the blocker
- When parent completes (`status='done'`) → child auto-unblocks
- Child moves from `blocked` → `ready`

## Error Handling

If task fails:
```javascript
await orch.taskCompleted(taskId, {
  success: false,
  error: "Validation failed: 3 assertions failed",
  output: "See logs at ...",
  cost_usd: 0.25
})
// Status → 'done' (failed)
// Does NOT auto-unblock dependents
// Requires manual review/retry
```

## Integration with My Heartbeat

In my 5-minute heartbeat loop:

```javascript
const orch = new OrchestratorSupabase()

// Check for alerts
const alerts = await orch.checkAlerts()
if (alerts.length > 0) {
  // Post alerts to Telegram topic
  for (const alert of alerts) {
    await notifyTelegram(alert)
  }
}

// Check for stalled agents
const queue = await orch.getQueueStatus()
if (queue.in_progress > 20) {
  // Alert: too many agents
}

// Report to user on command
if (commandReceived('what is status')) {
  const report = await orch.getStatusReport()
  reply(report)
}
```

## Real Example Flow

```
12:10 - User: "Go ahead with Pilot Validation"
        I: taskSpawned('validation-123', 'qc', 'haiku')
        Supabase: status='in_progress', agent_id='qc'
        DASHBOARD.md: moved to "⚡ In Progress"
        
15:10 - Agent completes
        I: taskCompleted('validation-123', { success: true, ... })
        Supabase: status='done', metadata.completed_at='...'
        Auto-unblock: 'conversion-opt-456' moves from blocked → ready
        DASHBOARD.md: validation moved to "✅ Done", conversion-opt moved to "▶️ Ready"
        
15:11 - Browser refreshes, sees: Conversion Optimization now in Ready section
```

## Notes

- **Single source of truth:** Supabase table
- **Metadata:** Use for custom tracking (logs, results, timings)
- **Auto-unblock:** Only works with simple parent-child dependencies
- **Dashboard:** Regenerated on every task status update (cheap operation)
- **Real-time view:** Open `dashboard-simple.html` in browser for live updates

---

*This guide keeps Leonida's task orchestration in sync with Supabase. All references to "I" or "my" mean the Leonida orchestrator agent.*
