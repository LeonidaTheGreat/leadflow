'use strict'
/**
 * improve-agent-audit.js — Verify the improve-agent processor is working end-to-end.
 *
 * Checks:
 *   1. genome/intelligence/strategic-review-handler.js exists and uses direct-write pattern
 *   2. workspace RULES.md/SOUL.md files exist and were recently written to
 *   3. No unprocessed ORCHESTRATOR-DECISIONS-*.json files remain in completion-reports/
 *
 * Run: node scripts/diagnostics/improve-agent-audit.js
 * Exit 0 = all checks pass; exit 1 = one or more issues found
 */

const fs = require('fs')
const path = require('path')
const os = require('os')

const HANDLER_PATH = path.join(os.homedir(), 'projects/genome/intelligence/strategic-review-handler.js')
const COMPLETION_DIR = path.join(os.homedir(), 'projects/leadflow/completion-reports')
// Only check agents with known workspace dirs. The handler uses workspace-${agent}
// but workspace-product doesn't exist (only workspace-product-manager does); improve-agent
// items targeting 'product' will be skipped by the handler with a WARN, which is acceptable.
const AGENTS = ['dev', 'qc']
const STALE_DAYS = 7

let issues = 0

function check(label, fn) {
  try {
    const result = fn()
    if (result === false) {
      console.log(`  ❌ ${label}`)
      issues++
    } else {
      console.log(`  ✅ ${label}`)
    }
  } catch (err) {
    console.log(`  ❌ ${label}: ${err.message}`)
    issues++
  }
}

console.log('\n🔍 improve-agent processor audit\n')

// 1. Handler exists and uses direct-write (not dev-task) pattern
console.log('1. Handler implementation')

check('strategic-review-handler.js exists', () => fs.existsSync(HANDLER_PATH))

check('handler uses appendFileSync (direct-write, not dev task)', () => {
  const src = fs.readFileSync(HANDLER_PATH, 'utf-8')
  return src.includes('appendFileSync')
})

check('handler uses content-based dedup (existingContent.includes)', () => {
  const src = fs.readFileSync(HANDLER_PATH, 'utf-8')
  return src.includes('existingContent.includes(shortDesc)')
})

check('handler does NOT create dev tasks for improve-agent (old phantom pattern removed)', () => {
  const src = fs.readFileSync(HANDLER_PATH, 'utf-8')
  return !src.includes("findTaskByTitle(`Improve: ${targetAgent} agent instructions")
})

check('handler prefers RULES.md (Tier 1) over SOUL.md (Tier 2)', () => {
  const src = fs.readFileSync(HANDLER_PATH, 'utf-8')
  return src.includes('rulesPath') && src.includes('RULES.md')
})

// 2. Workspace files exist and have been written to recently
console.log('\n2. Workspace files')

const staleCutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000

for (const agent of AGENTS) {
  const workspaceDir = path.join(os.homedir(), '.openclaw', `workspace-${agent}`)
  const rulesPath = path.join(workspaceDir, 'RULES.md')
  const soulPath = path.join(workspaceDir, 'SOUL.md')

  const rulesExists = fs.existsSync(rulesPath)
  const soulExists = fs.existsSync(soulPath)

  check(`workspace-${agent}/RULES.md exists`, () => rulesExists)
  check(`workspace-${agent}/SOUL.md exists`, () => soulExists)

  if (rulesExists) {
    const mtime = fs.statSync(rulesPath).mtimeMs
    const ageDays = Math.round((Date.now() - mtime) / (24 * 60 * 60 * 1000))
    check(`workspace-${agent}/RULES.md modified within ${STALE_DAYS}d (age: ${ageDays}d)`, () => mtime > staleCutoff)
  }
}

// 3. No unprocessed ORCHESTRATOR-DECISIONS files
console.log('\n3. Unprocessed decision files')

if (!fs.existsSync(COMPLETION_DIR)) {
  check('completion-reports/ directory exists', () => false)
} else {
  const all = fs.readdirSync(COMPLETION_DIR)
  const unprocessed = all.filter(f =>
    f.startsWith('ORCHESTRATOR-DECISIONS-') && f.endsWith('.json') &&
    !f.startsWith('PROCESSED-')
  )
  const processed = all.filter(f => f.startsWith('PROCESSED-ORCHESTRATOR-DECISIONS-'))

  check(`no unprocessed ORCHESTRATOR-DECISIONS files (found ${unprocessed.length})`, () => unprocessed.length === 0)

  if (unprocessed.length > 0) {
    console.log(`     unprocessed: ${unprocessed.join(', ')}`)
  }
  console.log(`  ℹ️  ${processed.length} processed files found`)
}

// Summary
console.log(`\n${issues === 0 ? '✅' : '❌'} ${issues === 0 ? 'All checks passed' : `${issues} issue(s) found`}\n`)
process.exit(issues === 0 ? 0 : 1)
