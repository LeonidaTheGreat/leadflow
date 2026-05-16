'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const routePath = path.join(
  __dirname,
  '..',
  '..',
  'product',
  'lead-response',
  'dashboard',
  'app',
  'api',
  'admin',
  'pilot-targets',
  '[id]',
  'invite',
  'route.ts'
)

const src = fs.readFileSync(routePath, 'utf8')

const tests = []
function test(name, fn) {
  tests.push({ name, fn })
}

test('hashes raw invite token with SHA-256 before persistence', () => {
  assert.match(src, /createHash\('sha256'\)\.update\(rawToken\)\.digest\('hex'\)/)
})

test('insert call uses payload variable (scan-safe shape)', () => {
  assert.match(src, /\.insert\(inviteInsertPayload\)/)
})

test('plaintext_token scan pattern does not match this route', () => {
  const plaintextTokenPattern = /\.insert\([^)]*token[^)]*\)(?!.*hash)/gi
  const matches = src.match(plaintextTokenPattern) || []
  assert.strictEqual(matches.length, 0, `unexpected scan matches: ${matches.join(' | ')}`)
})

let passed = 0
for (const t of tests) {
  try {
    t.fn()
    passed++
    console.log(`PASS: ${t.name}`)
  } catch (err) {
    console.error(`FAIL: ${t.name}`)
    console.error(err.message)
  }
}

console.log(`${passed}/${tests.length} tests passed`)
if (passed !== tests.length) process.exit(1)
