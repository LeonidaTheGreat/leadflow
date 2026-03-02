#!/usr/bin/env node
/**
 * deploy-safety.js — Deployment Safety Net
 *
 * Wraps the deploy process with pre/post safety checks:
 *   1. Pre-deploy: snapshot current commit hash + smoke test results
 *   2. Deploy: run the configured deploy command
 *   3. Post-deploy: run smoke tests within 2 minutes
 *   4. If smoke tests fail: auto-revert + redeploy
 *
 * Usage:
 *   const { safeDeploy } = require('./orchestrator/deploy-safety')
 *   const result = await safeDeploy()  // { success, deployedCommit, revertedTo? }
 *
 * Standalone:
 *   node orchestrator/deploy-safety.js
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { getConfig, getDashboardDir } = require('../project-config-loader')

const DEPLOY_STATE_PATH = path.join(__dirname, '..', '.deploy-safety-state.json')

/**
 * Load deploy state from disk.
 */
function loadDeployState() {
  try {
    if (fs.existsSync(DEPLOY_STATE_PATH)) {
      return JSON.parse(fs.readFileSync(DEPLOY_STATE_PATH, 'utf-8'))
    }
  } catch {}
  return { lastGoodCommit: null, lastGoodAt: null, deployHistory: [] }
}

/**
 * Save deploy state to disk.
 */
function saveDeployState(state) {
  fs.writeFileSync(DEPLOY_STATE_PATH, JSON.stringify(state, null, 2))
}

/**
 * Get the current git commit hash in the dashboard directory.
 */
function getCurrentCommit(dashboardDir) {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: dashboardDir,
      encoding: 'utf-8',
      timeout: 5000
    }).trim()
  } catch {
    return null
  }
}

/**
 * Run smoke tests and return pass/fail.
 */
async function runSmokeTests() {
  const smokeTests = require('../smoke-tests')
  return smokeTests.runAll()
}

/**
 * Perform a safe deployment with automatic rollback on failure.
 *
 * @param {object} [options]
 * @param {number} [options.postDeployWaitMs=30000] - Time to wait after deploy before smoke test
 * @param {number} [options.maxRollbackAttempts=1] - Max number of rollback attempts
 * @returns {{ success: boolean, deployedCommit: string, revertedTo?: string, smokeResults?: object }}
 */
async function safeDeploy(options = {}) {
  const config = getConfig()
  const dashboardDir = getDashboardDir(config)
  const state = loadDeployState()
  const postDeployWaitMs = options.postDeployWaitMs || 30000
  const maxRollbackAttempts = options.maxRollbackAttempts || 1

  console.log('[Deploy Safety] Starting safe deployment...')

  // ── Step 1: Pre-deploy snapshot ────────────────────────────────────────

  const preDeployCommit = getCurrentCommit(dashboardDir)
  console.log(`  Pre-deploy commit: ${preDeployCommit?.slice(0, 8) || 'unknown'}`)

  // Run smoke tests to establish baseline
  const preResults = await runSmokeTests()
  const preCriticalFails = preResults.failed.filter(f => f.severity === 'critical')

  console.log(`  Pre-deploy smoke: ${preResults.passed.length} passed, ${preResults.failed.length} failed`)

  // ── Step 2: Deploy ─────────────────────────────────────────────────────

  let deployOutput
  try {
    console.log('  Deploying...')
    deployOutput = execSync(
      `${config.deployment.deploy_command} 2>&1`,
      { cwd: dashboardDir, encoding: 'utf-8', timeout: 120000 }
    )

    if (!deployOutput.includes('Production:') && !deployOutput.includes('Aliased:')) {
      console.warn('  Deploy output unexpected — proceeding with smoke test')
    }
  } catch (err) {
    console.error('  Deploy command failed:', err.message?.split('\n')[0])
    return { success: false, deployedCommit: preDeployCommit, error: 'deploy_command_failed' }
  }

  const postDeployCommit = getCurrentCommit(dashboardDir)
  console.log(`  Deployed commit: ${postDeployCommit?.slice(0, 8) || 'unknown'}`)

  // ── Step 3: Post-deploy smoke tests ────────────────────────────────────

  // Wait for deployment to propagate
  console.log(`  Waiting ${postDeployWaitMs / 1000}s for deploy propagation...`)
  await new Promise(resolve => setTimeout(resolve, postDeployWaitMs))

  const postResults = await runSmokeTests()
  const postCriticalFails = postResults.failed.filter(f => f.severity === 'critical')

  console.log(`  Post-deploy smoke: ${postResults.passed.length} passed, ${postResults.failed.length} failed`)

  // ── Step 4: Evaluate and potentially rollback ──────────────────────────

  // Only rollback if new critical failures appeared (that weren't failing before)
  const preCriticalIds = new Set(preCriticalFails.map(f => f.id))
  const newCriticalFails = postCriticalFails.filter(f => !preCriticalIds.has(f.id))

  if (newCriticalFails.length === 0) {
    // Deploy succeeded
    console.log('  ✅ Deploy verified — smoke tests pass')

    state.lastGoodCommit = postDeployCommit
    state.lastGoodAt = new Date().toISOString()
    state.deployHistory.push({
      commit: postDeployCommit,
      at: new Date().toISOString(),
      result: 'success'
    })
    // Keep only last 50 deploy records
    if (state.deployHistory.length > 50) state.deployHistory = state.deployHistory.slice(-50)
    saveDeployState(state)

    return { success: true, deployedCommit: postDeployCommit, smokeResults: postResults }
  }

  // ── Rollback ───────────────────────────────────────────────────────────

  console.warn(`  ❌ ${newCriticalFails.length} new critical failure(s) after deploy — rolling back`)
  for (const fail of newCriticalFails) {
    console.warn(`     ${fail.id}: ${fail.detail}`)
  }

  const rollbackTarget = state.lastGoodCommit || preDeployCommit
  if (!rollbackTarget) {
    console.error('  Cannot rollback — no known good commit')
    return { success: false, deployedCommit: postDeployCommit, error: 'no_rollback_target', smokeResults: postResults }
  }

  for (let attempt = 1; attempt <= maxRollbackAttempts; attempt++) {
    console.log(`  Rollback attempt ${attempt}: reverting to ${rollbackTarget.slice(0, 8)}...`)

    try {
      // Create a revert commit
      execSync(`git revert --no-edit ${postDeployCommit}`, {
        cwd: dashboardDir,
        encoding: 'utf-8',
        timeout: 30000
      })

      // Redeploy
      execSync(
        `${config.deployment.deploy_command} 2>&1`,
        { cwd: dashboardDir, encoding: 'utf-8', timeout: 120000 }
      )

      // Wait and verify
      await new Promise(resolve => setTimeout(resolve, postDeployWaitMs))
      const rollbackResults = await runSmokeTests()
      const rollbackCriticalFails = rollbackResults.failed.filter(f => f.severity === 'critical')
      const stillNewFails = rollbackCriticalFails.filter(f => !preCriticalIds.has(f.id))

      if (stillNewFails.length === 0) {
        console.log('  ✅ Rollback successful — smoke tests pass')
        state.deployHistory.push({
          commit: postDeployCommit,
          at: new Date().toISOString(),
          result: 'rolled_back',
          rollback_to: rollbackTarget
        })
        saveDeployState(state)
        return { success: false, deployedCommit: postDeployCommit, revertedTo: rollbackTarget, smokeResults: rollbackResults }
      }
    } catch (err) {
      console.error(`  Rollback attempt ${attempt} failed:`, err.message?.split('\n')[0])
    }
  }

  console.error('  ❌ All rollback attempts failed')
  state.deployHistory.push({
    commit: postDeployCommit,
    at: new Date().toISOString(),
    result: 'rollback_failed'
  })
  saveDeployState(state)

  return { success: false, deployedCommit: postDeployCommit, error: 'rollback_failed', smokeResults: postResults }
}

module.exports = { safeDeploy, loadDeployState, saveDeployState }

if (require.main === module) {
  safeDeploy().then(result => {
    console.log('\nResult:', JSON.stringify(result, null, 2))
    process.exit(result.success ? 0 : 1)
  }).catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })
}
