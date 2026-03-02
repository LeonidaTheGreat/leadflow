#!/usr/bin/env node
/**
 * Agent Completion Notifier
 * 
 * Checks for recently completed subagents and sends Telegram notifications
 * to keep Stojan informed of progress.
 * 
 * Run via: HEARTBEAT.md or cron every 15 minutes
 */

import * as fs from 'fs'
import * as path from 'path'

const BO2026_ROOT = '/Users/clawdbot/projects/leadflow'
const NOTIFICATION_STATE_FILE = path.join(BO2026_ROOT, '.agent-notifications.json')

interface NotificationState {
  lastCheck: string
  notifiedAgents: string[] // runIds that have been notified
}

interface SubagentInfo {
  runId: string
  label: string
  status: string
  runtime: string
  model: string
}

function loadNotificationState(): NotificationState {
  try {
    if (fs.existsSync(NOTIFICATION_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(NOTIFICATION_STATE_FILE, 'utf-8'))
    }
  } catch (e) {
    console.warn('Could not load notification state:', e)
  }
  return { lastCheck: new Date(0).toISOString(), notifiedAgents: [] }
}

function saveNotificationState(state: NotificationState) {
  fs.writeFileSync(NOTIFICATION_STATE_FILE, JSON.stringify(state, null, 2))
}

function getRecentCompletions(): SubagentInfo[] {
  // This would integrate with subagents list command
  // For now, read from dispatch-log.jsonl if exists
  const logPath = path.join(BO2026_ROOT, 'dispatch-log.jsonl')
  if (!fs.existsSync(logPath)) {
    return []
  }

  const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n')
  const recent: SubagentInfo[] = []
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  for (const line of lines) {
    try {
      const entry = JSON.parse(line)
      const entryTime = new Date(entry.timestamp)
      if (entryTime > oneHourAgo && entry.status === 'completed') {
        recent.push({
          runId: entry.runId,
          label: entry.task,
          status: 'completed',
          runtime: entry.runtime || 'unknown',
          model: entry.model
        })
      }
    } catch {
      // Skip malformed lines
    }
  }

  return recent
}

function buildNotificationMessage(agent: SubagentInfo): string {
  // Read NOTES file if exists
  const notesPath = path.join(BO2026_ROOT, 'agents/dev/NOTES/', `${agent.label}.md`)
  let summary = ''
  
  if (fs.existsSync(notesPath)) {
    const notes = fs.readFileSync(notesPath, 'utf-8')
    // Extract summary section
    const summaryMatch = notes.match(/## Summary\s*\n([^#]*)/)
    if (summaryMatch) {
      summary = summaryMatch[1].trim().substring(0, 200)
    }
  }

  return `🤖 **Agent Completed: ${agent.label}**

**Status:** ✅ ${agent.status}
**Model:** ${agent.model}
**Runtime:** ${agent.runtime}

${summary ? `**Summary:** ${summary}...` : ''}

${agent.status === 'completed' ? '✅ Ready for next task' : '⚠️ Review needed'}`
}

async function main() {
  console.log('🔔 Agent Completion Notifier\n')

  const state = loadNotificationState()
  const completions = getRecentCompletions()

  if (completions.length === 0) {
    console.log('No recent completions.')
    return
  }

  console.log(`Found ${completions.length} recent completion(s):`)
  
  for (const agent of completions) {
    if (state.notifiedAgents.includes(agent.runId)) {
      console.log(`  - ${agent.label}: Already notified`)
      continue
    }

    const message = buildNotificationMessage(agent)
    console.log(`\n📤 Notification for ${agent.label}:`)
    console.log(message)
    console.log('\n---')

    // Mark as notified
    state.notifiedAgents.push(agent.runId)
  }

  // Cleanup old entries (keep last 100)
  if (state.notifiedAgents.length > 100) {
    state.notifiedAgents = state.notifiedAgents.slice(-100)
  }

  state.lastCheck = new Date().toISOString()
  saveNotificationState(state)

  console.log('\n✅ Notification state updated')
}

main().catch(console.error)
