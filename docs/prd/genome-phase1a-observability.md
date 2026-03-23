# Genome Phase 1A: Observability

**Task ID:** 7a546fbe-669c-4c8a-88dd-4792bbb1793e  
**Status:** Implemented

## Changes Made (in ~/.openclaw/genome/)

### 1. heartbeat-wrapper.js
- Changed `stdio: 'pipe'` to `stdio: 'inherit'` on line ~81 so executor output is visible in logs.

### 2. heartbeat-executor.js
- Added JSON step logging at start and end of: `queryState`, `detectZombieTasks`, `detectStuckSpawns`, `checkCompletions`, `spawnAgents`.
- Format: `console.log(JSON.stringify({step, action, outcome, duration_ms, ...extras}))`

### 3. realtime-dispatcher.js
- Added Telegram alerts in `healthCheck()` for:
  - Heartbeat not run in >60min
  - Agent crash (zombie PID detected)
  - Budget <$2
  - Tasks stuck in ready >2h

### 4. dashboard/dashboard-server.js
- Added `GET /genome-health` endpoint returning:
  - `last_heartbeat` (from metrics table)
  - `active_agents` (in_progress task count)
  - `budget_remaining` (from budget-tracker.json)
  - `error_count_24h` (failed tasks in last 24h)
  - `stale_ready_count` (ready tasks >2h old)
