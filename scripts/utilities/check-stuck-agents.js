#!/usr/bin/env node
/**
 * check-stuck-agents.js — Onboarding Stuck Agent Alert Runner
 *
 * Calls OnboardingTelemetryService.checkAndAlertStuckAgents().
 * Identifies real estate agents stuck in the onboarding funnel for >24 hours
 * and creates/updates rows in onboarding_stuck_alerts + product_feedback.
 *
 * This script is the LOCAL/DEV entry point for the stuck-agent check.
 * In production, this is triggered via the Vercel cron job:
 *   /api/cron/check-stuck-agents (schedule: "0 * * * *" — every hour)
 *
 * Usage:
 *   node scripts/utilities/check-stuck-agents.js
 *
 * Also callable programmatically:
 *   const { run } = require('./scripts/utilities/check-stuck-agents')
 *   await run()
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })

const { createClient } = require('../../lib/db')
const OnboardingTelemetryService = require('../../lib/services/OnboardingTelemetryService')

const apiUrl = process.env.NEXT_PUBLIC_API_URL
const apiKey = process.env.API_SECRET_KEY

if (!apiUrl || !apiKey) {
  console.error('[check-stuck-agents] Missing NEXT_PUBLIC_API_URL or API_SECRET_KEY')
  process.exit(1)
}

const db = createClient(apiUrl, apiKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/**
 * Run the stuck-agent check and log results.
 * Returns the result object from checkAndAlertStuckAgents().
 */
async function run() {
  console.log('[check-stuck-agents] Starting stuck agent check...')
  const startedAt = Date.now()

  const telemetryService = new OnboardingTelemetryService(db)
  const result = await telemetryService.checkAndAlertStuckAgents()

  const elapsed = Date.now() - startedAt

  if (!result.success) {
    console.error(`[check-stuck-agents] Failed: ${result.error}`)
    return result
  }

  console.log(
    `[check-stuck-agents] Complete in ${elapsed}ms. ` +
    `Alerts created/updated: ${result.alerts_created}`
  )

  if (result.alerts && result.alerts.length > 0) {
    console.log('[check-stuck-agents] Alert details:')
    result.alerts.forEach((alert, i) => {
      console.log(
        `  ${i + 1}. agent_id=${alert.agent_id}, step=${alert.step_name}, ` +
        `alert_count=${alert.alert_count || 1}`
      )
    })
  }

  return result
}

// Run standalone when executed directly
if (require.main === module) {
  run()
    .then((result) => {
      process.exit(result.success ? 0 : 1)
    })
    .catch((err) => {
      console.error('[check-stuck-agents] Unexpected error:', err)
      process.exit(1)
    })
}

module.exports = { run }
