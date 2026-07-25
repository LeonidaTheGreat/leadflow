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

if (failed > 0) {
  console.log('\nFailed checks = improve-agent instructions not yet applied.')
  console.log('Root cause: check ~/projects/genome/intelligence/strategic-review-handler.js')
  console.log('Fix: handler must write directly to workspace files, not create a dev task.')
  process.exit(1)
}

process.exit(0)
