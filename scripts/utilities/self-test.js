const fs = require('fs')
const path = require('path')

// Self-Test Runner - Auto-verify agent work
// Run: node self-test.js --task-id <id> or auto-detect from spawn

const TEST_TIMEOUT = 300000 // 5 min max for tests
const MAX_RETRIES = 3
const TEST_LOG = path.join(process.cwd(), 'test-log.jsonl')

// Test types by agent
const AGENT_TESTS = {
  'dev': [
    { name: 'build', cmd: 'npm run build', required: true },
    { name: 'lint', cmd: 'npm run lint', required: false },
    { name: 'unit-tests', cmd: 'npm test -- --passWithNoTests', required: true },
    { name: 'typecheck', cmd: 'npx tsc --noEmit', required: true }
  ],
  'marketing': [
    { name: 'links-valid', cmd: 'node scripts/check-links.js', required: false },
    { name: 'copy-review', cmd: 'node scripts/lint-copy.js', required: false }
  ],
  'design': [
    { name: 'assets-exist', cmd: 'node scripts/check-assets.js', required: true },
    { name: 'responsive-preview', cmd: 'node scripts/check-responsive.js', required: false }
  ],
  'qc': [
    { name: 'compliance-check', cmd: 'node scripts/compliance-check.js', required: true },
    { name: 'security-scan', cmd: 'npm audit --audit-level=moderate', required: false }
  ],
  'analytics': [
    { name: 'queries-valid', cmd: 'node scripts/validate-queries.js', required: true },
    { name: 'data-integrity', cmd: 'node scripts/check-data.js', required: false }
  ],
  'default': [
    { name: 'files-exist', cmd: 'node scripts/check-deliverables.js', required: true }
  ]
}

function logTest(result) {
  const entry = {
    timestamp: new Date().toISOString(),
    ...result
  }
  fs.appendFileSync(TEST_LOG, JSON.stringify(entry) + '\n')
}

function getTestsForAgent(agentId) {
  return AGENT_TESTS[agentId] || AGENT_TESTS['default']
}

async function runCommand(cmd, cwd = process.cwd()) {
  const { execSync } = require('child_process')
  const start = Date.now()
  
  try {
    const output = execSync(cmd, { 
      cwd, 
      timeout: TEST_TIMEOUT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return {
      success: true,
      duration: Date.now() - start,
      output: output.substring(0, 500) // Truncate
    }
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - start,
      error: error.message.substring(0, 500),
      code: error.status
    }
  }
}

async function runTests(agentId, taskId) {
  const tests = getTestsForAgent(agentId)
  const results = []
  let allRequiredPassed = true
  
  console.log(`\nRunning self-tests for ${agentId}...`)
  console.log(`Task: ${taskId || 'unknown'}`)
  console.log(`Tests: ${tests.length}`)
  
  for (const test of tests) {
    process.stdout.write(`  ${test.name}... `)
    
    const result = await runCommand(test.cmd)
    results.push({
      name: test.name,
      required: test.required,
      ...result
    })
    
    if (result.success) {
      console.log(`✅ (${result.duration}ms)`)
    } else {
      console.log(`❌ (${result.duration}ms)`)
      if (test.required) {
        allRequiredPassed = false
      }
    }
  }
  
  return {
    agentId,
    taskId,
    passed: allRequiredPassed,
    testsRun: tests.length,
    testsPassed: results.filter(r => r.success).length,
    results,
    timestamp: new Date().toISOString()
  }
}

async function saveTestResult(result) {
  // Write to test-results.json for agent pickup
  const resultsPath = path.join(process.cwd(), 'test-results.json')
  fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2))
  
  // Log to JSONL
  logTest(result)
  
  // Update spawn config if exists
  const spawnConfigPath = path.join(process.cwd(), '.spawn-config.json')
  if (fs.existsSync(spawnConfigPath)) {
    const config = JSON.parse(fs.readFileSync(spawnConfigPath, 'utf-8'))
    config.testResults = result
    config.testPassed = result.passed
    fs.writeFileSync(spawnConfigPath, JSON.stringify(config, null, 2))
  }
}

async function main() {
  const args = process.argv.slice(2)
  const taskId = args.includes('--task-id') 
    ? args[args.indexOf('--task-id') + 1] 
    : null
  
  // Auto-detect from spawn config if available
  const spawnConfigPath = path.join(process.cwd(), '.spawn-config.json')
  let agentId = 'default'
  let spawnTaskId = null
  
  if (fs.existsSync(spawnConfigPath)) {
    const config = JSON.parse(fs.readFileSync(spawnConfigPath, 'utf-8'))
    agentId = config.agentId || 'default'
    spawnTaskId = config.task
  }
  
  const finalTaskId = taskId || spawnTaskId || `test-${Date.now()}`
  
  console.log('Self-Test Runner (8/10 Autonomy)')
  console.log('=================================')
  
  const result = await runTests(agentId, finalTaskId)
  await saveTestResult(result)
  
  console.log('\n' + '─'.repeat(40))
  console.log(`Result: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`Tests: ${result.testsPassed}/${result.testsRun} passed`)
  
  if (!result.passed) {
    console.log('\nFailed required tests:')
    result.results
      .filter(r => r.required && !r.success)
      .forEach(r => console.log(`  - ${r.name}: ${r.error || 'unknown error'}`))
  }
  
  console.log('\nFull results: test-results.json')
  
  // Exit with error code if failed
  process.exit(result.passed ? 0 : 1)
}

main().catch(error => {
  console.error('Self-test error:', error)
  process.exit(1)
})
