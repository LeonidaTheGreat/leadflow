'use strict'
/**
 * Regression guard for task 100eda7c:
 * P1 emergency budget reserve — P1 tasks must be able to bypass budget
 * hard stop using a dedicated $5/day reserve. The orchestrator strategic
 * review must be capped at 30% of the daily budget to prevent it from
 * crowding out dev execution.
 *
 * Root cause: dispatcher log showed 'over budget' skipping ALL 19 queued
 * tasks every cycle, including 3 P1 revenue UCs, because the hardStop
 * gate blocked every priority with no P1 escape hatch.
 *
 * Fixes in genome:
 * 1. budget-manager.js: P1_EMERGENCY_RESERVE=$5/day, getP1ReserveRemaining(),
 *    debitP1Reserve() — dedicated reserve that only P1 tasks draw from.
 * 2. spawn-consumer.js: P1 tasks bypass hardStop when reserve is available
 *    (logged with '[P1 RESERVE]' prefix). Orchestrator review capped at 30%.
 * 3. budget-state.js: sense() now returns p1ReserveRemaining.
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const GENOME_ACTUATORS = path.join('/Users/clawdbot/projects/genome/core/actuators')
const GENOME_SENSORS = path.join('/Users/clawdbot/projects/genome/core/sensors')

const BUDGET_MANAGER_FILE = path.join(GENOME_ACTUATORS, 'budget-manager.js')
const SPAWN_CONSUMER_FILE = path.join(GENOME_ACTUATORS, 'spawn-consumer.js')
const BUDGET_STATE_FILE = path.join(GENOME_SENSORS, 'budget-state.js')

let passed = 0
let failed = 0

function check(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`)
    failed++
  }
}

console.log('\n=== 100eda7c: P1 emergency budget reserve regression guard ===\n')

const budgetSrc = fs.existsSync(BUDGET_MANAGER_FILE) ? fs.readFileSync(BUDGET_MANAGER_FILE, 'utf8') : ''
const spawnSrc = fs.existsSync(SPAWN_CONSUMER_FILE) ? fs.readFileSync(SPAWN_CONSUMER_FILE, 'utf8') : ''
const stateSrc = fs.existsSync(BUDGET_STATE_FILE) ? fs.readFileSync(BUDGET_STATE_FILE, 'utf8') : ''

// ── 1. Source files exist ─────────────────────────────────────────────────────
check('budget-manager.js exists in genome', () => {
  assert(fs.existsSync(BUDGET_MANAGER_FILE), `File not found: ${BUDGET_MANAGER_FILE}`)
})

check('spawn-consumer.js exists in genome', () => {
  assert(fs.existsSync(SPAWN_CONSUMER_FILE), `File not found: ${SPAWN_CONSUMER_FILE}`)
})

check('budget-state.js exists in genome', () => {
  assert(fs.existsSync(BUDGET_STATE_FILE), `File not found: ${BUDGET_STATE_FILE}`)
})

// ── 2. budget-manager.js: P1 reserve constant and functions ──────────────────
check('budget-manager.js defines P1_EMERGENCY_RESERVE constant', () => {
  assert(
    budgetSrc.includes('P1_EMERGENCY_RESERVE'),
    'P1_EMERGENCY_RESERVE constant not found in budget-manager.js'
  )
})

check('budget-manager.js P1_EMERGENCY_RESERVE is $5', () => {
  assert(
    /P1_EMERGENCY_RESERVE\s*=\s*5/.test(budgetSrc),
    'P1_EMERGENCY_RESERVE must be set to 5 (dollars per day)'
  )
})

check('budget-manager.js exports getP1ReserveRemaining', () => {
  assert(
    budgetSrc.includes('getP1ReserveRemaining'),
    'getP1ReserveRemaining function not found in budget-manager.js'
  )
  assert(
    /module\.exports\s*=\s*\{[^}]*getP1ReserveRemaining/.test(budgetSrc.replace(/\n/g, ' ')),
    'getP1ReserveRemaining must be exported from budget-manager.js'
  )
})

check('budget-manager.js exports debitP1Reserve', () => {
  assert(
    budgetSrc.includes('debitP1Reserve'),
    'debitP1Reserve function not found in budget-manager.js'
  )
  assert(
    /module\.exports\s*=\s*\{[^}]*debitP1Reserve/.test(budgetSrc.replace(/\n/g, ' ')),
    'debitP1Reserve must be exported from budget-manager.js'
  )
})

check('budget-manager.js debitP1Reserve is idempotent (dedup check)', () => {
  // Verify there is a dedup check that prevents double-debiting same taskId
  const debitFnStart = budgetSrc.indexOf('function debitP1Reserve')
  assert(debitFnStart !== -1, 'debitP1Reserve function not found')
  const debitFnBody = budgetSrc.slice(debitFnStart, debitFnStart + 800)
  assert(
    debitFnBody.includes('taskId') && (debitFnBody.includes('some(') || debitFnBody.includes('find(')),
    'debitP1Reserve must have a dedup guard to prevent double-debiting the same taskId'
  )
})

// ── 3. budget-state.js: p1ReserveRemaining in sense() output ─────────────────
check('budget-state.js imports getP1ReserveRemaining from budget-manager', () => {
  assert(
    stateSrc.includes('getP1ReserveRemaining'),
    'budget-state.js must import getP1ReserveRemaining from budget-manager'
  )
})

check('budget-state.js sense() returns p1ReserveRemaining', () => {
  const senseStart = stateSrc.indexOf('function sense(')
  assert(senseStart !== -1, 'sense() function not found in budget-state.js')
  const senseBody = stateSrc.slice(senseStart, senseStart + 1500)
  assert(
    senseBody.includes('p1ReserveRemaining'),
    'sense() must return p1ReserveRemaining in its output object'
  )
})

// ── 4. spawn-consumer.js: P1 reserve bypass ──────────────────────────────────
check('spawn-consumer.js has [P1 RESERVE] log prefix', () => {
  assert(
    spawnSrc.includes('[P1 RESERVE]'),
    'spawn-consumer.js must log with [P1 RESERVE] prefix when using emergency reserve'
  )
})

check('spawn-consumer.js calls getP1ReserveRemaining before allowing P1 bypass', () => {
  assert(
    spawnSrc.includes('getP1ReserveRemaining'),
    'spawn-consumer.js must call getP1ReserveRemaining to check reserve availability'
  )
})

check('spawn-consumer.js calls debitP1Reserve after allowing P1 through hard stop', () => {
  assert(
    spawnSrc.includes('debitP1Reserve'),
    'spawn-consumer.js must call debitP1Reserve to track reserve usage'
  )
})

check('spawn-consumer.js P1 reserve check requires priority === 1', () => {
  // The P1 reserve path must gate on priority being exactly 1
  const p1ReserveIdx = spawnSrc.indexOf('[P1 RESERVE]')
  assert(p1ReserveIdx !== -1, '[P1 RESERVE] marker not found')
  // Check that priority === 1 check appears before [P1 RESERVE] log (wider window: the if+requires+body can exceed 600 chars)
  const beforeReserve = spawnSrc.slice(Math.max(0, p1ReserveIdx - 1200), p1ReserveIdx)
  assert(
    beforeReserve.includes('priority') && (beforeReserve.includes('=== 1') || beforeReserve.includes('== 1')),
    'P1 reserve must be gated on task.priority === 1'
  )
})

check('spawn-consumer.js P1 reserve logs reserve exhaustion when depleted', () => {
  assert(
    spawnSrc.includes('Reserve exhausted') || spawnSrc.includes('reserve exhausted'),
    'spawn-consumer.js must log when P1 reserve is too low to cover task cost'
  )
})

check('spawn-consumer.js invalidates budget sense cache after P1 reserve debit', () => {
  assert(
    spawnSrc.includes('budgetSenseCache.delete'),
    'spawn-consumer.js must invalidate the budget sense cache after debiting the P1 reserve'
  )
})

// ── 5. spawn-consumer.js: orchestrator cap at 30% ────────────────────────────
check('spawn-consumer.js has [ORCHESTRATOR CAP] log prefix', () => {
  assert(
    spawnSrc.includes('[ORCHESTRATOR CAP]'),
    'spawn-consumer.js must log with [ORCHESTRATOR CAP] prefix when skipping orchestrator review'
  )
})

check('spawn-consumer.js checks orchestrator-review tag', () => {
  assert(
    spawnSrc.includes("'orchestrator-review'") || spawnSrc.includes('"orchestrator-review"'),
    "spawn-consumer.js must identify orchestrator tasks by the 'orchestrator-review' tag"
  )
})

check('spawn-consumer.js applies 30% (0.3) daily budget cap to orchestrator review', () => {
  const capIdx = spawnSrc.indexOf('[ORCHESTRATOR CAP]')
  assert(capIdx !== -1, '[ORCHESTRATOR CAP] marker not found')
  const nearCap = spawnSrc.slice(Math.max(0, capIdx - 800), capIdx + 200)
  assert(
    nearCap.includes('0.3'),
    'Orchestrator cap must use 0.3 (30%) of daily budget limit'
  )
})

check('spawn-consumer.js orchestrator cap check runs BEFORE P1 reserve bypass', () => {
  // Orchestrator review must not be able to use P1 reserve — cap check first
  const capIdx = spawnSrc.indexOf('[ORCHESTRATOR CAP]')
  const reserveIdx = spawnSrc.indexOf('[P1 RESERVE]')
  assert(capIdx !== -1, '[ORCHESTRATOR CAP] marker not found')
  assert(reserveIdx !== -1, '[P1 RESERVE] marker not found')
  assert(
    capIdx < reserveIdx,
    'Orchestrator cap check must appear before P1 reserve bypass in spawn-consumer.js'
  )
})

check('spawn-consumer.js excludes orchestrator tasks from P1 reserve bypass', () => {
  const reserveIdx = spawnSrc.indexOf('[P1 RESERVE]')
  assert(reserveIdx !== -1, '[P1 RESERVE] marker not found')
  const beforeReserve = spawnSrc.slice(Math.max(0, reserveIdx - 600), reserveIdx)
  assert(
    beforeReserve.includes('isOrchestratorReview') || beforeReserve.includes('orchestratorReview'),
    'P1 reserve bypass must explicitly exclude orchestrator review tasks'
  )
})

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nResults: ${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  process.exit(1)
}

console.log('All checks confirm:')
console.log('  1. budget-manager.js: P1_EMERGENCY_RESERVE=$5/day, getP1ReserveRemaining(), debitP1Reserve()')
console.log('  2. budget-state.js: sense() returns p1ReserveRemaining')
console.log('  3. spawn-consumer.js: P1 tasks bypass hardStop via reserve (logged with [P1 RESERVE])')
console.log('  4. spawn-consumer.js: orchestrator review capped at 30% of daily budget')
console.log('     → P1 revenue tasks can now proceed even when daily budget is exhausted')
console.log('     → Orchestrator review cannot consume more than 30% of daily budget')
