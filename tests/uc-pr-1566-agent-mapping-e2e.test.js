'use strict'

const assert = require('assert')
const { spawnSync } = require('child_process')

const command = [
  '--prefix',
  'product/lead-response/dashboard',
  'test',
  '--',
  '--runInBand',
  '--runTestsByPath',
  '__tests__/agent-mapper.test.ts',
  '__tests__/inbound-sms-service.test.ts',
]

const result = spawnSync('npm', command, {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: process.env,
})

process.stdout.write(result.stdout || '')
process.stderr.write(result.stderr || '')

assert.strictEqual(
  result.status,
  0,
  `Expected targeted agent mapping tests to pass, got exit code ${result.status}`
)

console.log('uc-pr-1566-agent-mapping-e2e: PASS')
