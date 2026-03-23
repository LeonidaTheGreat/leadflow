const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Integrated 8/10 Autonomy System
// Combines: auto-spawn + self-test + failure recovery

const SPAWN_CONFIG = path.join(process.cwd(), '.spawn-config.json')
const TEST_RESULTS = path.join(process.cwd(), 'test-results.json')

function loadSpawnConfig() {
  try {
    if (fs.existsSync(SPAWN_CONFIG)) {
      return JSON.parse(fs.readFileSync(SPAWN_CONFIG, 'utf-8'))
    }
  } catch (e) {}
  return null
}

function loadTestResults() {
  try {
    if (fs.existsSync(TEST_RESULTS)) {
      return JSON.parse(fs.readFileSync(TEST_RESULTS, 'utf-8'))
    }
  } catch (e) {}
  return null
}

async function runPhase(phaseName, command, required = true) {
  console.log(`\n[${phaseName}]`)
  console.log('─'.repeat(40))
  
  try {
    execSync(command, { stdio: 'inherit' })
    console.log(`✅ ${phaseName} complete`)
    return { success: true }
  } catch (error) {
    console.log(`❌ ${phaseName} failed`)
    if (required) {
      return { 
        success: false, 
        error: error.message,
        phase: phaseName
      }
    }
    return { success: true, warning: `${phaseName} failed but not required` }
  }
}

async function main() {
  console.log('8/10 Autonomy Pipeline')
  console.log('======================')
  console.log('')
  console.log('Phase 1: Auto-Spawn (if under budget)')
  console.log('Phase 2: Agent Execution')
  console.log('Phase 3: Self-Test')
  console.log('Phase 4: Success → Done')
  console.log('         Failure → Recovery (retry ×3, escalate)')
  console.log('')
  
  const config = loadSpawnConfig()
  if (!config) {
    console.log('No spawn config. Nothing to do.')
    process.exit(0)
  }
  
  // Phase 1: Auto-spawn with budget check
  const spawnResult = await runPhase(
    'PHASE 1: Auto-Spawn',
    'node auto-spawn.js',
    true
  )
  
  if (!spawnResult.success) {
    console.log('\nAuto-spawn failed or escalated. Stopping.')
    process.exit(0) // Not an error, just escalated to human
  }
  
  // Phase 2: Self-test
  const testResult = await runPhase(
    'PHASE 2: Self-Test',
    'node self-test.js',
    true
  )
  
  if (!testResult.success) {
    console.log('\nTests failed. Entering recovery...')
    
    // Phase 3: Failure Recovery
    const recoveryResult = await runPhase(
      'PHASE 3: Failure Recovery',
      `node failure-recovery.js fail "Self-test failed"`,
      true
    )
    
    if (!recoveryResult.success) {
      console.log('\n❌ Escalated to human. Check escalation-pending.json')
      process.exit(1)
    }
    
    console.log('\n🔄 Retry prepared. Next auto-spawn cycle will retry.')
    process.exit(0)
  }
  
  // Phase 4: Mark success
  console.log('\n[PHASE 4: Success]')
  console.log('─'.repeat(40))
  
  try {
    execSync('node failure-recovery.js success', { stdio: 'ignore' })
    console.log('✅ Recovery state cleared')
  } catch (e) {
    // Ignore
  }
  
  console.log('\n✅ 8/10 Pipeline Complete')
  console.log(`   Task: ${config.task}`)
  console.log(`   Agent: ${config.agentId}`)
  console.log(`   Model: ${config.model}`)
  console.log('   Status: SUCCESS')
}

main().catch(error => {
  console.error('Pipeline error:', error)
  process.exit(1)
})
