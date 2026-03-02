#!/bin/bash
#
# BO2026 Autonomous Heartbeat Script
# Run this every 15 minutes via cron or LaunchAgent
#
# Sets up the self-improving, self-testing, self-tasking system
#

set -e

echo "🤖 BO2026 Autonomous System Heartbeat"
echo "======================================"
echo "Started: $(date)"
echo ""

cd /Users/clawdbot/projects/leadflow

# 1. Dashboard Auto-Sync (every run)
echo "📊 Step 1: Dashboard Auto-Sync"
if [ -f "product/lead-response/dashboard/scripts/update_dashboard.py" ]; then
    python3 product/lead-response/dashboard/scripts/update_dashboard.py 2>&1 || echo "⚠️ Dashboard update failed"
else
    echo "⚠️ Dashboard updater not found"
fi
echo ""

# 2. Task Dispatcher (only on hour boundaries: 00, 15, 30, 45)
MINUTE=$(date +%M)
if [ "$MINUTE" == "00" ] || [ "$MINUTE" == "15" ] || [ "$MINUTE" == "30" ] || [ "$MINUTE" == "45" ]; then
    echo "🎯 Step 2: Task Dispatcher"
    if [ -f "product/lead-response/dashboard/scripts/task-dispatcher.ts" ]; then
        cd product/lead-response/dashboard
        npx ts-node scripts/task-dispatcher.ts 2>&1 || echo "⚠️ Task dispatcher failed"
        cd /Users/clawdbot/projects/leadflow
    else
        echo "⚠️ Task dispatcher not found"
    fi
    echo ""
fi

# 3. Agent Completion Notifications
echo "🔔 Step 3: Agent Completion Notifications"
if [ -f "scripts/agent-notifier.ts" ]; then
    npx ts-node scripts/agent-notifier.ts 2>&1 || echo "⚠️ Agent notifier failed"
else
    echo "⚠️ Agent notifier not found"
fi
echo ""

# 3b. TG-Discord Bridge (Every 5 min)
echo "🌉 Step 3b: TG-Discord Bridge"
if [ -f "scripts/tg-discord-bridge.ts" ]; then
    npx ts-node scripts/tg-discord-bridge.ts 2>&1 || echo "⚠️ Bridge failed"
else
    echo "⚠️ Bridge not found"
fi
echo ""

# 4. Git Sync (if there are changes)
echo "🔄 Step 4: Git Sync Check"
if [ -d ".git" ]; then
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
        echo "Found uncommitted changes:"
        git status --short
        
        # Only auto-commit safe files
        git add memory/ 2>/dev/null || true
        git add DASHBOARD.md dashboard.html 2>/dev/null || true
        
        if [ -n "$(git diff --cached --name-only 2>/dev/null)" ]; then
            git commit -m "Auto-sync: heartbeat updates $(date +%Y-%m-%d-%H:%M)" 2>&1 || echo "⚠️ Commit failed"
            git push origin main 2>&1 || echo "⚠️ Push failed (will retry next run)"
        fi
    else
        echo "No changes to commit"
    fi
else
    echo "⚠️ Not a git repository"
fi
echo ""

echo "✅ Heartbeat complete: $(date)"
echo "Next run: $(date -v+15M 2>/dev/null || date -d '+15 minutes' 2>/dev/null || echo 'in 15 minutes')"
