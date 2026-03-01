#!/usr/bin/env node
/**
 * LeadFlow Orchestrator - Heartbeat with Explicit Telegram Post
 * 
 * This script runs the heartbeat executor and then explicitly posts
 * to Telegram LeadFlow topic (10788) using the message tool output.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const REPORT_FILE = path.join(__dirname, '.orchestrator-report.json')
const HEARTBEAT_LOG = path.join(__dirname, 'ORCHESTRATOR-HEARTBEAT-LOG.md')

// Run the executor
try {
  console.log('🫀 Running heartbeat executor...')
  execSync('node heartbeat-executor.js', { 
    cwd: __dirname,
    stdio: 'inherit'
  })
} catch (err) {
  console.error('❌ Executor failed:', err.message)
}

// Check if there's a report to post
if (fs.existsSync(REPORT_FILE)) {
  try {
    const reportData = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'))
    
    if (reportData.report) {
      // Output instructions for the orchestrator to use message()
      console.log('\n📤 POST_TO_TELEGRAM:')
      console.log(JSON.stringify({
        action: "send",
        channel: "telegram", 
        target: "-1003852328909",
        threadId: "10788",
        message: reportData.report
      }))
    }
  } catch (err) {
    console.error('⚠️ Could not read report:', err.message)
  }
}

console.log('\n✅ Heartbeat cycle complete')
