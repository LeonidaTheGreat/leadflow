#!/usr/bin/env node
/**
 * distribution-collector.js — Distribution Loop (Loop 6)
 *
 * Collects traffic/signup data from available sources and writes to
 * distribution_metrics. Detects distribution health problems and
 * creates use cases + tasks to fix them.
 *
 * Data sources (best-effort — each is optional):
 *   - Vercel Analytics API (page views, unique visitors)
 *   - PostHog (signup funnel, conversion events)
 *   - Stripe checkout sessions (conversion tracking)
 *
 * Usage:
 *   const { collectDistribution, checkDistributionHealth } = require('./scripts/distribution-collector')
 *   await collectDistribution()
 *   const issues = await checkDistributionHealth()
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const { getConfig } = require('../project-config-loader')

const config = getConfig()
const PROJECT_ID = config.project_id

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ── Data Collection ─────────────────────────────────────────────────────────

/**
 * Collect from PostHog if configured.
 * Returns { visitors, signups, funnelDropoffs } or null.
 */
async function collectFromPostHog() {
  const apiKey = process.env.POSTHOG_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  const host = process.env.POSTHOG_HOST || 'https://app.posthog.com'

  if (!apiKey || !projectId) {
    return null
  }

  try {
    // Get events from last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const response = await fetch(`${host}/api/projects/${projectId}/events?after=${since}&event=pageview&limit=1000`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    })

    if (!response.ok) return null
    const data = await response.json()

    const uniqueUsers = new Set()
    let pageviews = 0
    for (const event of data.results || []) {
      pageviews++
      if (event.distinct_id) uniqueUsers.add(event.distinct_id)
    }

    // Get signup events
    const signupResponse = await fetch(`${host}/api/projects/${projectId}/events?after=${since}&event=signup&limit=100`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    })
    const signupData = signupResponse.ok ? await signupResponse.json() : { results: [] }

    return {
      visitors: pageviews,
      unique_visitors: uniqueUsers.size,
      signups: (signupData.results || []).length
    }
  } catch (err) {
    console.warn('  PostHog collection failed:', err.message)
    return null
  }
}

/**
 * Collect checkout session data from Stripe (last 24h).
 */
async function collectFromStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return null

  try {
    const stripe = require('stripe')(stripeKey)
    const since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)

    const sessions = await stripe.checkout.sessions.list({
      created: { gte: since },
      limit: 100
    })

    const completed = sessions.data.filter(s => s.status === 'complete')
    return { conversions: completed.length }
  } catch (err) {
    console.warn('  Stripe checkout collection failed:', err.message)
    return null
  }
}

/**
 * Write collected metrics to distribution_metrics table.
 */
async function writeMetrics(data) {
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('distribution_metrics')
    .upsert({
      project_id: PROJECT_ID,
      channel_id: null, // aggregate across all channels
      date: today,
      visitors: data.visitors || 0,
      unique_visitors: data.unique_visitors || 0,
      signups: data.signups || 0,
      trials: data.trials || 0,
      conversions: data.conversions || 0,
      metadata: data.metadata || {}
    }, { onConflict: 'project_id,channel_id,date' })

  if (error) {
    console.warn('  Failed to write distribution_metrics:', error.message)
  }
}

// ── Distribution Health Check ───────────────────────────────────────────────

/**
 * Check distribution health and return issues that need addressing.
 * Each issue maps to a potential use case that the system should create.
 */
async function checkDistributionHealth() {
  const issues = []

  // 1. Check if a landing page exists (active distribution channel of type landing_page)
  const { data: landingPages } = await supabase
    .from('distribution_channels')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .eq('channel_type', 'landing_page')
    .eq('status', 'active')

  if (!landingPages || landingPages.length === 0) {
    issues.push({
      type: 'no_landing_page',
      severity: 'critical',
      message: 'No active landing page — visitors have nowhere to sign up',
      uc_template: 'landing-page'
    })
  }

  // 2. Check recent traffic (last 3 days)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: recentMetrics } = await supabase
    .from('distribution_metrics')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .gte('date', threeDaysAgo)
    .order('date', { ascending: false })

  const totalVisitors = (recentMetrics || []).reduce((sum, m) => sum + m.visitors, 0)
  const totalSignups = (recentMetrics || []).reduce((sum, m) => sum + m.signups, 0)

  if (totalVisitors === 0 && (landingPages && landingPages.length > 0)) {
    issues.push({
      type: 'zero_traffic',
      severity: 'high',
      message: 'Zero visitors in the last 3 days — need traffic generation',
      uc_template: 'content-marketing'
    })
  }

  // 3. Check conversion rate
  if (totalVisitors > 20 && totalSignups === 0) {
    issues.push({
      type: 'zero_signups',
      severity: 'high',
      message: `${totalVisitors} visitors but 0 signups in 3 days — conversion problem`,
      uc_template: 'conversion-optimization'
    })
  } else if (totalVisitors > 50) {
    const convRate = totalSignups / totalVisitors
    if (convRate < 0.02) {
      issues.push({
        type: 'low_conversion',
        severity: 'medium',
        message: `Landing page conversion ${(convRate * 100).toFixed(1)}% (target: 2%+)`,
        uc_template: 'conversion-optimization'
      })
    }
  }

  // 4. Check trial-to-paid conversion
  const { data: revenueData } = await supabase
    .from('revenue_metrics')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('date', { ascending: false })
    .limit(1)

  if (revenueData && revenueData.length > 0) {
    const r = revenueData[0]
    const totalUsers = r.active_subscribers + r.trial_users
    if (totalUsers > 5 && r.trial_users > 0) {
      const trialConversion = r.active_subscribers / totalUsers
      if (trialConversion < 0.10) {
        issues.push({
          type: 'low_trial_conversion',
          severity: 'medium',
          message: `Trial-to-paid ${(trialConversion * 100).toFixed(0)}% (target: 10%+)`,
          uc_template: 'onboarding-improvement'
        })
      }
    }
  }

  return issues
}

/**
 * Create use cases and tasks to address distribution issues.
 */
async function createDistributionTasks(issues) {
  if (issues.length === 0) return

  const { TaskStore } = require('../task-store')
  const store = new TaskStore()

  // Map distribution issue templates to seeded use case IDs (from seed-gtm-use-cases.js)
  const UC_WORKFLOWS = {
    'landing-page': { workflow: ['product', 'marketing', 'design', 'dev', 'qc'], name: 'Create Landing Page', use_case_id: 'gtm-landing-page' },
    'signup-flow': { workflow: ['product', 'design', 'dev', 'qc'], name: 'Build Signup Flow', use_case_id: 'gtm-signup-flow' },
    'onboarding-improvement': { workflow: ['product', 'design', 'dev', 'qc'], name: 'Improve Onboarding', use_case_id: 'gtm-onboarding' },
    'conversion-optimization': { workflow: ['analytics', 'product', 'dev', 'qc'], name: 'Optimize Conversion', use_case_id: 'gtm-conversion' },
    'content-marketing': { workflow: ['product', 'marketing', 'qc'], name: 'Content Marketing Campaign', use_case_id: 'gtm-content' }
  }

  for (const issue of issues) {
    const template = UC_WORKFLOWS[issue.uc_template]
    if (!template) continue

    const firstAgent = template.workflow[0]
    const AGENT_LABELS = config.agents.labels
    const label = AGENT_LABELS[firstAgent] || firstAgent

    const title = `${label}: Distribution — ${template.name}`
    await store.createTask({
      title,
      agent_id: firstAgent,
      status: 'ready',
      model: 'sonnet',
      priority: issue.severity === 'critical' ? 1 : 2,
      use_case_id: template.use_case_id || null,
      tags: ['distribution', 'automated', issue.severity],
      description: [
        `Distribution Issue: ${issue.message}`,
        '',
        `Template: ${issue.uc_template}`,
        `Use Case: ${template.use_case_id || 'N/A'}`,
        `Workflow: ${template.workflow.join(' → ')}`,
        `Severity: ${issue.severity}`,
        '',
        'This task was auto-created by the distribution health check (Loop 6).',
        'Analyze the issue and create a plan to address it.'
      ].join('\n'),
      metadata: {
        created_by: 'distribution-collector',
        issue_type: issue.type,
        uc_template: issue.uc_template
      }
    })

    console.log(`  Created task: ${title} (${issue.severity})`)
  }
}

// ── Main Entry Point ────────────────────────────────────────────────────────

async function collectDistribution() {
  console.log('[Distribution Collector] Starting...')

  // Collect from available sources
  const posthogData = await collectFromPostHog()
  const stripeData = await collectFromStripe()

  const aggregated = {
    visitors: posthogData?.visitors || 0,
    unique_visitors: posthogData?.unique_visitors || 0,
    signups: posthogData?.signups || 0,
    trials: 0,
    conversions: stripeData?.conversions || 0,
    metadata: {
      sources: {
        posthog: !!posthogData,
        stripe: !!stripeData
      }
    }
  }

  // Write metrics
  await writeMetrics(aggregated)
  console.log(`  Visitors: ${aggregated.visitors} | Signups: ${aggregated.signups} | Conversions: ${aggregated.conversions}`)

  console.log('[Distribution Collector] Done')
  return aggregated
}

module.exports = { collectDistribution, checkDistributionHealth, createDistributionTasks }

// Run standalone
if (require.main === module) {
  ;(async () => {
    await collectDistribution()
    const issues = await checkDistributionHealth()
    if (issues.length > 0) {
      console.log('\nDistribution issues found:')
      for (const issue of issues) {
        console.log(`  [${issue.severity}] ${issue.message}`)
      }
      await createDistributionTasks(issues)
    } else {
      console.log('\nNo distribution issues detected')
    }
  })().catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })
}
