/**
 * QC E2E Test: Genome replenishQueue ready-status fix — PR #1051
 * Task: 678a0a08-b78b-4b08-a378-cd0ba5bbdd02
 *
 * Tests the fix where 'ready' UCs were excluded from replenishQueue status filter,
 * causing startStep to always default to 0 and creating infinite step-0 task loops.
 *
 * Verification approach:
 * 1. Acceptance checks per UC definition (grep commands)
 * 2. Structural verification that startStep is NOT inside a status gate
 * 3. activeUCs filter excludes 'done' tasks (original bug description)
 * 4. auth.spec.js fix: data-testid selector + timeout
 * 5. health.spec.js fix: navigationTimeout and per-test setTimeout
 */

'use strict'
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const HEARTBEAT = path.join(process.env.HOME, '.openclaw/genome/core/heartbeat-executor.js')
const AUTH_SPEC = path.join(__dirname, 'browser/auth.spec.js')
const HEALTH_SPEC = path.join(__dirname, 'browser/health.spec.js')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
    passed++
  } catch (e) {
    console.log(`FAIL: ${name} — ${e.message}`)
    failed++
  }
}

const heartbeat = fs.readFileSync(HEARTBEAT, 'utf8')
const authSpec = fs.readFileSync(AUTH_SPEC, 'utf8')
const healthSpec = fs.readFileSync(HEALTH_SPEC, 'utf8')

// === Acceptance checks per UC definition ===

test("AC1: 'ready' in status filter — grep count = 1", () => {
  const count = parseInt(execSync(`grep -c "'not_started', 'partial', 'ready'" ${HEARTBEAT}`).toString().trim(), 10)
  assert.strictEqual(count, 1, `Expected exactly 1 line, got ${count}`)
})

test("AC2: unconditional startStep comment present — grep count = 1", () => {
  const count = parseInt(execSync(`grep -c "ALWAYS check done tasks regardless of UC status" ${HEARTBEAT}`).toString().trim(), 10)
  assert.strictEqual(count, 1, `Expected exactly 1 line, got ${count}`)
})

// === Structural checks ===

test("activeUCs filter excludes 'done' tasks", () => {
  // The original bug: done tasks were included, making UCs with done steps appear active
  // Fix: only ready/in_progress/blocked count as active
  const activeUCsBlock = heartbeat.match(/activeUCs = new Set\(allTasks[\s\S]*?\.filter\(t => ([^)]+)\)/)
  assert.ok(activeUCsBlock, 'Could not find activeUCs filter block')
  const filterExpr = activeUCsBlock[1]
  assert.ok(!filterExpr.includes("'done'"), `activeUCs filter must NOT include 'done': got ${filterExpr}`)
  assert.ok(filterExpr.includes("'ready'") && filterExpr.includes("'in_progress'"), 
    `activeUCs must include ready/in_progress: got ${filterExpr}`)
})

test("startStep calculation is NOT gated by UC status", () => {
  // Find the replenishQueue function body (starts after the .in('implementation_status') call)
  const filterLine = "'not_started', 'partial', 'ready', 'stuck', 'in_progress'"
  const filterIdx = heartbeat.indexOf(filterLine)
  assert.ok(filterIdx > -1, 'Could not find filter line')
  
  // Extract ~2000 chars after filter to check startStep is not inside a status if-block
  const snippet = heartbeat.slice(filterIdx, filterIdx + 5000)
  
  // startStep = 0 must exist
  assert.ok(snippet.includes('let startStep = 0'), 'startStep initialization missing')
  
  // The fix: startStep must NOT be inside an if-statement that gates on UC status
  // Verify: the doneTasks query is NOT wrapped in a status check
  const startStepIdx = snippet.indexOf('let startStep = 0')
  const precedingCode = snippet.slice(0, startStepIdx)
  
  // There should be no unclosed if-block checking UC status immediately before startStep
  // (We check that 'ready' doesn't appear in an if condition right before startStep)
  const lastIfBefore = precedingCode.lastIndexOf('if (')
  if (lastIfBefore > -1) {
    const lastIfContent = precedingCode.slice(lastIfBefore, lastIfBefore + 100)
    assert.ok(
      !lastIfContent.includes("uc.implementation_status === 'ready'") &&
      !lastIfContent.includes("'stuck', 'in_progress'"),
      `startStep appears gated by UC status check: ${lastIfContent}`
    )
  }
})

test("ready UCs transition to in_progress on replenish", () => {
  // Verify the status update block handles 'ready'
  assert.ok(
    heartbeat.includes("['ready', 'not_started'].includes(uc.implementation_status)"),
    "Missing transition logic for ready UCs to in_progress"
  )
})

// === auth.spec.js fixes (part of this PR) ===

test("auth.spec.js uses getByTestId selector", () => {
  assert.ok(authSpec.includes("getByTestId('login-error-message')"), 
    "Expected getByTestId selector in auth.spec.js")
})

test("auth.spec.js removed fragile [class*='red'] selector", () => {
  assert.ok(!authSpec.includes('[class*="red"]'), 
    "Old fragile CSS selector still present in auth.spec.js")
})

test("auth.spec.js timeout >= 20000ms", () => {
  const match = authSpec.match(/login-error-message[^}]+timeout:\s*(\d+)/)
  assert.ok(match, "Could not find timeout near login-error-message")
  const t = parseInt(match[1], 10)
  assert.ok(t >= 20000, `Expected timeout >= 20000, got ${t}`)
})

// === health.spec.js fixes (part of this PR) ===

test("health.spec.js has navigationTimeout override", () => {
  assert.ok(healthSpec.includes('navigationTimeout:'), 
    "Missing navigationTimeout in health.spec.js")
})

test("health.spec.js has test.setTimeout for cold start tolerance", () => {
  const matches = healthSpec.match(/test\.setTimeout\(\d+\)/g)
  assert.ok(matches && matches.length >= 2, 
    `Expected >= 2 test.setTimeout calls in health.spec.js, got ${matches ? matches.length : 0}`)
})

// === No hardcoded secrets ===

test("No hardcoded secrets in changed files", () => {
  const files = [AUTH_SPEC, HEALTH_SPEC]
  const secretPatterns = [/sk_live_/, /sk_test_/, /password\s*=\s*['"][^'"]{10,}['"]/, /api[_-]?key\s*=\s*['"][^'"]{10,}['"]/i]
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8')
    for (const pat of secretPatterns) {
      assert.ok(!pat.test(src), `Potential secret matching ${pat} in ${path.basename(f)}`)
    }
  }
})

// === Results ===

console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
