#!/usr/bin/env node
/**
 * check-stuck-agents.js — Onboarding Stuck Agent Alert Runner
 *
 * Calls checkAndAlertStuckAgents() from lib/onboarding-telemetry.js.
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

const { createClient } = require('@supabase/supabase-js')
const { checkAndAlertStuckAgents } = require('../../lib/onboarding-telemetry')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('[check-stuck-agents] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/**
 * Run the stuck-agent check and log results.
 * Returns the result object from checkAndAlertStuckAgents().
 */
async function run() {
  console.log('[check-stuck-agents] Starting stuck agent check...')
  const startedAt = Date.now()

  const result = await checkAndAlertStuckAgents(supabase)

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
