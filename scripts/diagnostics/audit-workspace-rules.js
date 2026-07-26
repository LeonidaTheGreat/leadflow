#!/usr/bin/env node
'use strict'
/**
 * audit-workspace-rules.js
 * Verifies that agent workspace files contain expected rules from improve-agent directives.
 *
 * If this exits non-zero, improve-agent instructions were not applied — check
 * ~/projects/genome/intelligence/strategic-review-handler.js for the handler bug.
 *
 * Usage: node scripts/diagnostics/audit-workspace-rules.js
 */

const fs = require('fs')
const path = require('path')
const os = require('os')

// Source-code checks: verify genome role-context.js contains expected QC prompt additions
const GENOME_CHECKS = [
  {
    file: path.join(os.homedir(), 'projects/genome/core/food/role-context.js'),
    rules: [
      {
        id: 'qc-parent-task-check-in-spawn-role',
        pattern: /PARENT TASK STATUS CHECK|parent.*task.*status.*before.*checking.*out/i,
        description: 'QC spawnRole has parent task status check (role-context.js)'
      }
    ]
  }
]

const CHECKS = [
  {
    workspace: 'workspace-dev',
    files: ['RULES.md', 'SOUL.md'],
    rules: [
      {
        id: 'git-network-resilience',
        pattern: /GIT NETWORK RESILIENCE|git.*(retry|HTTPS fallback).*(timeout|remote)/i,
        description: 'Git network resilience / HTTPS fallback retry rule'
      },
      {
        id: 'reopened-fix-guard',
        pattern: /REOPENED FIX GUARD|root cause.*reopened|original fix.*reopened/i,
        description: 'Reopened fix guard (must read prior fix before retrying)'
      },
      {
        id: 'phantom-completion',
        pattern: /PHANTOM COMPLETION|reportSuccess.*without.*push/i,
        description: 'Phantom completion prohibition rule'
      },
      {
        id: 'gate-fix-precheck',
        pattern: /GATE.FIX PRE.CHECK|gate.*already.*pass/i,
        description: 'Gate-fix pre-check (verify gate still fails before coding)'
      }
    ]
  },
  {
    workspace: 'workspace-qc',
    files: ['RULES.md', 'SOUL.md'],
    rules: [
      {
        id: 'parent-task-check',
        pattern: /PARENT TASK STATUS CHECK|parent.*task.*status|upstream.*dev.*failed/i,
        description: 'Parent task status check (self-cancel if upstream dev failed)'
      },
      {
        id: 'dedup-pr-check',
        pattern: /DEDUP PR CHECK|QC already completed.*PR|duplicate.*QC.*review/i,
        description: 'Dedup PR check (skip if QC already done for this PR)'
      },
      {
        id: 'verdict-format',
        pattern: /VERDICT: APPROVE|VERDICT: REJECT/i,
        description: 'Verdict format rule (standalone line in completion report)'
      }
    ]
  }
]

let passed = 0
let failed = 0
const results = []

for (const check of GENOME_CHECKS) {
  let content = ''
  try {
    content = fs.readFileSync(check.file, 'utf-8')
  } catch {
    content = ''
  }
  for (const rule of check.rules) {
    if (rule.pattern.test(content)) {
      passed++
      results.push(`  ✓ [genome] ${rule.description}`)
    } else {
      failed++
      results.push(`  ✗ [genome] MISSING: ${rule.description} (id: ${rule.id})`)
    }
  }
}

for (const check of CHECKS) {
  const workspaceDir = path.join(os.homedir(), '.openclaw', check.workspace)

  const content = check.files
    .map(f => {
      const filePath = path.join(workspaceDir, f)
      try {
        return fs.readFileSync(filePath, 'utf-8')
      } catch {
        return ''
      }
    })
    .join('\n')

  for (const rule of check.rules) {
    if (rule.pattern.test(content)) {
      passed++
      results.push(`  ✓ [${check.workspace}] ${rule.description}`)
    } else {
      failed++
      results.push(`  ✗ [${check.workspace}] MISSING: ${rule.description} (id: ${rule.id})`)
    }
  }
}

console.log('\n=== Workspace Rules Audit ===\n')
results.forEach(r => console.log(r))
console.log(`\nResult: ${passed} passed, ${failed} failed`)

// Workspace file modification timestamps — key diagnostic for "handler ran but no effect" issues.
// Compare these against task completion timestamps to confirm writes happened after tasks closed.
console.log('\n=== Workspace File Timestamps ===\n')
const WORKSPACE_FILES = [
  ['workspace-dev', 'RULES.md'],
  ['workspace-dev', 'SOUL.md'],
  ['workspace-qc', 'RULES.md'],
  ['workspace-qc', 'SOUL.md']
]
for (const [ws, f] of WORKSPACE_FILES) {
  const filePath = path.join(os.homedir(), '.openclaw', ws, f)
  try {
    const stat = fs.statSync(filePath)
    console.log(`  ${ws}/${f}: last modified ${stat.mtime.toISOString()} (${Math.round((Date.now() - stat.mtime) / 60000)}m ago)`)
  } catch {
    console.log(`  ${ws}/${f}: NOT FOUND`)
  }
}

// Handler integrity check — confirm genome handler uses direct writes, not dev tasks.
// A handler that creates dev tasks causes phantom completions (dev runs in worktree,
// can't reach ~/.openclaw/workspace-* paths, marks done without writing anything).
console.log('\n=== Handler Integrity Check ===\n')
const handlerPath = path.join(os.homedir(), 'projects/genome/intelligence/strategic-review-handler.js')
let handlerOk = false
try {
  const src = fs.readFileSync(handlerPath, 'utf-8')
  const usesDirectWrite = src.includes('appendFileSync')
  const usesContentDedup = src.includes('existingContent.includes(shortDesc)')
  const prefersRulesMd = src.includes('RULES.md') && src.includes('rulesPath')
  handlerOk = usesDirectWrite && usesContentDedup && prefersRulesMd
  if (handlerOk) {
    console.log('  ✓ Handler writes directly to workspace files (not dev tasks)')
    console.log('  ✓ Handler uses content-based dedup')
    console.log('  ✓ Handler prefers RULES.md (Tier 1) over SOUL.md')
  } else {
    console.log('  ✗ HANDLER BROKEN — check ~/projects/genome/intelligence/strategic-review-handler.js')
    if (!usesDirectWrite) console.log('    missing: appendFileSync (direct write)')
    if (!usesContentDedup) console.log('    missing: content-based dedup')
    if (!prefersRulesMd) console.log('    missing: RULES.md preference')
  }
} catch (err) {
  console.log(`  ✗ Handler not found at ${handlerPath}: ${err.message}`)
}

if (failed > 0 || !handlerOk) {
  if (failed > 0) {
    console.log('\nFailed rule checks = improve-agent instructions not yet applied.')
    console.log('Root cause: check ~/projects/genome/intelligence/strategic-review-handler.js')
    console.log('Fix: handler must write directly to workspace files, not create a dev task.')
  }
  if (!handlerOk) {
    console.log('\nHandler integrity check failed — improve-agent writes will be no-ops until fixed.')
  }
  process.exit(1)
}

process.exit(0)
