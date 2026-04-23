#!/usr/bin/env node
/**
 * QC Test Suite: Distribution Health Error Handling
 * Task ID: 5452935c-068d-458b-9c71-dce15c7eb121
 *
 * Verifies that checkDistributionHealth() safely handles distribution_channels
 * query failures by returning an empty issues array instead of creating
 * false-positive no_landing_page tasks.
 */

const fs = require('fs')
const assert = require('assert').strict

const COLLECTOR_PATH = '/Users/clawdbot/.openclaw/genome/scripts/distribution-collector.js'

console.log('=== QC Test Suite: Distribution Health Error Handling ===\n')

let passCount = 0
let failCount = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passCount++
  } catch (err) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   ${err.message}`)
    failCount++
  }
}

const sourceCode = fs.readFileSync(COLLECTOR_PATH, 'utf8')
const functionMatch = sourceCode.match(/async function checkDistributionHealth\(\) \{[\s\S]*?return issues\n\}/)

if (!functionMatch) {
  console.error('Unable to locate checkDistributionHealth() in distribution-collector.js')
  process.exit(1)
}

const functionSource = functionMatch[0]
const channelQueryMatch = functionSource.match(/\/\/ 1\. Check if a landing page exists[\s\S]*?const lpError = !landingPages \|\| landingPages.length === 0;/)

if (!channelQueryMatch) {
  console.error('Unable to isolate landing-page query block in checkDistributionHealth()')
  process.exit(1)
}

const channelQueryBlock = channelQueryMatch[0]

test('SPEC: task spec comment block is present at top of collector file', () => {
  assert(sourceCode.includes('Task Spec — 5452935c-068d-458b-9c71-dce15c7eb121'), 'Spec comment block missing from collector file header')
})

test('AC4: landing-page query is wrapped in try/catch', () => {
  assert(channelQueryBlock.includes('try {'), 'Landing-page query should start inside a try block')
  assert(channelQueryBlock.includes('} catch (error) {'), 'Landing-page query should handle thrown query errors with catch')
})

test('AC4: catch block logs distribution_channels query failure context', () => {
  assert(channelQueryBlock.includes('Failed to query distribution_channels for landing page health check'), 'Catch block should log query failure context')
  assert(channelQueryBlock.includes('error.message'), 'Catch block should log the query error message')
})

test('AC4: catch block returns empty issues array on query failure', () => {
  const catchBlock = channelQueryBlock.match(/catch \(error\) \{[\s\S]*?return \[\]/)
  assert(catchBlock, 'Catch block should return [] when the distribution_channels query fails')
})

test('AC4: no_landing_page issue still depends on landingPages length when query succeeds', () => {
  assert(channelQueryBlock.includes('const lpError = !landingPages || landingPages.length === 0;'), 'Missing landing page issue should still be based on empty landingPages results')
})

test('AC4: distribution_channels query still targets landing_page rows for the current project', () => {
  assert(channelQueryBlock.includes(".from('distribution_channels')"), 'Should still query distribution_channels')
  assert(channelQueryBlock.includes(".eq('project_id', PROJECT_ID)"), 'Should still scope the query to PROJECT_ID')
  assert(channelQueryBlock.includes(".eq('channel_type', 'landing_page')"), 'Should still scope the query to landing_page channels')
})

console.log(`\n=== Test Summary ===`)
console.log(`✅ Passed: ${passCount}`)
console.log(`❌ Failed: ${failCount}`)
console.log(`📈 Pass Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`)

if (failCount > 0) {
  console.error('\n⚠️  Some tests failed. Review the implementation.')
  process.exit(1)
} else {
  console.log('\n✅ All requirements verified!')
}
