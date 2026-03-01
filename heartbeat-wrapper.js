#!/usr/bin/env node
/**
 * LeadFlow Orchestrator - Heartbeat Wrapper
 * 
 * 1. Runs heartbeat-executor.js (Supabase state, queues spawns)
 * 2. Runs spawn-consumer.js (actually spawns OpenClaw agents)
 * 3. Outputs status for orchestrator to post to Telegram if needed
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const REPORT_FILE = path.join(__dirname, '.orchestrator-report.json')

async function main() {
  // Step 1: Run executor (Supabase state management, queue writes)
  console.log('🫀 Running heartbeat executor...')
  try {
    execSync('node heartbeat-executor.js', {
      cwd: __dirname,
      stdio: 'pipe'
    })
  } catch (err) {
    console.error('❌ Executor failed:', err.message)
  }

  // Step 2: Run spawn consumer (actually spawn agents)
  console.log('🚀 Running spawn consumer...')
  try {
    const { run } = require('./spawn-consumer')
    const result = await run()

    if (result.spawned.length > 0) {
      console.log(`   ✓ Spawned ${result.spawned.length} agent(s): ${result.spawned.map(s => s.title).join(', ')}`)
    }
    if (result.errors.length > 0) {
      console.error(`   ⚠️  ${result.errors.length} spawn error(s)`)
      result.errors.forEach(e => console.error('   -', e))
    }

    // Append spawn results to report if exists
    if (fs.existsSync(REPORT_FILE) && result.spawned.length > 0) {
      try {
        const reportData = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'))
        const spawnSummary = result.spawned.map(s => `• Spawned ${s.agentId} → ${s.title}`).join('\n')
        reportData.report = (reportData.report || '') + '\n\n' + spawnSummary
        fs.writeFileSync(REPORT_FILE, JSON.stringify(reportData, null, 2))
      } catch {}
    } else if (result.spawned.length > 0 && !fs.existsSync(REPORT_FILE)) {
      // Create report with just spawn info
      const spawnSummary = result.spawned.map(s => `• Spawned ${s.agentId} → ${s.title}`).join('\n')
      fs.writeFileSync(REPORT_FILE, JSON.stringify({ report: spawnSummary }, null, 2))
    }

  } catch (err) {
    console.error('❌ Spawn consumer failed:', err.message)
  }

  // Step 3: Check if there's a report to post to Telegram
  if (fs.existsSync(REPORT_FILE)) {
    try {
      const reportData = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'))

      if (reportData.report) {
        console.log('\n=== POST_TO_LEADFLOW_TOPIC ===')
        console.log(JSON.stringify({
          action: 'send',
          channel: 'telegram',
          target: '-1003852328909',
          threadId: '10788',
          message: reportData.report
        }, null, 2))
        console.log('=== END ===\n')

        fs.unlinkSync(REPORT_FILE)
      }
    } catch (err) {
      console.error('⚠️  Could not process report:', err.message)
    }
  } else {
    console.log('No report to post (silent heartbeat)')
  }

  console.log('✅ Heartbeat cycle complete')
}

main().catch(err => {
  console.error('❌ Wrapper failed:', err.message)
  process.exit(1)
})
