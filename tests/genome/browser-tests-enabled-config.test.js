'use strict'
/**
 * Task Spec (779853df-51a7-4711-9625-a96220c880ea)
 * What:
 * - Add test: tests/genome/browser-tests-enabled-config.test.js
 * - Update config: project.config.json browser_tests.enabled=true
 * Verify:
 * - npm test passes and this test confirms browser_tests.enabled is true.
 * - Manual run of TestRunnerLoop.runBrowserTests() no longer prints
 *   "Skipping — browser tests not enabled in config" due to missing flag.
 * - npm run build, npm run lint, npm audit --audit-level=high pass.
 * Boundaries:
 * - Do not alter heartbeat step order or any unrelated genome loop behavior.
 * - Do not modify routes/services/business logic for LeadFlow product APIs.
 */

const fs = require('fs')
const path = require('path')

describe('project.config browser_tests', () => {
  test('explicitly enables browser tests for heartbeat step 5d6', () => {
    const cfgPath = path.join(__dirname, '..', '..', 'project.config.json')
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))

    expect(cfg.browser_tests).toBeDefined()
    expect(cfg.browser_tests.enabled).toBe(true)
  })
})
