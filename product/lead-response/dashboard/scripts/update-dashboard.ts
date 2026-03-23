#!/usr/bin/env node
/**
 * Dashboard Auto-Updater
 *
 * Reads system-state.json and updates all status documents
 * to reflect actual progress. Prevents stale dashboards.
 *
 * Usage: node scripts/update-dashboard.ts
 * Run via: cron every 15 min or heartbeat
 */

import { config } from 'dotenv'
import { createClient } from '../lib/db'
import * as fs from 'fs'
import * as path from 'path'

config()

interface SystemState {
  timestamp: string
  results: Array<{
    component: string
    status: 'ok' | 'warning' | 'error'
    message: string
  }>
  summary: {
    ok: number
    warning: number
    error: number
  }
}

interface TaskStatus {
  task: string
  status: 'done' | 'in_progress' | 'blocked' | 'todo'
  lastUpdated: string
  evidence: string
}

async function loadSystemState(): Promise<SystemState | null> {
  try {
    const statePath = path.join(process.cwd(), 'system-state.json')
    if (!fs.existsSync(statePath)) {
      console.log('WARNING: No system-state.json found. Run validate-system.ts first.')
      return null
    }

    const content = fs.readFileSync(statePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Failed to load system state:', error)
    return null
  }
}

async function getDatabaseStats() {
  try {
    const dbUrl = process.env.NEXT_PUBLIC_API_URL
    const dbKey = process.env.API_SECRET_KEY

    if (!supabaseUrl || !dbKey) {
      return null
    }

    const supabase = createClient(dbUrl, dbKey)

    // Get counts
    const [{ count: leadCount }, { count: agentCount }, { count: messageCount }] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('real_estate_agents').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true })
    ])

    return {
      leads: leadCount || 0,
      agents: agentCount || 0,
      messages: messageCount || 0
    }
  } catch (error) {
    console.error('Failed to get DB stats:', error)
    return null
  }
}

function determineTaskStatuses(state: SystemState): TaskStatus[] {
  const statuses: TaskStatus[] = []
  const now = new Date().toISOString()

  // Map system state to task statuses
  state.results.forEach(result => {
    switch (result.component) {
      case 'FUB API':
        statuses.push({
          task: 'FUB API Integration',
          status: result.status === 'ok' ? 'done' : 'blocked',
          lastUpdated: state.timestamp,
          evidence: result.message
        })
        break

      case 'Twilio':
        statuses.push({
          task: 'Twilio SMS Integration',
          status: result.status === 'ok' ? 'done' : 'blocked',
          lastUpdated: state.timestamp,
          evidence: result.message
        })
        break

      case 'Supabase':
        statuses.push({
          task: 'Database Setup',
          status: result.status === 'ok' ? 'done' : 'blocked',
          lastUpdated: state.timestamp,
          evidence: result.message
        })
        break

      case 'Next.js Build':
        statuses.push({
          task: 'Dashboard Build',
          status: result.status === 'ok' ? 'done' : 'in_progress',
          lastUpdated: state.timestamp,
          evidence: result.message
        })
        break
    }
  })

  return statuses
}

function updateDashboardMd(statuses: TaskStatus[], stats: any) {
  const dashboardPath = path.join(process.cwd(), '..', '..', '..', 'DASHBOARD.md')

  if (!fs.existsSync(dashboardPath)) {
    console.log('WARNING: DASHBOARD.md not found at:', dashboardPath)
    return
  }

  let content = fs.readFileSync(dashboardPath, 'utf-8')

  // Update Last Updated
  content = content.replace(
    /\*\*Last Updated:\*\* .+?\n/,
    `**Last Updated:** ${new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' })} EST\n`
  )

  // Update Agent Activity section from task-tracker.json
  const trackerPath = path.join(process.cwd(), '..', '..', '..', 'task-tracker.json')
  if (fs.existsSync(trackerPath)) {
    try {
      const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf-8'))
      if (tracker.agents) {
        const agentRows = Object.entries(tracker.agents).map(([key, agent]: [string, any]) => {
          const statusIcon = agent.status === 'In Progress' ? '🟢' : agent.status === 'Blocked' ? '🔴' : '🟡'
          const completed = agent.deliverables?.filter((d: any) => d.status === 'done').length || 0
          const total = agent.deliverables?.length || 0
          const lastActivity = agent.lastActivity ? new Date(agent.lastActivity).toLocaleDateString() : 'Unknown'
          const taskText = agent.blocker ? `${agent.currentTask} (Blocked: ${agent.blocker})` : agent.currentTask
          return `| **${agent.name}** | ${agent.model} | ${statusIcon} ${agent.status} | ${agent.progress} | ${taskText} | ${completed}/${total} | ${lastActivity} |`
        }).join('\n')

        const activeAgents = Object.values(tracker.agents).filter((a: any) => a.status === 'In Progress').length
        const blockedAgents = Object.values(tracker.agents).filter((a: any) => a.status === 'Blocked').length
        const totalAgents = Object.keys(tracker.agents).length

        const newAgentSection = `<!-- AGENT_ACTIVITY_START -->
| Agent | Model | Status | Progress | Current Task | Tasks | Last Activity |
|-------|-------|--------|----------|--------------|-------|---------------|
${agentRows}

**System Status:** ${activeAgents > 0 ? '🟢' : '🔴'} ${activeAgents}/${totalAgents} Agents Active | 24/7 Uptime${blockedAgents > 0 ? ` | 🔴 ${blockedAgents} Blocked` : ''}
<!-- AGENT_ACTIVITY_END -->

        content = content.replace(
          /<!-- AGENT_ACTIVITY_START -->[\s\S]*?<!-- AGENT_ACTIVITY_END -->/,
          newAgentSection
        )
      }
    } catch (error) {
      console.error('Failed to update agent activity in DASHBOARD.md:', error)
    }
  }

  // Update Active Blockers section
  const blockerSection = statuses
    .filter(s => s.status === 'blocked')
    .map(s => '| **' + s.task + '** | ' + s.evidence + ' |')
    .join('\n')

  if (blockerSection) {
    // Find and replace blockers table
  const blockerRegex = /## Active Blockers[\s\S]*?(?=##|$)/
    const newBlockerSection = '## Active Blockers\n\n| Task | Issue |\n|------|-------|\n' + blockerSection + '\n\n'
    content = content.replace(blockerRegex, newBlockerSection)
  }

  // Add auto-update footer
  const autoUpdateFooter = '\n\n---\n\n**Auto-Updated:** ' + new Date().toISOString() + '\n**Source:** System validation + Database stats\n**Next Check:** ' + new Date(Date.now() + 15 * 60 * 1000).toISOString()

  // Remove old footer if exists
  content = content.replace(/\n\n---\n\n\*\*Auto-Updated:.*/s, '')
  content += autoUpdateFooter

  fs.writeFileSync(dashboardPath, content)
  console.log('Updated DASHBOARD.md')
}

function updateHtmlDashboard(statuses: TaskStatus[], stats: any) {
  // NOTE: dashboard.html is in ROOT of business-opportunities-2026 (NOT in dashboard/ folder)
  const htmlPath = path.join(process.cwd(), '..', '..', '..', 'dashboard.html')

  // Generate updated timestamp
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' })
  const isoNow = new Date().toISOString()

  // Count statuses
  const doneCount = statuses.filter(s => s.status === 'done').length
  const blockedCount = statuses.filter(s => s.status === 'blocked').length
  const inProgressCount = statuses.filter(s => s.status === 'in_progress').length

  // Read existing HTML
  let html = fs.readFileSync(htmlPath, 'utf-8')

  // Update timestamp
  html = html.replace(
    /<p style="margin-top: 10px;">Last Updated: .+?<\/p>/,
    '<p style="margin-top: 10px;">Last Updated: ' + now + ' EST</p>'
  )

  // Update metrics if stats available
  if (stats) {
    html = html.replace(
      /<span class="metric-value status-ok">\d+\+?<\/span>/,
      '<span class="metric-value status-ok">' + (stats.leads || 0) + '</span>'
    )
  }

  // Add auto-update comment in head
  const updateComment = '<!-- Auto-updated: ' + isoNow + ' | Done: ' + doneCount + ' | Blocked: ' + blockedCount + ' | In Progress: ' + inProgressCount + ' -->'
  if (!html.includes('Auto-updated:')) {
    html = html.replace('<head>', '<head>\n    ' + updateComment)
  } else {
    html = html.replace(/<!-- Auto-updated: .*? -->/, updateComment)
  }

  // Update agent activity section from task-tracker.json
  const trackerPath = path.join(process.cwd(), '..', '..', '..', 'task-tracker.json')
  if (fs.existsSync(trackerPath)) {
    try {
      const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf-8'))
      if (tracker.agents) {
        const agentCards = Object.entries(tracker.agents).map(([key, agent]: [string, any]) => {
          const statusColor = agent.status === 'In Progress' ? 'ok' : agent.blocker ? 'bad' : 'warn'
          const statusIcon = agent.status === 'In Progress' ? '●' : agent.blocker ? '✕' : '○'
          const completed = agent.deliverables?.filter((d: any) => d.status === 'done').length || 0
          const total = agent.deliverables?.length || 0
          const lastActivity = agent.lastActivity ? new Date(agent.lastActivity).toLocaleDateString() : 'Unknown'
          const blockerHtml = agent.blocker ? '<br><span class="bad">Blocked: ' + agent.blocker + '</span>' : ''

          return '\n    <div class="card">\n      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">\n        <div>\n          <span class="' + statusColor + '">' + statusIcon + '</span> <strong>' + agent.name + '</strong>\n          <span class="pill" style="margin-left:8px;">' + agent.model + '</span>\n        </div>\n        <span class="' + statusColor + '">' + agent.progress + '</span>\n      </div>\n      <div class="muted">' + agent.currentTask + '</div>\n      <div style="margin-top:8px;font-size:11px;">\n        <span class="' + statusColor + '">' + completed + '/' + total + ' tasks</span> • \n        <span class="muted">Last: ' + lastActivity + '</span>' + blockerHtml + '\n      </div>\n    </div>'
        }).join('')

        const activeAgents = Object.values(tracker.agents).filter((a: any) => a.status === 'In Progress').length
        const totalAgents = Object.keys(tracker.agents).length

        const systemCard = '\n    <div class="card" style="background:var(--bg-card-ok);border-color:var(--border-ok);">\n      <div style="text-align:center;padding:10px;">\n        <div class="ok" style="font-size:24px;margin-bottom:8px;">Goal</div>\n        <div><strong>System Status</strong></div>\n        <div class="muted" style="margin-top:4px;">' + activeAgents + '/' + totalAgents + ' Agents Active</div>\n        <div class="ok" style="margin-top:4px;">24/7 Uptime</div>\n      </div>\n    </div>'

        // Replace agent activity section
        const agentSectionRegex = /<div class="grid" id="agent-activity">[\s\S]*?<\/div>\s*<\/div>\s*(?=<!-- THIS WEEK)/
        const newAgentSection = '<div class="grid" id="agent-activity">' + agentCards + systemCard + '\n  </div>'

        html = html.replace(agentSectionRegex, newAgentSection)
      }
    } catch (error) {
      console.error('Failed to update agent activity:', error)
    }
  }

  fs.writeFileSync(htmlPath, html)
  console.log('Updated dashboard.html')
}

function updateTaskTracker(statuses: TaskStatus[], stats: any) {
  const trackerPath = path.join(process.cwd(), '..', '..', '..', 'task-tracker.json')

  if (!fs.existsSync(trackerPath)) {
    console.log('WARNING: task-tracker.json not found')
    return
  }

  try {
    const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf-8'))

    // Update timestamp
    tracker.lastUpdated = new Date().toISOString()

    // Update blockers based on statuses
    const blockedStatuses = statuses.filter(s => s.status === 'blocked')

    if (blockedStatuses.length === 0) {
      tracker.blockers = []
      tracker.agents.dev.blocker = null
      tracker.agents.dev.status = 'In Progress'
    } else {
      tracker.blockers = blockedStatuses.map(s => ({
        agent: 'dev',
        task: s.task,
        blocker: s.evidence,
        owner: 'System',
        impact: 'Blocking development',
        unblocks: [s.task]
      }))
      tracker.agents.dev.blocker = blockedStatuses[0].evidence
    }

    // Update progress based on done statuses
    const doneCount = statuses.filter(s => s.status === 'done').length
        tracker.agents.dev.progress = Math.round((doneCount / statuses.length) * 100) + '%'

    fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2))
    console.log('Updated task-tracker.json')
  } catch (error) {
    console.error('Failed to update task tracker:', error)
  }
}

async function generateReport(): Promise<string> {
  const state = await loadSystemState()
  if (!state) return 'No system state available'

  const stats = await getDatabaseStats()
  const statuses = determineTaskStatuses(state)

  let lines: string[] = [
    'BO2026 System Status Report',
    '============================',
    '',
    'Generated: ' + new Date().toLocaleString(),
    'System Health: ' + state.summary.ok + '/' + (state.summary.ok + state.summary.warning + state.summary.error) + ' OK',
    '',
    'Database Stats:'
  ]

  if (stats) {
    lines.push('  - Leads: ' + stats.leads)
    lines.push('  - Agents: ' + stats.agents)
    lines.push('  - Messages: ' + stats.messages)
  } else {
    lines.push('  - DB: Unavailable')
  }

  lines.push('')
  lines.push('Completed:')
  statuses.filter(s => s.status === 'done').forEach(s => lines.push('  [OK] ' + s.task))

  const blocked = statuses.filter(s => s.status === 'blocked')
  if (blocked.length > 0) {
    lines.push('')
    lines.push('Blocked:')
    blocked.forEach(s => lines.push('  [BLOCKED] ' + s.task + ': ' + s.evidence))
  }

  const inProgress = statuses.filter(s => s.status === 'in_progress')
  if (inProgress.length > 0) {
    lines.push('')
    lines.push('In Progress:')
    inProgress.forEach(s => lines.push('  [WIP] ' + s.task))
  }

  lines.push('')
  lines.push('---')
  lines.push('Auto-generated by update-dashboard.ts')

  return lines.join('\n')
}

// Main execution
async function main() {
  console.log('Dashboard Auto-Updater\n')

  const state = await loadSystemState()
  if (!state) {
    process.exit(1)
  }

  console.log('System State: ' + state.summary.ok + ' OK, ' + state.summary.warning + ' Warnings, ' + state.summary.error + ' Errors\n')

  const stats = await getDatabaseStats()
  const statuses = determineTaskStatuses(state)

  // Update all status documents
  updateDashboardMd(statuses, stats)
  updateHtmlDashboard(statuses, stats)
  updateTaskTracker(statuses, stats)

  // Generate and save report
  const report = await generateReport()
  const reportPath = path.join(process.cwd(), '..', '..', '..', 'STATUS_REPORT_AUTO.md')
  fs.writeFileSync(reportPath, report)
  console.log('Generated STATUS_REPORT_AUTO.md')

  console.log('\nDashboard sync complete!')

  // Log to console for heartbeat visibility
  console.log('\n--- STATUS SUMMARY ---')
  statuses.forEach(s => {
    const icon = s.status === 'done' ? '[OK]' : s.status === 'blocked' ? '[BLOCKED]' : '[WIP]'
    console.log(icon + ' ' + s.task + ': ' + s.status)
  })
}

main().catch(console.error)
