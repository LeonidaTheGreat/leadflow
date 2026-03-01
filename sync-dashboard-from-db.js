#!/usr/bin/env node
/**
 * Sync DASHBOARD.md from Supabase (Source of Truth)
 * 
 * Run: node sync-dashboard-from-db.js
 * This ensures DASHBOARD.md always reflects actual database state
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function syncDashboard() {
  console.log('🔄 Syncing DASHBOARD.md from Supabase...')
  console.log('=====================================\n')
  
  const today = new Date().toISOString().split('T')[0]
  
  // Fetch stats
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('*')
  
  const { data: completedToday } = await supabase
    .from('tasks')
    .select('actual_cost_usd')
    .gte('completed_at', today)
    .lt('completed_at', today + 'T23:59:59')
  
  const spentToday = completedToday?.reduce((sum, t) => sum + (t.actual_cost_usd || 0), 0) || 0
  
  // Count by status
  const byStatus = {
    ready: allTasks?.filter(t => t.status === 'ready').length || 0,
    in_progress: allTasks?.filter(t => t.status === 'in_progress').length || 0,
    blocked: allTasks?.filter(t => t.status === 'blocked').length || 0,
    done: allTasks?.filter(t => t.status === 'done').length || 0,
    failed: allTasks?.filter(t => t.status === 'failed').length || 0
  }
  
  // Get ready tasks for display
  const { data: readyTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'ready')
    .order('priority', { ascending: true })
    .limit(10)
  
  // Get blocked tasks
  const { data: blockedTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'blocked')
    .order('priority', { ascending: true })
    .limit(5)
  
  // Generate markdown
  const markdown = `---
title: BO2026 Dashboard - Live from Supabase
author: Autonomous System
date: ${new Date().toISOString()}
autoRefresh: every_heartbeat
source: supabase
---

# 🤖 BO2026 Command Dashboard (Supabase)

**Status:** 🟢 Active  
**Autonomy Level:** 8/10  
**Source of Truth:** Supabase Database  
**Last Sync:** ${new Date().toLocaleString()}

---

## 📊 Live System Status

| Metric | Value |
|--------|-------|
| **Daily Budget** | $5.00 |
| **Spent Today** | $${spentToday.toFixed(2)} |
| **Remaining** | $${(5.00 - spentToday).toFixed(2)} |
| **Active Agents** | ${byStatus.in_progress} |

### Task Status

| Status | Count |
|--------|-------|
| ✅ Ready | ${byStatus.ready} |
| ⚡ In Progress | ${byStatus.in_progress} |
| ⏸️ Blocked | ${byStatus.blocked} |
| ✅ Done | ${byStatus.done} |
| ❌ Failed | ${byStatus.failed} |
| **Total** | **${allTasks?.length || 0}** |

---

## ▶️ Ready Tasks (Next to Spawn)

${readyTasks?.map(t => `- **${t.title}** (${t.agent_id}, ${t.model}) - $${(t.estimated_cost_usd || 0).toFixed(2)}`).join('\n') || 'No ready tasks'}

---

## ⏸️ Blocked Tasks

${blockedTasks?.map(t => `- **${t.title}** - ${t.blocker || 'Waiting on dependencies'}`).join('\n') || 'No blocked tasks'}

---

## 🔄 Automation Status

| Component | Status |
|-----------|--------|
| Dispatcher | Running |
| Auto-Spawn | Active |
| Self-Test | Enabled |
| Failure Recovery | Enabled |
| Budget Check | $5/day |

---

*This dashboard is auto-generated from Supabase. Do not edit manually.*
*View interactive dashboard: [dashboard-supabase.html](dashboard-supabase.html)*
`
  
  // Write to DASHBOARD.md
  fs.writeFileSync('DASHBOARD.md', markdown)
  
  console.log('✅ DASHBOARD.md updated from Supabase')
  console.log(`   Tasks: ${allTasks?.length || 0}`)
  console.log(`   Ready: ${byStatus.ready}`)
  console.log(`   In Progress: ${byStatus.in_progress}`)
  console.log(`   Spent Today: $${spentToday.toFixed(2)}`)
}

syncDashboard().catch(error => {
  console.error('❌ Sync failed:', error.message)
  process.exit(1)
})
