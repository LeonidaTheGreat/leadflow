#!/usr/bin/env node
/**
 * Generate DASHBOARD.md from Supabase tasks table
 * 
 * Run: node generate-dashboard.js
 * 
 * This creates a markdown snapshot of current queue state.
 * Auto-run on each task update.
 */

const SupabaseTaskClient = require('./supabase-client')
const fs = require('fs')
const path = require('path')

async function generateDashboard() {
  const client = new SupabaseTaskClient()
  const queue = await client.getQueue()
  const summary = await client.getSummary()

  const timestamp = new Date().toLocaleString('en-US', { 
    timeZone: 'America/Toronto'
  })

  // Build markdown
  let md = `# 📊 BO2026 Dashboard

**Last updated:** ${timestamp} EST  
**Project:** Business Opportunities 2026  
**Goal:** $20K MRR in 60 days

---

## 📈 Queue Status

| Status | Count | Status |
|--------|-------|--------|
| **Ready** | ${summary.ready} | ▶️ Can spawn now |
| **In Progress** | ${summary.in_progress} | ⚡ Active |
| **Blocked** | ${summary.blocked} | ⏸️ Waiting |
| **Done** | ${summary.done} | ✅ Completed |
| **Backlog** | ${summary.backlog} | 📋 Future |
| **TOTAL** | ${summary.total} | |

**Queue Health:**
- ${summary.queue_health.has_ready ? '✅' : '🔴'} Tasks ready to spawn: ${summary.ready > 0 ? 'Yes' : 'No'}
- ${summary.queue_health.has_blockers ? '⏸️' : '✅'} Blocked tasks: ${summary.blocked}
- ⚡ Active agents: ${summary.in_progress}

---

## ▶️ Ready to Spawn (${summary.ready} tasks)

`

  if (queue.ready.length > 0) {
    md += '| Title | Model | Cost | Priority |\n'
    md += '|-------|-------|------|----------|\n'
    queue.ready.forEach(t => {
      const pri = t.priority === 1 ? '🔴 P0' : t.priority === 2 ? '🟡 P1' : '🟢 P2'
      md += `| ${t.title} | ${t.model} | $${(t.estimated_cost_usd || 0).toFixed(2)} | ${pri} |\n`
    })
  } else {
    md += '*No ready tasks*\n'
  }

  md += `
---

## ⚡ In Progress (${summary.in_progress} tasks)

`

  if (queue.in_progress.length > 0) {
    md += '| Title | Agent | Model | Started |\n'
    md += '|-------|-------|-------|----------|\n'
    queue.in_progress.slice(0, 10).forEach(t => {
      const agent = t.agent_id || '—'
      const started = t.metadata?.started_at ? new Date(t.metadata.started_at).toLocaleTimeString() : '—'
      md += `| ${t.title} | ${agent} | ${t.model} | ${started} |\n`
    })
    if (queue.in_progress.length > 10) {
      md += `| ... and ${queue.in_progress.length - 10} more | | | |\n`
    }
  } else {
    md += '*No active tasks*\n'
  }

  md += `
---

## ⏸️ Blocked (${summary.blocked} tasks)

`

  if (queue.blocked.length > 0) {
    md += '| Title | Blocked By | Priority |\n'
    md += '|-------|------------|----------|\n'
    queue.blocked.forEach(t => {
      const blocker = t.parent_task_id ? `Parent task: ${t.parent_task_id.slice(0, 8)}...` : 'External'
      const pri = t.priority === 1 ? '🔴 P0' : t.priority === 2 ? '🟡 P1' : '🟢 P2'
      md += `| ${t.title} | ${blocker} | ${pri} |\n`
    })
  } else {
    md += '*No blocked tasks*\n'
  }

  md += `
---

## ✅ Done (${summary.done} recent tasks)

`

  if (queue.done.length > 0) {
    md += '| Title | Completed | Agent |\n'
    md += '|-------|-----------|-------|\n'
    queue.done.slice(0, 10).forEach(t => {
      const completed = t.metadata?.completed_at ? new Date(t.metadata.completed_at).toLocaleDateString() : '—'
      const agent = t.agent_id || '—'
      md += `| ${t.title} | ${completed} | ${agent} |\n`
    })
    if (queue.done.length > 10) {
      md += `| ... and ${queue.done.length - 10} more | | |\n`
    }
  } else {
    md += '*No completed tasks*\n'
  }

  md += `
---

## 💰 Cost Summary

**Total estimated cost:** $${summary.total_estimated_cost}

---

## 🔄 Next Actions

`

  if (summary.ready > 0) {
    md += `- ✅ **${summary.ready} tasks ready to spawn**\n`
  }

  if (summary.blocked > 0) {
    md += `- ⏸️ **${summary.blocked} tasks blocked** — waiting for dependencies\n`
  }

  if (summary.in_progress > 0) {
    md += `- ⚡ **${summary.in_progress} agents active**\n`
  }

  md += `
---

## 📖 How to Use This Dashboard

- **Refresh:** Run \`node generate-dashboard.js\` or check \`dashboard-simple.html\`
- **Update status:** Use \`supabase-client.js\` to update task status
- **Monitor live:** Open \`dashboard-simple.html\` in browser (auto-refreshes every 10s)
- **Queue operations:** See \`supabase-client.js\` for CLI commands

---

*Auto-generated from Supabase tasks table. Source: \`generate-dashboard.js\`*
`

  // Write file
  const dashPath = path.join(__dirname, 'DASHBOARD.md')
  fs.writeFileSync(dashPath, md)

  console.log(`✅ Dashboard generated: ${dashPath}`)
  return summary
}

if (require.main === module) {
  generateDashboard()
    .then(summary => {
      console.log('\n📊 Summary:')
      console.log(`  Ready: ${summary.ready}`)
      console.log(`  In Progress: ${summary.in_progress}`)
      console.log(`  Blocked: ${summary.blocked}`)
      console.log(`  Done: ${summary.done}`)
    })
    .catch(err => {
      console.error('Error:', err.message)
      process.exit(1)
    })
}

module.exports = generateDashboard
