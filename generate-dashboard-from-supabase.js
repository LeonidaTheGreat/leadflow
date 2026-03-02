#!/usr/bin/env node
/**
 * Generate DASHBOARD.md from Supabase (All sections)
 * 
 * This queries all new tables:
 * - project_metadata
 * - system_components
 * - agents
 * - completed_work
 * - action_items
 * - cost_tracking
 * - tasks (existing queue)
 * 
 * And generates DASHBOARD.md with everything in sync.
 */

const ProjectQuery = require('./query-project')
const fs = require('fs')
const path = require('path')
const { getConfig, getDayNumber } = require('./project-config-loader')

async function generateDashboard() {
  const config = getConfig()
  const query = new ProjectQuery()
  const project = await query.getFullProject()

  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/Toronto'
  })

  const dayNum = getDayNumber(config)

  // Build markdown
  let md = `---
title: BO2026 Dashboard - Updated ${new Date().toISOString().split('T')[0]}
author: LeadFlow Orchestrator
date: ${new Date().toISOString().split('T')[0]}
autoRefresh: supabase_source_of_truth
---

# 🤖 BO2026 Command Dashboard

**Project:** ${project.metadata.project_name}  
**Goal:** ${project.metadata.goal}  
**Current Day:** Day ${dayNum} of ${project.metadata.deadline_days}  
**Status:** ${project.metadata.status_color} **${project.metadata.overall_status}**  
**Last Updated:** ${timestamp}

---

## 📊 Live System Status

| Component | Status | Details |
|-----------|--------|---------|
`

  // System components by category
  if (project.components && Object.keys(project.components).length > 0) {
    Object.entries(project.components).forEach(([category, components]) => {
      components.forEach(comp => {
        md += `| **${comp.component_name}** | ${comp.status_emoji} ${comp.status} | ${comp.details || '—'} |\n`
      })
    })
  }

  md += `
---

## 🚀 Task Queue (Supabase)

**Queue Health:** Ready: ${project.task_queue.ready.length} | In Progress: ${project.task_queue.in_progress.length} | Blocked: ${project.task_queue.blocked.length} | Done: ${project.task_queue.done.length}

### ▶️ Ready to Spawn (${project.task_queue.ready.length} tasks)

`

  if (project.task_queue.ready.length > 0) {
    md += '| Task | Model | Cost | Priority |\n'
    md += '|------|-------|------|----------|\n'
    project.task_queue.ready.forEach(t => {
      const pri = t.priority === 1 ? '🔴 P0' : t.priority === 2 ? '🟡 P1' : '🟢 P2'
      md += `| ${t.title} | ${t.model} | $${(t.estimated_cost_usd || 0).toFixed(2)} | ${pri} |\n`
    })
  } else {
    md += '*No ready tasks*\n'
  }

  md += `
### ⚡ In Progress (${project.task_queue.in_progress.length} tasks)

`

  if (project.task_queue.in_progress.length > 0) {
    md += '| Task | Agent | Model |\n'
    md += '|------|-------|-------|\n'
    project.task_queue.in_progress.slice(0, 10).forEach(t => {
      const agent = t.agent_id || '—'
      md += `| ${t.title} | ${agent} | ${t.model} |\n`
    })
    if (project.task_queue.in_progress.length > 10) {
      md += `| ... and ${project.task_queue.in_progress.length - 10} more | | |\n`
    }
  } else {
    md += '*No active tasks*\n'
  }

  md += `
### ⏸️ Blocked (${project.task_queue.blocked.length} tasks)

`

  if (project.task_queue.blocked.length > 0) {
    md += '| Task | Priority |\n'
    md += '|------|----------|\n'
    project.task_queue.blocked.forEach(t => {
      const pri = t.priority === 1 ? '🔴 P0' : t.priority === 2 ? '🟡 P1' : '🟢 P2'
      md += `| ${t.title} | ${pri} |\n`
    })
  } else {
    md += '*No blocked tasks*\n'
  }

  md += `
---

## 🤖 Agent Activity

| Agent | Status | Progress | Current Task | Blocker |
|-------|--------|----------|--------------|---------|
`

  project.agents.forEach(agent => {
    const blocker = agent.blocker || 'None'
    md += `| **${agent.agent_name}** | ${agent.status_emoji} ${agent.status} | ${agent.progress_percent}% | ${agent.current_task || '—'} | ${blocker} |\n`
  })

  md += `
---

## 📋 Completed Work

### ✅ Pre-Pilot Feature Set

| Work | UC | Description | Hours | Status |
|------|-----|-------------|-------|--------|
`

  project.completed_work.forEach(work => {
    const uc = work.use_case || '—'
    md += `| **${work.work_name}** | ${uc} | ${work.description} | ${work.hours_spent} | ${work.status} |\n`
  })

  const totalHours = project.completed_work.reduce((sum, w) => sum + (w.hours_spent || 0), 0)
  md += `
**Total Hours:** ${totalHours}h | **Status:** Ready for pilot

---

## ⚠️ Blockers & Action Items

### Outstanding Items

`

  if (project.action_items.all && project.action_items.all.length > 0) {
    project.action_items.all.forEach(item => {
      const pri = item.priority === 1 ? '🔴 CRITICAL' : item.priority === 2 ? '🟡 HIGH' : '🟢 NORMAL'
      md += `**${item.title}** ${pri}\n`
      md += `- Type: ${item.type}\n`
      md += `- Status: ${item.status}\n`
      md += `- Awaiting: ${item.awaiting_input}\n`
      md += `- Impact: ${item.impact}\n`
      md += `- Action: ${item.action_needed}\n\n`
    })
  } else {
    md += '*No action items*\n\n'
  }

  md += `
---

## 💰 Cost Summary

`

  if (project.cost_tracking && project.cost_tracking.length > 0) {
    const cost = project.cost_tracking[0]
    md += `**Estimated Cost:** $${(cost.estimated_cost_usd || 0).toFixed(2)}\n`
    md += `**Budget Limit:** $${(cost.budget_limit_usd || 0).toFixed(2)}\n`
    md += `**Spend:** ${(cost.spend_percent || 0).toFixed(1)}%\n`
    
    if (cost.breakdown) {
      md += `\n**Breakdown:**\n`
      Object.entries(cost.breakdown).forEach(([model, amount]) => {
        md += `- ${model}: $${amount.toFixed(2)}\n`
      })
    }
  }

  md += `
---

## 🎯 Next Actions

1. ${project.task_queue.ready.length > 0 ? `✅ **${project.task_queue.ready.length} tasks ready to spawn**` : '🔴 No ready tasks'}
2. ${project.task_queue.in_progress.length > 0 ? `⚡ **${project.task_queue.in_progress.length} agents active**` : '🔴 No active agents'}
3. ${project.task_queue.blocked.length > 0 ? `⏸️ **${project.task_queue.blocked.length} tasks blocked** — check dependencies` : '✅ No blockers'}

---

## 📖 Data Source

**Single Source of Truth:** Supabase

All sections (system status, agents, tasks, completed work, action items, costs) are queried live from Supabase tables:
- \`project_metadata\` — Project info
- \`system_components\` — System status
- \`agents\` — Agent activity
- \`completed_work\` — Completed features
- \`action_items\` — Blockers & decisions
- \`cost_tracking\` — Budget tracking
- \`tasks\` — Task queue

This dashboard regenerates automatically whenever data changes. No manual updates needed.

---

*Auto-generated from Supabase. Source: \`generate-dashboard-from-supabase.js\`*
*Generated: ${timestamp}*
`

  // Write file
  const dashPath = path.join(__dirname, 'DASHBOARD.md')
  fs.writeFileSync(dashPath, md)

  console.log(`✅ Dashboard generated: ${dashPath}`)
  return true
}

if (require.main === module) {
  generateDashboard()
    .then(() => console.log('\n📊 DASHBOARD.md is now fully sourced from Supabase ✅'))
    .catch(err => {
      console.error('Error:', err.message)
      process.exit(1)
    })
}

module.exports = generateDashboard
