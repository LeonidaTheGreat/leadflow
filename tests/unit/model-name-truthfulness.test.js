'use strict'

/**
 * Verifies that no stale AI model names appear in user-facing dashboard code.
 * "Claude 3.5 Sonnet" was the old claim; production runs claude-haiku-4-5 or qwen3.5-14b.
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')
const { execSync } = require('child_process')

const DASHBOARD_APP = path.resolve(__dirname, '../../product/lead-response/dashboard/app')
const DASHBOARD_COMPONENTS = path.resolve(__dirname, '../../product/lead-response/dashboard/components')
const DASHBOARD_LIB = path.resolve(__dirname, '../../product/lead-response/dashboard/lib')

function grepDir(dir, pattern) {
  try {
    const result = execSync(
      `grep -r --include="*.ts" --include="*.tsx" -l "${pattern}" "${dir}" 2>/dev/null || true`
    ).toString().trim()
    return result ? result.split('\n').filter(Boolean) : []
  } catch {
    return []
  }
}

function run(name, fn) {
  total++
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`)
  }
}

let passed = 0
let total = 0

console.log('Model Name Truthfulness Tests\n')

run('no "Claude 3.5 Sonnet" copy in dashboard app/', () => {
  const matches = grepDir(DASHBOARD_APP, 'Claude 3\\.5 Sonnet')
  assert.deepStrictEqual(matches, [], `Found stale model copy in: ${matches.join(', ')}`)
})

run('no "Claude 3.5 Sonnet" copy in dashboard components/', () => {
  const matches = grepDir(DASHBOARD_COMPONENTS, 'Claude 3\\.5 Sonnet')
  assert.deepStrictEqual(matches, [], `Found stale model copy in: ${matches.join(', ')}`)
})

run('no stale claude-3-5-sonnet fallback string in components', () => {
  const matches = grepDir(DASHBOARD_COMPONENTS, 'claude-3-5-sonnet')
  assert.deepStrictEqual(matches, [], `Found stale fallback model in: ${matches.join(', ')}`)
})

run('ANTHROPIC_FALLBACK_MODEL in lib/ai.ts is claude-haiku-4-5', () => {
  const aiTs = fs.readFileSync(path.join(DASHBOARD_LIB, 'ai.ts'), 'utf8')
  assert.ok(
    aiTs.includes("ANTHROPIC_FALLBACK_MODEL = 'claude-haiku-4-5'"),
    'Expected ANTHROPIC_FALLBACK_MODEL to be claude-haiku-4-5'
  )
})

run('demo routes do not reference deprecated claude-3-haiku-20240307', () => {
  const matches = grepDir(DASHBOARD_APP, 'claude-3-haiku-20240307')
  assert.deepStrictEqual(matches, [], `Found deprecated model ID in: ${matches.join(', ')}`)
})

console.log(`\n${passed}/${total} tests passed`)

if (passed < total) process.exit(1)
