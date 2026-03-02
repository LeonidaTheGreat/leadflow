#!/usr/bin/env node
/**
 * TG-Discord Bridge
 * 
 * Unified session bridge that forwards Discord orchestrator updates
 * to Telegram Business Opportunities topic.
 * 
 * Runs via heartbeat every 5 minutes
 */

import * as fs from 'fs'
import * as path from 'path'

const BO2026_ROOT = '/Users/clawdbot/projects/leadflow'
const BRIDGE_STATE_FILE = path.join(BO2026_ROOT, '.bridge-state.json')
const NOTIFICATION_CONFIG = path.join(BO2026_ROOT, '.notifications.json')

// Default fallback (Business Opportunities topic)
const DEFAULT_TELEGRAM_TARGET = 'telegram:-1003852328909:topic:10171'

interface NotificationConfig {
  projectName: string
  discord: {
    enabled: boolean
    channelId?: string
    useThreads: boolean
  }
  telegram: {
    enabled: boolean
    target: string
    bidirectional: boolean
  }
  primaryInterface: 'discord' | 'telegram'
}

function loadNotificationConfig(): NotificationConfig | null {
  try {
    if (fs.existsSync(NOTIFICATION_CONFIG)) {
      return JSON.parse(fs.readFileSync(NOTIFICATION_CONFIG, 'utf-8'))
    }
  } catch (e) {
    console.warn('Could not load notification config:', e)
  }
  return null
}

function getTelegramTarget(): string {
  const config = loadNotificationConfig()
  if (config?.telegram?.enabled && config.telegram.target) {
    return config.telegram.target
  }
  console.warn('No notification config found, using default target')
  return DEFAULT_TELEGRAM_TARGET
}

interface BridgeState {
  lastDiscordMessageId: string | null
  lastCheck: string
  messageCount: number
}

function loadState(): BridgeState {
  try {
    if (fs.existsSync(BRIDGE_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(BRIDGE_STATE_FILE, 'utf-8'))
    }
  } catch (e) {
    console.warn('Could not load bridge state:', e)
  }
  return { lastDiscordMessageId: null, lastCheck: new Date(0).toISOString(), messageCount: 0 }
}

function saveState(state: BridgeState) {
  fs.writeFileSync(BRIDGE_STATE_FILE, JSON.stringify(state, null, 2))
}

function getRecentDiscordActivity(): string | null {
  // Check orchestrator NOTES for recent activity
  const notesDir = path.join(BO2026_ROOT, 'agents/orchestrator/NOTES')
  if (!fs.existsSync(notesDir)) return null

  const files = fs.readdirSync(notesDir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      name: f,
      path: path.join(notesDir, f),
      mtime: fs.statSync(path.join(notesDir, f)).mtime
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

  if (files.length === 0) return null

  const latest = files[0]
  const content = fs.readFileSync(latest.path, 'utf-8')
  
  // Extract summary section
  const summaryMatch = content.match(/## Summary\s*\n([^#]*)/)
  if (summaryMatch) {
    return `🤖 **Orchestrator Update**

${summaryMatch[1].trim().substring(0, 300)}...

📁 ${latest.name}
🕐 ${latest.mtime.toISOString()}`
  }

  return null
}

function getTaskStatusChanges(): string | null {
  // Read task-tracker.json and detect changes
  const trackerPath = path.join(BO2026_ROOT, 'task-tracker.json')
  if (!fs.existsSync(trackerPath)) return null

  try {
    const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf-8'))
    
    // Check for newly unblocked agents
    const unblocked: string[] = []
    for (const [key, agent] of Object.entries<any>(tracker.agents || {})) {
      if (agent.status === 'ready' && !agent.blocker) {
        unblocked.push(agent.name)
      }
    }

    if (unblocked.length > 0) {
      return `🚀 **Agents Ready for Work**

${unblocked.map(a => `• ${a}`).join('\n')}

Orchestrator will spawn shortly...`
    }
  } catch (e) {
    console.warn('Error reading task tracker:', e)
  }

  return null
}

async function main() {
  console.log('🔔 TG-Discord Bridge\n')

  const state = loadState()
  const messages: string[] = []

  // Check for Discord/orchestrator activity
  const discordActivity = getRecentDiscordActivity()
  if (discordActivity) {
    messages.push(discordActivity)
  }

  // Check for task status changes
  const taskChanges = getTaskStatusChanges()
  if (taskChanges) {
    messages.push(taskChanges)
  }

  if (messages.length === 0) {
    console.log('No new activity to bridge.')
    return
  }

  // Format final message
  const finalMessage = messages.join('\n\n---\n\n')
  
  const telegramTarget = getTelegramTarget()
  
  console.log('📤 Message to send:')
  console.log(finalMessage)
  console.log('\n---')
  console.log(`Target: ${telegramTarget}`)

  // Update state
  state.lastCheck = new Date().toISOString()
  state.messageCount += messages.length
  saveState(state)

  console.log('\n✅ Bridge state updated')
  console.log(`Total messages bridged: ${state.messageCount}`)
}

main().catch(console.error)
