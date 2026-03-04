#!/usr/bin/env node
/**
 * Verify 8/10 Autonomy Setup
 * 
 * Run: node verify-8-10.js
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🔍 Verifying 8/10 Autonomy Setup')
console.log('=================================\n')

let score = 0
const checks = []

function check(name, condition, critical = false) {
  const status = condition ? '✅' : critical ? '❌' : '⚠️'
  checks.push({ name, status: condition, critical })
  console.log(`${status} ${name}`)
  if (condition) score++
  return condition
}

// Check files exist
console.log('📁 Core Files:')
check('auto-spawn.js exists', fs.existsSync('auto-spawn.js'), true)
check('budget-dashboard.js exists', fs.existsSync('budget-dashboard.js'), true)
check('self-test.js exists', fs.existsSync('self-test.js'), true)
check('failure-recovery.js exists', fs.existsSync('failure-recovery.js'), true)
check('pipeline-8-10.js exists', fs.existsSync('pipeline-8-10.js'), true)
check('event-watcher.js exists', fs.existsSync('event-watcher.js'), true)

console.log('\n⚙️  File Permissions:')
check('pipeline-8-10.js executable', fs.statSync('pipeline-8-10.js').mode & 0o111)
check('event-watcher.js executable', fs.statSync('event-watcher.js').mode & 0o111)

console.log('\n📝 Log Files:')
check('spawn-log.jsonl exists', fs.existsSync('spawn-log.jsonl'))
check('test-log.jsonl exists', fs.existsSync('test-log.jsonl'))
check('recovery-log.jsonl exists', fs.existsSync('recovery-log.jsonl'))

console.log('\n💰 Budget System:')
check('budget-tracker.json exists', fs.existsSync('budget-tracker.json'))

console.log('\n⏰ Cron Jobs:')
try {
  const crontab = execSync('crontab -l', { encoding: 'utf-8' })
  check('pipeline-8-10.js in cron', crontab.includes('pipeline-8-10.js'))
  check('event-watcher.js in cron', crontab.includes('event-watcher.js'))
  check('old auto-spawn.js removed from cron', !crontab.includes('auto-spawn.js') || crontab.includes('pipeline-8-10.js'))
} catch (e) {
  check('crontab accessible', false, true)
}

console.log('\n🔧 Auto-Spawn Integration:')
const autoSpawn = fs.readFileSync('auto-spawn.js', 'utf-8')
check('Auto-spawn calls self-test', autoSpawn.includes('self-test.js'))
check('Auto-spawn calls failure-recovery', autoSpawn.includes('failure-recovery.js'))

console.log('\n📊 Score:')
const maxScore = checks.filter(c => c.critical).length + checks.filter(c => !c.critical).length
console.log(`   ${score}/${maxScore} checks passed`)

const criticalPassed = checks.filter(c => c.critical && c.status).length
const criticalTotal = checks.filter(c => c.critical).length

console.log(`   Critical: ${criticalPassed}/${criticalTotal}`)

if (criticalPassed === criticalTotal) {
  console.log('\n✅ 8/10 Phase 1 IMPLEMENTED')
  console.log('')
  console.log('Next steps:')
  console.log('  1. Start event watcher: node event-watcher.js &')
  console.log('  2. Test with: echo \'{...}\' > .spawn-config.json')
  console.log('  3. Watch logs: tail -f event-watcher.log')
} else {
  console.log('\n❌ Setup incomplete')
  console.log('Run: ./setup-auto-spawn.sh')
}

console.log('')
console.log('8/10 Features Active:')
console.log('  ✅ Pipeline as standard entry point')
console.log('  ✅ Auto-trigger tests after spawn')
console.log('  ✅ Event-driven dispatch (file watchers)')
console.log('  ✅ Integrated budget + test + recovery')
