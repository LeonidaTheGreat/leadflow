#!/usr/bin/env node
/**
 * QC Behavior Test: Distribution Health Error Handling
 * Task ID (dev): 5452935c-068d-458b-9c71-dce15c7eb121
 * QC Task ID:    0aac7a36-f9c9-47ca-afe9-5a23df238cec
 *
 * Complements the dev's static-analysis test by verifying structural invariants
 * that ensure the error path actually prevents false-positive task creation.
 */

const assert = require('assert').strict
const fs = require('fs')

const COLLECTOR_PATH = require('path').join(require('os').homedir(), '.openclaw', 'genome', 'scripts', 'distribution-collector.js')
const source = fs.readFileSync(COLLECTOR_PATH, 'utf8')

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

console.log('=== QC Behavior Test: Distribution Health Error Handling ===\n')

// Extract checkDistributionHealth body
const fnMatch = source.match(/async function checkDistributionHealth\(\) \{([\s\S]*?)return issues\n\}/)
assert.ok(fnMatch, 'checkDistributionHealth() not found in distribution-collector.js')
const fnBody = fnMatch[1]

test('catch block is positioned BEFORE the no_landing_page issues.push', () => {
  const catchIdx = fnBody.indexOf('catch (error)')
  const pushIdx = fnBody.indexOf("type: 'no_landing_page'")
  assert.notEqual(catchIdx, -1, 'catch (error) not found in function body')
  assert.notEqual(pushIdx, -1, "issues.push for 'no_landing_page' not found")
  assert.ok(catchIdx < pushIdx,
    `catch block must come before the no_landing_page push — ` +
    `currently catch at char ${catchIdx}, push at char ${pushIdx}`)
})

test('catch block contains return [] before its closing brace', () => {
  const catchStart = fnBody.indexOf('catch (error) {')
  assert.notEqual(catchStart, -1, 'catch (error) { not found')
  // Find the matching closing brace
  let depth = 0
  let catchClose = -1
  for (let i = catchStart + 'catch (error) {'.length - 1; i < fnBody.length; i++) {
    if (fnBody[i] === '{') depth++
    else if (fnBody[i] === '}') {
      depth--
      if (depth === 0) { catchClose = i; break }
    }
  }
  assert.notEqual(catchClose, -1, 'Could not find closing brace of catch block')
  const catchBlock = fnBody.slice(catchStart, catchClose + 1)
  assert.ok(catchBlock.includes('return []'),
    'catch block must contain return [] to prevent false-positive issues on query failure')
})

test('success path return issues still exists outside the catch block', () => {
  // Strip the catch block to check the main flow still returns issues
  const withoutCatch = fnBody.replace(/catch \(error\) \{[\s\S]*?\n  \}/, '')
  assert.ok(!withoutCatch.includes('return []'),
    'return [] should not appear outside the catch block (would short-circuit success path)')
})

test('module exports include checkDistributionHealth', () => {
  const exportsLine = source.match(/module\.exports\s*=\s*\{([^}]+)\}/)
  assert.ok(exportsLine, 'module.exports not found')
  assert.ok(exportsLine[1].includes('checkDistributionHealth'),
    'checkDistributionHealth must be exported from distribution-collector.js')
})

console.log(`\n=== QC Test Summary ===`)
console.log(`✅ Passed: ${pass}`)
console.log(`❌ Failed: ${fail}`)
if (fail > 0) {
  process.exit(1)
}
