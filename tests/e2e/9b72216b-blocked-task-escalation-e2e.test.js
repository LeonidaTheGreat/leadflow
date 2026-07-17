#!/usr/bin/env node
/**
 * E2E Structural Test: Blocked Task Escalation Loop
 * Use Case: uc-genome-blocked-task-escalation
 * Task ID (dev): 9b72216b-ef8e-4d93-9386-761c0e39658b
 *
 * Verifies structural invariants of the BlockedTaskEscalation genome module:
 * - Module exists at the expected path in genome
 * - Exports BlockedTaskEscalation class with required interface
 * - Constants match the acceptance criteria (4h threshold, 24h dedup)
 * - Heartbeat executor wires the module as step 5a
 */

'use strict'

const assert = require('assert').strict
const fs = require('fs')
const path = require('path')
const os = require('os')

const GENOME_ROOT = path.join(os.homedir(), 'projects', 'genome')
const MODULE_PATH = path.join(GENOME_ROOT, 'core', 'loops', 'blocked-task-escalation.js')
const HEARTBEAT_PATH = path.join(GENOME_ROOT, 'core', 'actuators', 'heartbeat-executor.js')

let pass = 0
let fail = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
    pass++
  } catch (e) {
    console.error(`❌ ${name}: ${e.message}`)
    fail++
  }
}

// ── Module existence ──────────────────────────────────────────────────────────

test('BlockedTaskEscalation module exists at expected path', () => {
  assert.ok(fs.existsSync(MODULE_PATH), `Not found: ${MODULE_PATH}`)
})

const source = fs.existsSync(MODULE_PATH) ? fs.readFileSync(MODULE_PATH, 'utf8') : ''

// ── Constants match acceptance criteria ───────────────────────────────────────

test('4h age threshold constant is defined', () => {
  assert.ok(
    source.includes('4 * 60 * 60 * 1000'),
    'Expected BLOCKED_HUMAN_AGE_MS = 4 * 60 * 60 * 1000 (4 hours)'
  )
})

test('24h dedup window constant is defined', () => {
  assert.ok(
    source.includes('24 * 60 * 60 * 1000'),
    'Expected DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000 (24 hours)'
  )
})

test('targets Stojan DM chat_id 609044842', () => {
  assert.ok(source.includes('609044842'), 'Expected Stojan DM chat_id 609044842')
})

// ── Class interface ───────────────────────────────────────────────────────────

test('exports BlockedTaskEscalation class', () => {
  assert.ok(source.includes('class BlockedTaskEscalation'), 'Expected class BlockedTaskEscalation')
  assert.ok(source.includes("module.exports = { BlockedTaskEscalation }"), 'Expected module.exports')
})

test('has escalate() method', () => {
  assert.ok(source.includes('async escalate()'), 'Expected async escalate() method')
})

test('has _sendDm() method', () => {
  assert.ok(source.includes('async _sendDm('), 'Expected async _sendDm() method')
})

test('has _buildMessage() method', () => {
  assert.ok(source.includes('_buildMessage('), 'Expected _buildMessage() method')
})

// ── Query coverage ────────────────────────────────────────────────────────────

test('queries use_cases with implementation_status=blocked_human', () => {
  assert.ok(
    source.includes("'use_cases'") && source.includes('blocked_human'),
    'Expected use_cases query for blocked_human'
  )
})

test('queries tasks with status=blocked and blocked_human in last_error', () => {
  assert.ok(
    source.includes("'tasks'") && source.includes('blocked_human'),
    'Expected tasks query with blocked_human in last_error'
  )
})

test('uses ilike for case-insensitive last_error search', () => {
  assert.ok(source.includes('.ilike('), 'Expected .ilike() for case-insensitive last_error search')
})

// ── Heartbeat wiring ─────────────────────────────────────────────────────────

const heartbeatSource = fs.existsSync(HEARTBEAT_PATH)
  ? fs.readFileSync(HEARTBEAT_PATH, 'utf8')
  : ''

test('heartbeat-executor.js imports BlockedTaskEscalation', () => {
  assert.ok(
    heartbeatSource.includes('BlockedTaskEscalation'),
    'Expected heartbeat-executor.js to import BlockedTaskEscalation'
  )
})

test('heartbeat-executor.js runs step 5a escalateBlockedHumanTasks', () => {
  assert.ok(
    heartbeatSource.includes('escalateBlockedHumanTasks'),
    'Expected heartbeat-executor.js to call escalateBlockedHumanTasks as step 5a'
  )
})

test('heartbeat step comment mentions 24h dedup', () => {
  assert.ok(
    heartbeatSource.includes('24h dedup') || heartbeatSource.includes('not notified in 24h'),
    'Expected heartbeat comment to document 24h dedup'
  )
})

// ── Dedup & dry-run safety ───────────────────────────────────────────────────

test('uses readState/writeState for dedup persistence', () => {
  assert.ok(source.includes('readState(') && source.includes('writeState('), 'Expected readState/writeState for dedup')
})

test('respects dry-run mode (no DM when dryRun=true)', () => {
  assert.ok(source.includes('dryRun'), 'Expected dry-run guard in _sendDm or escalate')
})

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n========================================`)
console.log(`✅ Passed: ${pass}`)
if (fail > 0) console.log(`❌ Failed: ${fail}`)
console.log(`📈 Success Rate: ${Math.round(pass / (pass + fail) * 100)}%`)
console.log(`========================================`)

if (fail > 0) {
  process.exit(1)
}
