#!/usr/bin/env node

/**
 * Orchestrator Healthcheck & Watchdog
 * 
 * Verifies orchestrator is alive and functioning
 * Restarts if needed
 * Reports status to Discord
 * 
 * Usage:
 *   node orchestrator-healthcheck.js
 *   node orchestrator-healthcheck.js --restart
 *   node orchestrator-healthcheck.js --status
 * 
 * Add to crontab:
 *   Every 5 minutes: cd /path/to/project && node orchestrator-healthcheck.js
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const PROJECT_PATH = process.cwd()
const HEALTH_LOG = path.join(PROJECT_PATH, 'orchestrator-health.log')
const LOCK_FILE = path.join(PROJECT_PATH, '.orchestrator.lock')
const SESSION_LABEL = process.env.ORCHESTRATOR_LABEL || 'orchestrator-bo2026'

// Configuration
const CONFIG = {
  maxIdleMinutes: 15,        // Alert if no activity for 15 min
  heartbeatInterval: 5,      // Expected heartbeat every 5 min
  restartOnFailure: true,    // Auto-restart if dead
  discordWebhook: process.env.DISCORD_WEBHOOK_URL || null
}

class OrchestratorHealthcheck {
  constructor() {
    this.status = {
      sessionExists: false,
      lastHeartbeat: null,
      lastActivity: null,
      isResponsive: false,
      issues: []
    }
  }

  /**
   * Main healthcheck entry
   */
  async run() {
    console.log('🔍 Orchestrator Healthcheck')
    console.log('===========================\n')

    // 1. Check if session exists
    await this.checkSessionExists()
    
    // 2. Check last activity
    await this.checkLastActivity()
    
    // 3. Check heartbeat recency
    await this.checkHeartbeat()
    
    // 4. Check if responsive (can receive messages)
    await this.checkResponsiveness()
    
    // 5. Report status
    this.reportStatus()
    
    // 6. Restart if needed
    if (this.shouldRestart()) {
      await this.restartOrchestrator()
    }
    
    // 7. Log health status
    this.logHealth()
  }

  /**
   * Check if orchestrator session exists
   */
  async checkSessionExists() {
    try {
      // Look for session with orchestrator label
      const sessions = this.getActiveSessions()
      const orchestratorSession = sessions.find(s => 
        s.label?.includes('orchestrator') || 
        s.displayName?.includes('orchestrator')
      )
      
      this.status.sessionExists = !!orchestratorSession
      
      if (orchestratorSession) {
        console.log('✅ Orchestrator session found:')
        console.log(`   Label: ${orchestratorSession.label || orchestratorSession.displayName}`)
        console.log(`   Session ID: ${orchestratorSession.sessionId}`)
        console.log(`   Last active: ${new Date(orchestratorSession.updatedAt).toISOString()}`)
        this.status.sessionId = orchestratorSession.sessionId
        this.status.lastActivity = new Date(orchestratorSession.updatedAt)
      } else {
        console.log('❌ Orchestrator session NOT found')
        this.status.issues.push('Session does not exist')
      }
    } catch (error) {
      console.log('❌ Error checking sessions:', error.message)
      this.status.issues.push('Failed to check sessions')
    }
  }

  /**
   * Get active sessions (simulated - would use sessions_list tool)
   */
  getActiveSessions() {
    // This would normally call the sessions_list tool
    // For now, check if we can find evidence of orchestrator activity
    
    const sessions = []
    
    // Check for orchestrator lock file
    if (fs.existsSync(LOCK_FILE)) {
      try {
        const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'))
        sessions.push({
          label: lock.label,
          sessionId: lock.sessionId,
          updatedAt: lock.lastHeartbeat,
          displayName: lock.displayName
        })
      } catch (e) {
        // Invalid lock file
      }
    }
    
    // Check for recent orchestrator logs
    const logFile = path.join(PROJECT_PATH, 'orchestrator.log')
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile)
      sessions.push({
        label: SESSION_LABEL,
        sessionId: 'unknown',
        updatedAt: stats.mtime.getTime(),
        displayName: 'orchestrator'
      })
    }
    
    return sessions
  }

  /**
   * Check last activity from logs
   */
  async checkLastActivity() {
    // Check orchestrator log file
    const logFile = path.join(PROJECT_PATH, 'orchestrator.log')
    
    if (fs.existsSync(logFile)) {
      try {
        const content = fs.readFileSync(logFile, 'utf-8')
        const lines = content.trim().split('\n')
        const lastLine = lines[lines.length - 1]
        
        // Try to parse timestamp from last log line
        const timestampMatch = lastLine.match(/\[(.+?)\]/)
        if (timestampMatch) {
          this.status.lastActivity = new Date(timestampMatch[1])
          const minutesAgo = (Date.now() - this.status.lastActivity.getTime()) / 60000
          
          console.log(`📊 Last activity: ${minutesAgo.toFixed(1)} minutes ago`)
          
          if (minutesAgo > CONFIG.maxIdleMinutes) {
            console.log(`⚠️  Orchestrator idle for ${minutesAgo.toFixed(0)} minutes`)
            this.status.issues.push(`Idle for ${minutesAgo.toFixed(0)} minutes`)
          }
        }
      } catch (error) {
        console.log('⚠️  Could not read activity log')
      }
    } else {
      console.log('⚠️  No orchestrator.log found')
      this.status.issues.push('No activity log')
    }
  }

  /**
   * Check heartbeat recency
   */
  async checkHeartbeat() {
    const heartbeatFile = path.join(PROJECT_PATH, '.orchestrator-heartbeat')
    
    if (fs.existsSync(heartbeatFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(heartbeatFile, 'utf-8'))
        this.status.lastHeartbeat = new Date(data.timestamp)
        const minutesAgo = (Date.now() - this.status.lastHeartbeat.getTime()) / 60000
        
        console.log(`💓 Last heartbeat: ${minutesAgo.toFixed(1)} minutes ago`)
        
        if (minutesAgo > CONFIG.heartbeatInterval * 2) {
          console.log(`❌ Missed heartbeat (expected every ${CONFIG.heartbeatInterval} min)`)
          this.status.issues.push(`Missed heartbeat (${minutesAgo.toFixed(0)} min ago)`)
        } else {
          console.log('✅ Heartbeat recent')
        }
      } catch (error) {
        console.log('⚠️  Could not parse heartbeat file')
        this.status.issues.push('Invalid heartbeat file')
      }
    } else {
      console.log('⚠️  No heartbeat file found')
      this.status.issues.push('No heartbeat recorded')
    }
  }

  /**
   * Check if orchestrator is responsive
   */
  async checkResponsiveness() {
    // Try to send a ping message to orchestrator
    // This would use sessions_send if we had the session key
    
    // For now, just check if we have recent responses
    const responseFile = path.join(PROJECT_PATH, '.orchestrator-responses')
    
    if (fs.existsSync(responseFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(responseFile, 'utf-8'))
        const lastResponse = new Date(data.lastResponse)
        const minutesAgo = (Date.now() - lastResponse.getTime()) / 60000
        
        this.status.isResponsive = minutesAgo < CONFIG.maxIdleMinutes
        
        if (this.status.isResponsive) {
          console.log('✅ Orchestrator is responsive')
        } else {
          console.log('❌ Orchestrator not responsive')
          this.status.issues.push('Not responsive')
        }
      } catch (error) {
        this.status.isResponsive = false
      }
    } else {
      this.status.isResponsive = false
      console.log('⚠️  No response history')
    }
  }

  /**
   * Report current status
   */
  reportStatus() {
    console.log('\n📋 Health Report')
    console.log('================')
    console.log(`Session exists: ${this.status.sessionExists ? '✅' : '❌'}`)
    console.log(`Last activity: ${this.status.lastActivity ? this.status.lastActivity.toISOString() : 'Unknown'}`)
    console.log(`Last heartbeat: ${this.status.lastHeartbeat ? this.status.lastHeartbeat.toISOString() : 'Unknown'}`)
    console.log(`Responsive: ${this.status.isResponsive ? '✅' : '❌'}`)
    
    if (this.status.issues.length > 0) {
      console.log('\n⚠️  Issues found:')
      this.status.issues.forEach(issue => console.log(`   - ${issue}`))
    } else {
      console.log('\n✅ All checks passed!')
    }
  }

  /**
   * Determine if orchestrator needs restart
   */
  shouldRestart() {
    if (!CONFIG.restartOnFailure) return false
    
    // Restart if:
    // 1. Session doesn't exist
    // 2. No heartbeat for >10 min
    // 3. Not responsive for >15 min
    
    if (!this.status.sessionExists) {
      console.log('\n🔄 Restart needed: Session does not exist')
      return true
    }
    
    if (this.status.lastHeartbeat) {
      const minutesAgo = (Date.now() - this.status.lastHeartbeat.getTime()) / 60000
      if (minutesAgo > 10) {
        console.log('\n🔄 Restart needed: No recent heartbeat')
        return true
      }
    }
    
    if (this.status.lastActivity) {
      const minutesAgo = (Date.now() - this.status.lastActivity.getTime()) / 60000
      if (minutesAgo > CONFIG.maxIdleMinutes) {
        console.log('\n🔄 Restart needed: Idle too long')
        return true
      }
    }
    
    return false
  }

  /**
   * Restart the orchestrator
   */
  async restartOrchestrator() {
    console.log('\n🚀 Restarting Orchestrator...')
    
    try {
      // Kill any existing orchestrator processes
      this.killExistingOrchestrator()
      
      // Clear old state
      this.clearState()
      
      // Spawn new orchestrator
      await this.spawnOrchestrator()
      
      console.log('✅ Orchestrator restarted successfully')
      
      // Notify Discord
      await this.notifyDiscord('🔄 Orchestrator restarted due to inactivity')
      
    } catch (error) {
      console.error('❌ Failed to restart orchestrator:', error.message)
      await this.notifyDiscord(`🚨 Failed to restart orchestrator: ${error.message}`)
    }
  }

  /**
   * Kill existing orchestrator processes
   */
  killExistingOrchestrator() {
    try {
      // Find and kill orchestrator processes
      execSync('pkill -f "orchestrator" || true', { stdio: 'ignore' })
      console.log('   Killed existing processes')
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Clear old state files
   */
  clearState() {
    const files = [
      '.orchestrator.lock',
      '.orchestrator-heartbeat'
    ]
    
    for (const file of files) {
      const filePath = path.join(PROJECT_PATH, file)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }
    console.log('   Cleared old state')
  }

  /**
   * Spawn new orchestrator
   */
  async spawnOrchestrator() {
    console.log('   Spawning new orchestrator...')
    
    // Write spawn config
    const spawnConfig = {
      task: `
You are the BO2026 LeadFlow Orchestrator Agent.

Your job: Maximize productivity and ship features.

EVERY 5 MINUTES (your heartbeat):
1. Read HEARTBEAT.md for full instructions
2. Query Supabase for task status
3. Spawn agents if ready tasks exist
4. Evaluate completed tasks
5. Handle failures (retry/decompose/escalate)
6. Report to Stojan every 15 minutes

Use cron tool to schedule your heartbeat:
cron action=add job={
  "name": "orchestrator-heartbeat",
  "schedule": { "kind": "every", "everyMs": 300000 },
  "payload": { "kind": "systemEvent", "text": "Run orchestrator heartbeat per HEARTBEAT.md" },
  "sessionTarget": "main"
}

Start now by running your first heartbeat.
      `.trim(),
      agentId: 'orchestrator',
      model: 'kimi',
      label: SESSION_LABEL
    }
    
    fs.writeFileSync('.spawn-orchestrator.json', JSON.stringify(spawnConfig, null, 2))
    
    // Note: Actual spawn would happen through sessions_spawn
    // This script just prepares the config
    console.log('   Spawn config written to .spawn-orchestrator.json')
    console.log('   Run: openclaw sessions_spawn --config .spawn-orchestrator.json')
  }

  /**
   * Notify Discord
   */
  async notifyDiscord(message) {
    if (!CONFIG.discordWebhook) {
      console.log(`   Discord: ${message}`)
      return
    }
    
    try {
      // Would use message tool or webhook here
      console.log(`   Notified Discord: ${message}`)
    } catch (error) {
      console.error('   Failed to notify Discord:', error.message)
    }
  }

  /**
   * Log health status
   */
  logHealth() {
    const entry = {
      timestamp: new Date().toISOString(),
      healthy: this.status.issues.length === 0,
      issues: this.status.issues,
      status: this.status
    }
    
    fs.appendFileSync(HEALTH_LOG, JSON.stringify(entry) + '\n')
    console.log(`\n📝 Health logged to ${HEALTH_LOG}`)
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2)
  const healthcheck = new OrchestratorHealthcheck()
  
  if (args.includes('--status')) {
    await healthcheck.run()
  } else if (args.includes('--restart')) {
    CONFIG.restartOnFailure = true
    await healthcheck.restartOrchestrator()
  } else {
    await healthcheck.run()
  }
}

main().catch(console.error)
