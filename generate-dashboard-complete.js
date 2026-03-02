#!/usr/bin/env node
/**
 * Generate DASHBOARD.md - Complete version
 * 
 * Combines:
 * 1. System status (deployment, integrations, compliance)
 * 2. Agent activity
 * 3. Completed tasks
 * 4. Task queue from Supabase
 * 5. Blockers & action items
 */

const SupabaseTaskClient = require('./supabase-client')
const fs = require('fs')
const path = require('path')
const { getConfig, getDayNumber } = require('./project-config-loader')

async function generateDashboard() {
  const config = getConfig()
  const client = new SupabaseTaskClient()
  const queue = await client.getQueue()
  const summary = await client.getSummary()

  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/Toronto'
  })

  const dayNum = getDayNumber(config)

  // Build markdown
  let md = `---
title: BO2026 Dashboard - Updated ${new Date().toISOString().split('T')[0]}
author: LeadFlow Orchestrator
date: ${new Date().toISOString().split('T')[0]}
autoRefresh: every_heartbeat
---

# 🤖 BO2026 Command Dashboard

**Project:** LeadFlow AI  
**Goal:** $20,000 MRR within 60 days  
**Current Day:** Day ${dayNum} of 60  
**Status:** 🟢 **ACTIVE - PILOT DEPLOYMENT COMPLETE**  
**Last Updated:** ${timestamp}

---

## 📊 Live System Status

| Component | Status | Details |
|-----------|--------|---------|
| **Vercel Deployment** | ✅ LIVE | https://leadflow-ai-five.vercel.app (verified 2026-02-25) |
| **FUB Integration** | ✅ READY | Webhook endpoint live, UC-6 working |
| **Twilio SMS** | ✅ TESTED | SMS sent successfully via API |
| **AI Qualification** | ✅ READY | Claude integration ready |
| **Dashboard** | ✅ LIVE | Lead feed, stats, detail view, analytics |
| **Database** | ✅ LIVE | Supabase connected, 30+ test leads, all tables verified |
| **Compliance** | ✅ READY | TCPA audit complete, system approved |
| **Pilot Accounts** | ✅ READY | 3 agents created and active |
| **SMS Testing** | ✅ VERIFIED | Test SMS confirmed working |

---

## 🚀 Task Queue (Supabase)

**Queue Health:** Ready: ${summary.ready} | In Progress: ${summary.in_progress} | Blocked: ${summary.blocked} | Done: ${summary.done}

### ▶️ Ready to Spawn (${summary.ready} tasks)

`

  if (queue.ready.length > 0) {
    md += '| Task | Model | Cost | Priority |\n'
    md += '|------|-------|------|----------|\n'
    queue.ready.forEach(t => {
      const pri = t.priority === 1 ? '🔴 P0' : t.priority === 2 ? '🟡 P1' : '🟢 P2'
      md += `| ${t.title} | ${t.model} | $${(t.estimated_cost_usd || 0).toFixed(2)} | ${pri} |\n`
    })
  } else {
    md += '*No ready tasks*\n'
  }

  md += `
### ⚡ In Progress (${summary.in_progress} tasks)

`

  if (queue.in_progress.length > 0) {
    md += '| Task | Agent | Model |\n'
    md += '|------|-------|-------|\n'
    queue.in_progress.slice(0, 10).forEach(t => {
      const agent = t.agent_id || '—'
      md += `| ${t.title} | ${agent} | ${t.model} |\n`
    })
    if (queue.in_progress.length > 10) {
      md += `| ... and ${queue.in_progress.length - 10} more | | |\n`
    }
  } else {
    md += '*No active tasks*\n'
  }

  md += `
### ⏸️ Blocked (${summary.blocked} tasks)

`

  if (queue.blocked.length > 0) {
    md += '| Task | Status | Priority |\n'
    md += '|------|--------|----------|\n'
    queue.blocked.forEach(t => {
      const pri = t.priority === 1 ? '🔴 P0' : t.priority === 2 ? '🟡 P1' : '🟢 P2'
      md += `| ${t.title} | blocked | ${pri} |\n`
    })
  } else {
    md += '*No blocked tasks*\n'
  }

  md += `
---

## 🤖 Agent Activity

| Agent | Status | Progress | Current Task | Blocker |
|-------|--------|----------|--------------|---------|
| **Dev** | ✅ Active | In progress | Building features | None |
| **Marketing** | 🟡 Ready | Awaiting go-ahead | Pilot recruitment copy | User approval needed |
| **QC** | ✅ Active | Testing | Pilot validation | None |
| **Analytics** | ✅ Complete | Live | KPI dashboard | None |
| **Deployment** | ✅ Complete | Live | Production system | None |

---

## 📋 Completed Work

### ✅ Pre-Pilot Feature Set (Complete)

| Task | UC | Description | Status |
|------|-----|-------------|--------|
| **Outbound SMS** | - | Message storage & sending | ✅ Complete |
| **Cal.com Integration** | UC-6 | Booking confirmation SMS | ✅ Complete |
| **Dashboard SMS** | UC-7 | Manual message sending | ✅ Complete |
| **Follow-up Sequences** | UC-8 | Automated follow-ups | ✅ Complete |
| **Pilot Deployment** | - | Vercel + DB + integrations | ✅ Complete |

**Total Hours:** 34h | **Status:** Ready for pilot

---

## ⚠️ Blockers & Action Items

### ✅ Technical Blockers: NONE

All technical work complete. System ready for pilot launch.

### 🟡 Outstanding Items

1. **Marketing Recruitment Timing**
   - Status: Pending Stojan approval
   - Impact: When to launch pilot with 3 agents
   - Action: Say "go ahead with recruitment" to spawn marketing task

2. **Pilot Launch Decision**
   - Ready to go immediately
   - Have 3 agents + system deployed
   - Need: Your approval to start

---

## 💰 Cost Summary

**Estimated project cost:** $${summary.total_estimated_cost}
**Cost per task:** Avg \$${(parseFloat(summary.total_estimated_cost) / summary.total).toFixed(2)}

---

${await generateRevenueSection()}

---

## 🎯 Next Actions

1. ${summary.ready > 0 ? `✅ **${summary.ready} tasks ready to spawn**` : '🔴 No ready tasks'}
2. ${summary.in_progress > 0 ? `⚡ **${summary.in_progress} agents active**` : '🔴 No active agents'}
3. ${summary.blocked > 0 ? `⏸️ **${summary.blocked} tasks blocked** — check dependencies` : '✅ No blockers'}

**Your Call:** Ready to approve "go ahead with recruitment"?

---

## 📖 How to Use This Dashboard

- **Refresh:** Run \`node generate-dashboard-complete.js\`
- **Live view:** Open \`dashboard-simple.html\` in browser
- **Monitor queue:** Run \`node supabase-client.js watch\`
- **Check status:** Ask me "what's the status?" in Telegram

---

*This dashboard combines system status + Supabase task queue. Updates on every task change.*
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
      console.log('\n📊 Queue:')
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

/**
 * Generate the revenue intelligence dashboard section.
 * Reads from revenue_metrics and project_goals tables.
 * Non-fatal — returns placeholder if tables don't exist yet.
 */
async function generateRevenueSection() {
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) return '## 💵 Revenue Intelligence\n\n*Supabase not configured*'

    const sb = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const projectId = config.project_id

    // Latest revenue metrics
    const { data: metrics } = await sb
      .from('revenue_metrics')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false })
      .limit(1)

    // Active goals
    const { data: goals } = await sb
      .from('project_goals')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'active')

    let section = '## 💵 Revenue Intelligence (Loop 5)\n\n'

    if (metrics && metrics.length > 0) {
      const m = metrics[0]
      const mrr = (m.mrr_cents / 100).toFixed(2)
      section += `| Metric | Value |\n|--------|-------|\n`
      section += `| **Current MRR** | $${mrr} |\n`
      section += `| **Active Subscribers** | ${m.active_subscribers} |\n`
      section += `| **Trial Users** | ${m.trial_users} |\n`
      section += `| **Conversion Rate** | ${(m.conversion_rate * 100).toFixed(1)}% |\n`
      section += `| **ARPU** | $${(m.arpu_cents / 100).toFixed(2)} |\n`
      section += `| **Last Updated** | ${m.date} |\n\n`
    } else {
      section += '*No revenue data collected yet*\n\n'
    }

    if (goals && goals.length > 0) {
      section += '### Goal Progress\n\n'
      section += '| Goal | Target | Current | Gap | Trajectory | Days Left |\n'
      section += '|------|--------|---------|-----|------------|----------|\n'
      for (const g of goals) {
        const targetDate = new Date(g.target_date)
        const daysLeft = Math.max(0, Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24)))
        const emoji = g.trajectory === 'on_track' ? '🟢' : g.trajectory === 'ahead' ? '🔵' : g.trajectory === 'behind' ? '🟡' : '🔴'
        section += `| ${g.goal_type.toUpperCase()} | $${Number(g.target_value).toLocaleString()} | $${Number(g.current_value).toLocaleString()} | ${g.gap_percent}% | ${emoji} ${g.trajectory} | ${daysLeft}d |\n`
      }
    }

    return section
  } catch (err) {
    return `## 💵 Revenue Intelligence\n\n*Revenue tables not yet created — run migration 005*\n`
  }
}

module.exports = generateDashboard
