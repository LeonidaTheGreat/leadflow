#!/usr/bin/env node
/**
 * Feedback Collector — Product Iteration Loop
 *
 * Collects feedback from multiple sources into the product_feedback table:
 *   1. E2E test failures (from e2e_test_specs table)
 *   2. Funnel drop-offs (from PostHog if configured)
 *   3. Manual pilot user feedback (already stored directly)
 *
 * Run daily via cron:
 *   0 6 * * * cd /Users/clawdbot/projects/leadflow && node scripts/feedback-collector.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const PROJECT_ID = 'bo2026'

async function collectE2EFailures() {
  console.log('Checking E2E test failures...')
  const { data: failingTests, error } = await supabase
    .from('e2e_test_specs')
    .select('*')
    .eq('last_result', 'fail')

  if (error) {
    console.warn('  Could not query e2e_test_specs:', error.message)
    return 0
  }

  let inserted = 0
  for (const test of failingTests || []) {
    // Avoid duplicate feedback for same test
    const { data: existing } = await supabase
      .from('product_feedback')
      .select('id')
      .eq('project_id', PROJECT_ID)
      .eq('source', 'analytics')
      .eq('feedback_type', 'bug_report')
      .contains('data', { test_name: test.test_name })
      .eq('processed', false)
      .limit(1)

    if (existing && existing.length > 0) continue

    await supabase.from('product_feedback').insert({
      project_id: PROJECT_ID,
      source: 'analytics',
      feedback_type: 'bug_report',
      data: {
        test_name: test.test_name,
        use_case_id: test.use_case_id,
        test_file: test.test_file,
        test_spec: test.test_spec,
        last_run: test.last_run
      }
    })
    console.log(`  Feedback created: failing test "${test.test_name}"`)
    inserted++
  }
  return inserted
}

async function collectPostHogFunnels() {
  const posthogKey = process.env.POSTHOG_API_KEY
  if (!posthogKey) {
    console.log('PostHog not configured, skipping funnel check')
    return 0
  }

  // Placeholder: query PostHog API for funnel drop-off events
  // In production this would call the PostHog trends/funnels API
  console.log('PostHog funnel check: not yet implemented')
  return 0
}

async function run() {
  console.log(`Feedback Collector — ${new Date().toISOString()}`)
  console.log('='.repeat(50))

  const e2eCount = await collectE2EFailures()
  const funnelCount = await collectPostHogFunnels()

  console.log(`\nDone: ${e2eCount} E2E failures, ${funnelCount} funnel issues`)
}

run().catch(err => {
  console.error('Feedback collector failed:', err)
  process.exit(1)
})
