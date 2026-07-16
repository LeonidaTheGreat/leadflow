'use strict'
/**
 * QC E2E test: verifies the TEST FILE PLACEMENT rule is present in both
 * the dev agent's SOUL.md and genome's role-context.js buildRoleContext().
 * Runs with: node tests/unit/uc-leadflow-maintenance-dev-agent-rule.test.js
 */

const fs = require('fs')
const assert = require('assert')

let passed = 0
let failed = 0

function check(label, fn) {
  try {
    fn()
    console.log(`  ✅ ${label}`)
    passed++
  } catch (err) {
    console.error(`  ❌ ${label}: ${err.message}`)
    failed++
  }
}

// ── SOUL.md ──────────────────────────────────────────────────────────────────
const SOUL_MD = '/Users/clawdbot/.openclaw/workspace-dev/SOUL.md'
console.log('\nSOUL.md — TEST FILE PLACEMENT rule:')

check('SOUL.md exists at expected path', () => {
  assert.ok(fs.existsSync(SOUL_MD), `Missing: ${SOUL_MD}`)
})

const soulContent = fs.existsSync(SOUL_MD) ? fs.readFileSync(SOUL_MD, 'utf8') : ''

check('SOUL.md contains TEST FILE PLACEMENT rule', () => {
  assert.ok(/TEST FILE PLACEMENT/.test(soulContent), 'Rule not found in SOUL.md')
})

check('SOUL.md forbids product/lead-response/dashboard/tests/', () => {
  assert.ok(/product\/lead-response\/dashboard\/tests/.test(soulContent),
    'Forbidden path not mentioned in SOUL.md')
})

check('SOUL.md references tests/e2e, tests/integration, or tests/unit', () => {
  assert.ok(/tests\/e2e|tests\/integration|tests\/unit/.test(soulContent),
    'Required tests/ subdirs not mentioned')
})

// ── role-context.js ──────────────────────────────────────────────────────────
const ROLE_CONTEXT_PATH = '/Users/clawdbot/projects/genome/core/food/role-context'
console.log('\nrole-context.js buildRoleContext() — dev section:')

let roleContext
check('role-context.js loads without error', () => {
  roleContext = require(ROLE_CONTEXT_PATH)
  assert.ok(roleContext, 'require returned null/undefined')
})

check('buildRoleContext() returns spawnRole', () => {
  const out = roleContext.buildRoleContext('dev', 'Implement: test', 'desc')
  assert.ok(out && out.spawnRole, `No spawnRole key in output (keys: ${Object.keys(out || {}).join(',')})`)
})

check('buildRoleContext() for dev includes TEST FILE PLACEMENT', () => {
  const out = roleContext.buildRoleContext('dev', 'Implement: test', 'desc')
  const text = out.spawnRole || out.roleContext || JSON.stringify(out)
  assert.ok(/TEST FILE PLACEMENT/.test(text), 'TEST FILE PLACEMENT not found in dev role context')
})

check('buildRoleContext() for dev forbids dashboard/tests path', () => {
  const out = roleContext.buildRoleContext('dev', 'Implement: test', 'desc')
  const text = out.spawnRole || out.roleContext || JSON.stringify(out)
  assert.ok(/product\/lead-response\/dashboard\/tests/.test(text),
    'Forbidden dashboard/tests path not mentioned in dev role context')
})

// ── PR diff quality guard ────────────────────────────────────────────────────
const NEW_TEST_FILE = '/var/folders/6d/xd0z4ldx1l17klqt54scqxsc0000gp/T/leadflow-25cb2eac-4ab6-406a-b24c-0094dd72a000/tests/unit/dev-agent-instructions.test.js'
console.log('\nPR test file quality:')

check('New test file exists in tests/unit/', () => {
  assert.ok(fs.existsSync(NEW_TEST_FILE), `Missing: ${NEW_TEST_FILE}`)
})

const newTestContent = fs.existsSync(NEW_TEST_FILE) ? fs.readFileSync(NEW_TEST_FILE, 'utf8') : ''

check('ROLE_CONTEXT variable is NOT dead code (must appear more than once)', () => {
  const matches = (newTestContent.match(/ROLE_CONTEXT/g) || []).length
  // If only 1 occurrence, it's defined but never used (dead code)
  assert.ok(matches > 1, `ROLE_CONTEXT appears only ${matches} time(s) — defined but never used (dead code)`)
})

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
} else {
  console.log('All checks passed.')
  process.exit(0)
}
