'use strict'
/**
 * E2E test: cleanup-completion-reports.js logic validation.
 * Tests phase-1 (age-based) and phase-2 (count-based) deletion.
 * Run: node tests/uc-leadflow-maintenance-mission-metrics-day119.test.js
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const assert = require('assert')
const { execSync } = require('child_process')

// Support running from QC worktree or project root
const LOCAL = path.join(__dirname, '..', 'scripts', 'cleanup-completion-reports.js')
const FALLBACK = '/Users/clawdbot/projects/leadflow/scripts/cleanup-completion-reports.js'
const SCRIPT = fs.existsSync(LOCAL) ? LOCAL : FALLBACK

if (!fs.existsSync(SCRIPT)) {
  console.error('SKIP: cleanup-completion-reports.js not found at', SCRIPT)
  process.exit(0)
}

function setup(dir) { fs.mkdirSync(dir, { recursive: true }) }

function createFile(dir, name, ageMs) {
  const fPath = path.join(dir, name)
  fs.writeFileSync(fPath, '{}')
  const t = (Date.now() - ageMs) / 1000
  fs.utimesSync(fPath, t, t)
}

function cleanup(dir) { fs.rmSync(dir, { recursive: true, force: true }) }

function patchScript(crDir) {
  return fs.readFileSync(SCRIPT, 'utf-8')
    .replace("path.join(__dirname, '..', 'completion-reports')", JSON.stringify(crDir))
}

let passed = 0
let failed = 0

function test(label, fn) {
  try { fn(); console.log(`  ✅ ${label}`); passed++ }
  catch (e) { console.error(`  ❌ ${label}: ${e.message}`); failed++ }
}

// Phase 1: age-based deletion
;(function() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cr1-'))
  const cr = path.join(tmp, 'completion-reports')
  setup(cr)
  createFile(cr, 'COMPLETION-old-001.json', 8 * 24 * 3600 * 1000)
  createFile(cr, 'COMPLETION-old-002.json', 8 * 24 * 3600 * 1000)
  createFile(cr, 'COMPLETION-new-001.json', 1 * 24 * 3600 * 1000)
  createFile(cr, 'OTHER-irrelevant.json', 8 * 24 * 3600 * 1000)
  const run = path.join(tmp, 'run.js')
  fs.writeFileSync(run, patchScript(cr))
  const out = execSync(`node ${run}`, { encoding: 'utf-8' })
  const rem = fs.readdirSync(cr)
  test('Phase1: deletes files older than 7 days', () => {
    assert(!rem.includes('COMPLETION-old-001.json'))
    assert(!rem.includes('COMPLETION-old-002.json'))
  })
  test('Phase1: keeps files newer than 7 days', () => {
    assert(rem.includes('COMPLETION-new-001.json'))
  })
  test('Phase1: does not touch non-COMPLETION- files', () => {
    assert(rem.includes('OTHER-irrelevant.json'))
  })
  test('Phase1: output reports deleted count', () => {
    assert(out.includes('Deleted 2'), `got: ${out.trim()}`)
  })
  cleanup(tmp)
})()

// Phase 2: count-based trimming (505 recent files, all < 7 days old)
;(function() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cr2-'))
  const cr = path.join(tmp, 'completion-reports')
  setup(cr)
  // stagger mtime: index 0 = most recent (1h), index 504 = oldest (1h + 504s)
  for (let i = 0; i < 505; i++) {
    createFile(cr, `COMPLETION-${String(i).padStart(4, '0')}.json`, 3600 * 1000 + i * 1000)
  }
  const run = path.join(tmp, 'run.js')
  fs.writeFileSync(run, patchScript(cr))
  execSync(`node ${run}`, { encoding: 'utf-8' })
  const rem = fs.readdirSync(cr).filter(f => f.startsWith('COMPLETION-'))
  test('Phase2: trims to MAX_KEEP=450 when count exceeds 500', () => {
    assert.strictEqual(rem.length, 450, `got ${rem.length}`)
  })
  test('Phase2: keeps newest files', () => {
    assert(rem.includes('COMPLETION-0000.json'), 'newest should survive')
  })
  test('Phase2: deletes oldest files', () => {
    assert(!rem.includes('COMPLETION-0504.json'), 'oldest should be gone')
  })
  cleanup(tmp)
})()

// Edge: missing directory → no-op
;(function() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cr3-'))
  const cr = path.join(tmp, 'completion-reports')  // intentionally absent
  const run = path.join(tmp, 'run.js')
  fs.writeFileSync(run, patchScript(cr))
  const out = execSync(`node ${run}`, { encoding: 'utf-8' })
  test('Edge: no-op when completion-reports dir is absent', () => {
    assert(out.includes('nothing to do'), `got: ${out.trim()}`)
  })
  cleanup(tmp)
})()

console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
