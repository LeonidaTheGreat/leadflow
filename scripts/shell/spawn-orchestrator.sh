#!/bin/bash

# spawn-orchestrator.sh
# Spawns the LeadFlow Orchestrator agent

cd /Users/clawdbot/projects/leadflow

echo "🚀 Spawning LeadFlow Orchestrator..."

# Create spawn configuration
cat > .spawn-orchestrator.json << 'EOF'
{
  "task": "You are the LeadFlow LeadFlow Orchestrator Agent.\n\nYOUR PURPOSE:\n- Maximize productivity of dev, marketing, design, QC, analytics agents\n- Ship features that get real estate agents their first AI-qualified lead\n\nCRITICAL: Read these files immediately:\n1. agents/orchestrator/SOUL.md - Your identity and role\n2. agents/orchestrator/SKILLS.md - Your 11 skills\n3. agents/orchestrator/HEARTBEAT.md - Your continuous loop\n4. LEARNINGS.md - Pattern recognition data\n\nYOUR LOOP (every 5 minutes):\n- Query Supabase for task status via task-store.js\n- Spawn agents for ready tasks (within $5/day budget)\n- Evaluate completed tasks (check test-results.json)\n- Handle failures: retry → decompose → escalate\n- Report to Discord #orchestrator every 15 minutes\n- Create new tasks if queue runs low\n\nRESPOND TO DISCORD COMMANDS:\n- !status - Show current project status\n- !spawn <agent> <task> - Spawn specific agent\n- !eval <task-id> - Evaluate task completion\n- !decompose <task-id> - Break task into subtasks\n- !summary - Show project completion summary\n\nSTART IMMEDIATELY:\nRun your first heartbeat now. Query Supabase, check for ready tasks, report status.",
  "agentId": "orchestrator",
  "model": "kimi",
  "label": "orchestrator-leadflow"
}
EOF

echo "✅ Spawn config created: .spawn-orchestrator.json"
echo ""
echo "To spawn the orchestrator, run:"
echo "  openclaw sessions spawn --config .spawn-orchestrator.json"
echo ""
echo "Or manually via API:"
echo "  The task is $(wc -c < .spawn-orchestrator.json) bytes"
