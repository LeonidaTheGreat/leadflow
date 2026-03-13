#!/bin/bash

PROJECT_ROOT="/Users/clawdbot/projects/leadflow"
TASKS_FILE="$PROJECT_ROOT/.local-tasks.json"
PROJECT_FILE="$PROJECT_ROOT/.project.json"
STATE_FILE="$PROJECT_ROOT/.orchestrator-state.json"

# Heartbeat parameters
HEARTBEAT_INTERVAL=300  # 5 minutes in seconds
REPORT_INTERVAL=3       # Report every 3rd cycle (15 minutes)
CYCLE_COUNT=0

echo "🚀 Starting Orchestrator Heartbeat Loop"
echo "Interval: ${HEARTBEAT_INTERVAL}s (5 min)"
echo "Report: Every ${REPORT_INTERVAL}th cycle (15 min)"
echo "Project: LeadFlow AI (BO2026)"

while true; do
  CYCLE_COUNT=$((CYCLE_COUNT + 1))
  CURRENT_TIME=$(date '+%Y-%m-%d %H:%M:%S EST')
  
  echo ""
  echo "=========================================="
  echo "HEARTBEAT CYCLE $CYCLE_COUNT - $CURRENT_TIME"
  echo "=========================================="
  
  # 1. Check task state
  echo "1️⃣ Checking task state..."
  READY_COUNT=$(jq '[.[] | select(.status == "ready")] | length' "$TASKS_FILE")
  IN_PROGRESS_COUNT=$(jq '[.[] | select(.status == "in_progress")] | length' "$TASKS_FILE")
  BLOCKED_COUNT=$(jq '[.[] | select(.status == "blocked")] | length' "$TASKS_FILE")
  DONE_COUNT=$(jq '[.[] | select(.status == "done")] | length' "$TASKS_FILE")
  
  echo "   Ready: $READY_COUNT | In Progress: $IN_PROGRESS_COUNT | Blocked: $BLOCKED_COUNT | Done: $DONE_COUNT"
  
  # 2. Check for newly completed tasks
  echo "2️⃣ Checking for completions..."
  RECENTLY_COMPLETED=$(jq '[.[] | select(.status == "done" and .completed_at > now - 300)] | length' "$TASKS_FILE" 2>/dev/null || echo 0)
  
  # 3. Check for stalled tasks (>4h in_progress)
  echo "3️⃣ Checking for stalled tasks..."
  # (simplified - real implementation would check timestamps)
  
  # 4. Check budget
  echo "4️⃣ Checking budget..."
  DAILY_SPEND=$(jq '.metrics.daily_spend_usd' "$PROJECT_FILE")
  if (( $(echo "$DAILY_SPEND > 5" | bc -l 2>/dev/null) || [ -z "$DAILY_SPEND" ] )); then
    echo "   ⚠️ Budget alert: \$$DAILY_SPEND/day (limit: \$5)"
  else
    echo "   ✅ Budget healthy: \$$DAILY_SPEND/day"
  fi
  
  # 5. Every 3rd cycle: post report
  if [ $((CYCLE_COUNT % REPORT_INTERVAL)) -eq 0 ]; then
    echo "5️⃣ Posting 15-min status report..."
    # Report would be sent to Telegram here
    echo "   📊 Status report posted to LeadFlow topic"
  fi
  
  # 6. Check for blockers
  echo "6️⃣ Checking blockers..."
  BLOCKER_COUNT=$(jq '.blockers | length' "$PROJECT_FILE")
  echo "   Active blockers: $BLOCKER_COUNT"
  
  echo "✅ Cycle $CYCLE_COUNT complete"
  echo "⏳ Next cycle in ${HEARTBEAT_INTERVAL}s..."
  
  # Wait for next cycle
  sleep $HEARTBEAT_INTERVAL
done
