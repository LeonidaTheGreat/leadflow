#!/bin/bash

# watchdog-orchestrator.sh
# Checks if orchestrator is alive, respawns if dead
# Run this every 5 minutes via cron

cd /Users/clawdbot/projects/leadflow

HEARTBEAT_FILE=".orchestrator-heartbeat"
MAX_AGE_MINUTES=10
LOG_FILE="orchestrator-watchdog.log"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK_URL:-}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_orchestrator() {
    # Check if heartbeat file exists and is recent
    if [ ! -f "$HEARTBEAT_FILE" ]; then
        log "❌ No heartbeat file found"
        return 1
    fi
    
    # Read last heartbeat time
    local last_heartbeat=$(cat "$HEARTBEAT_FILE" 2>/dev/null || echo "0")
    local current_time=$(date +%s)
    local age_minutes=$(( (current_time - last_heartbeat) / 60 ))
    
    if [ "$age_minutes" -gt "$MAX_AGE_MINUTES" ]; then
        log "⚠️  Orchestrator heartbeat stale ($age_minutes min ago)"
        return 1
    fi
    
    log "✅ Orchestrator alive (heartbeat $age_minutes min ago)"
    return 0
}

respawn_orchestrator() {
    log "🔄 Respawning orchestrator..."
    
    # Clear old state
    rm -f "$HEARTBEAT_FILE"
    rm -f ".orchestrator.lock"
    
    # Create fresh spawn config
    cat > .spawn-orchestrator.json << 'INNERSPAWN'
{
  "task": "BO2026 ORCHESTRATOR - RESTARTED\n\nYou are the LeadFlow Orchestrator. Previous session died.\n\nIMMEDIATE ACTIONS:\n1. Read agents/orchestrator/SOUL.md\n2. Read agents/orchestrator/SKILLS.md\n3. Query Supabase for current task status\n4. Post to #orchestrator: '🔄 Orchestrator restarted'\n5. Resume normal heartbeat loop\n\nReport current project status to Stojan.",
  "agentId": "orchestrator",
  "model": "kimi",
  "label": "orchestrator-bo2026"
}
INNERSPAWN
    
    log "✅ Spawn config ready. Manual spawn required."
    log "   Config: .spawn-orchestrator.json"
    
    # Notify Discord if webhook available
    if [ -n "$DISCORD_WEBHOOK" ]; then
        curl -s -X POST -H "Content-Type: application/json" \
            -d '{"content":"🚨 BO2026 Orchestrator died and was restarted. Check #orchestrator channel."}' \
            "$DISCORD_WEBHOOK" > /dev/null 2>&1 || true
    fi
}

# Main
log "🔍 Watchdog check starting..."

if ! check_orchestrator; then
    respawn_orchestrator
    exit 1
fi

exit 0
