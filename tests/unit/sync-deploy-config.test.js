'use strict'

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

const {
  DEPLOYMENT_CONFIG,
  BROWSER_TESTS_CONFIG,
  syncConfigObject,
  runSync
} = require('../../scripts/sync-deploy-config')

function testBackfillsBrowserTestsAndDeployment() {
  const input = {
    deployment: { platform: 'old' },
    browser_tests: {
      command: BROWSER_TESTS_CONFIG.command,
      base_url: BROWSER_TESTS_CONFIG.base_url,
      interval_hours: 6,
      priority_on_failure: 1
    }
  }

  const { config, changed } = syncConfigObject(input)
  assert.equal(changed, true)
  assert.deepEqual(config.deployment, DEPLOYMENT_CONFIG)
  assert.deepEqual(config.browser_tests, BROWSER_TESTS_CONFIG)
}

function testIdempotentWhenAlreadyCorrect() {
  const input = {
    deployment: DEPLOYMENT_CONFIG,
    browser_tests: BROWSER_TESTS_CONFIG
  }

  const { config, changed } = syncConfigObject(input)
  assert.equal(changed, false)
  assert.deepEqual(config, input)
}

function testRunSyncWritesOnlyWhenChanged() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-deploy-config-'))
  const configPath = path.join(dir, 'project.config.json')

  const baseline = {
    deployment: { foo: 'bar' },
    browser_tests: { enabled: false }
  }

  fs.writeFileSync(configPath, JSON.stringify(baseline, null, 2))
  const changedFirst = runSync(configPath)
  assert.equal(changedFirst, true)

  const written = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  assert.deepEqual(written.deployment, DEPLOYMENT_CONFIG)
  assert.deepEqual(written.browser_tests, BROWSER_TESTS_CONFIG)

  const changedSecond = runSync(configPath)
  assert.equal(changedSecond, false)

  fs.rmSync(dir, { recursive: true, force: true })
}

function run() {
  testBackfillsBrowserTestsAndDeployment()
  testIdempotentWhenAlreadyCorrect()
  testRunSyncWritesOnlyWhenChanged()
  console.log('PASS sync-deploy-config unit tests')
}

run()
