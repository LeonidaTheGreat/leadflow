#!/usr/bin/env node
/**
 * revenue-collector.js — Revenue Intelligence Loop (Loop 5)
 *
 * Runs every heartbeat. Pulls revenue data from Stripe, writes to
 * revenue_metrics and customer_events tables, checks goal progress,
 * and creates PM tasks when revenue is off-track.
 *
 * Data sources:
 *   - Stripe API: MRR, active subscriptions, recent events
 *   - project_goals table: target vs actual
 *
 * Usage:
 *   const { collectRevenue } = require('./scripts/revenue-collector')
 *   const result = await collectRevenue()
 *
 * Standalone:
 *   node scripts/revenue-collector.js
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

// ── Stripe Data Collection ──────────────────────────────────────────────────

/**
 * Pull current revenue metrics from Stripe.
 * Returns null if Stripe is not configured.
 */
async function collectFromStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    console.log('  Stripe not configured — skipping Stripe collection')
    return null
  }

  const stripe = require('stripe')(stripeKey)
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Get active subscriptions
  const subscriptions = await stripe.subscriptions.list({
    status: 'active',
    limit: 100
  })

  // Calculate MRR from active subscriptions
  let mrrCents = 0
  const planBreakdown = {}
  for (const sub of subscriptions.data) {
    for (const item of sub.items.data) {
      const amount = item.price.unit_amount || 0
      const interval = item.price.recurring?.interval
      // Normalize to monthly
      let monthly = amount
      if (interval === 'year') monthly = Math.round(amount / 12)
      if (interval === 'week') monthly = amount * 4
      mrrCents += monthly

      const planName = item.price.nickname || item.price.id
      planBreakdown[planName] = (planBreakdown[planName] || 0) + 1
    }
  }

  // Get trialing subscriptions
  const trials = await stripe.subscriptions.list({
    status: 'trialing',
    limit: 100
  })

  // Get recent events (last 24h)
  const recentEvents = await stripe.events.list({
    created: { gte: Math.floor(dayStart.getTime() / 1000) },
    limit: 50
  })

  const events = []
  let newSubscribers = 0
  let churnedCount = 0

  for (const event of recentEvents.data) {
    const sub = event.data?.object
    let eventType = null
    let mrrDelta = 0

    switch (event.type) {
      case 'customer.subscription.created':
        eventType = 'subscribe'
        mrrDelta = sub?.items?.data?.[0]?.price?.unit_amount || 0
        newSubscribers++
        break
      case 'customer.subscription.updated':
        // Check if it's an upgrade or downgrade
        if (event.data.previous_attributes?.items) {
          const oldAmount = event.data.previous_attributes.items?.data?.[0]?.price?.unit_amount || 0
          const newAmount = sub?.items?.data?.[0]?.price?.unit_amount || 0
          eventType = newAmount > oldAmount ? 'upgrade' : 'downgrade'
          mrrDelta = newAmount - oldAmount
        }
        break
      case 'customer.subscription.deleted':
        eventType = 'cancel'
        mrrDelta = -(sub?.items?.data?.[0]?.price?.unit_amount || 0)
        churnedCount++
        break
    }

    if (eventType) {
      events.push({
        project_id: PROJECT_ID,
        customer_id: sub?.customer || null,
        event_type: eventType,
        plan: sub?.items?.data?.[0]?.price?.nickname || null,
        mrr_delta_cents: mrrDelta,
        metadata: { stripe_event_id: event.id }
      })
    }
  }

  return {
    mrr_cents: mrrCents,
    active_subscribers: subscriptions.data.length,
    trial_users: trials.data.length,
    new_subscribers: newSubscribers,
    churned_count: churnedCount,
    conversion_rate: trials.data.length > 0
      ? subscriptions.data.length / (subscriptions.data.length + trials.data.length)
      : 0,
    arpu_cents: subscriptions.data.length > 0
      ? Math.round(mrrCents / subscriptions.data.length)
      : 0,
    plan_breakdown: planBreakdown,
    events
  }
}

// ── Write to Supabase ───────────────────────────────────────────────────────

async function writeRevenueMetrics(data) {
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('revenue_metrics')
    .upsert({
      project_id: PROJECT_ID,
      date: today,
      mrr_cents: data.mrr_cents,
      active_subscribers: data.active_subscribers,
      trial_users: data.trial_users,
      churned_count: data.churned_count,
      new_subscribers: data.new_subscribers,
      conversion_rate: data.conversion_rate,
      arpu_cents: data.arpu_cents,
      data: { plan_breakdown: data.plan_breakdown }
    }, { onConflict: 'project_id,date' })

  if (error) {
    console.warn('  Failed to write revenue_metrics:', error.message)
  }
}

async function writeCustomerEvents(events) {
  if (!events || events.length === 0) return

  const { error } = await supabase
    .from('customer_events')
    .insert(events)

  if (error) {
    console.warn('  Failed to write customer_events:', error.message)
  } else {
    console.log(`  Wrote ${events.length} customer event(s)`)
  }
}

// ── Goal Progress Checking ──────────────────────────────────────────────────

/**
 * Check progress toward project goals.
 * Returns array of goal status objects.
 */
async function checkGoalProgress(currentMetrics) {
  const { data: goals, error } = await supabase
    .from('project_goals')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .eq('status', 'active')

  if (error || !goals || goals.length === 0) {
    // If no goals in DB, seed from config
    if (!goals || goals.length === 0) {
      await seedGoalsFromConfig()
      return []
    }
    return []
  }

  const results = []

  for (const goal of goals) {
    let currentValue = 0

    switch (goal.goal_type) {
      case 'mrr':
        currentValue = currentMetrics ? currentMetrics.mrr_cents / 100 : 0
        break
      case 'subscribers':
        currentValue = currentMetrics ? currentMetrics.active_subscribers : 0
        break
      default:
        continue
    }

    const targetDate = new Date(goal.target_date)
    const now = new Date()
    const daysRemaining = Math.max(1, Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24)))
    const totalDays = Math.ceil((targetDate - new Date(config.reporting.day_zero)) / (1000 * 60 * 60 * 24))
    const daysElapsed = totalDays - daysRemaining
    const expectedProgress = daysElapsed / totalDays
    const actualProgress = currentValue / Number(goal.target_value)
    const gapPercent = Math.round((actualProgress - expectedProgress) * 100)

    let trajectory = 'on_track'
    if (gapPercent < -20) trajectory = 'critical'
    else if (gapPercent < -10) trajectory = 'behind'
    else if (gapPercent > 10) trajectory = 'ahead'

    // Update goal in DB
    await supabase
      .from('project_goals')
      .update({
        current_value: currentValue,
        gap_percent: gapPercent,
        trajectory,
        last_checked: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', goal.id)

    results.push({
      goal_type: goal.goal_type,
      target: Number(goal.target_value),
      current: currentValue,
      gapPercent,
      trajectory,
      daysRemaining,
      onTrack: gapPercent >= -10,
      recommendation: trajectory === 'critical'
        ? `Revenue $${Math.round(Number(goal.target_value) * expectedProgress - currentValue)} behind target — analyze and reprioritize`
        : trajectory === 'behind'
          ? `Revenue trending behind — review high-impact UCs`
          : null
    })
  }

  return results
}

/**
 * Seed project goals from project.config.json if none exist in DB.
 */
async function seedGoalsFromConfig() {
  const goals = config.goals || []
  if (goals.length === 0) return

  for (const goal of goals) {
    const { error } = await supabase
      .from('project_goals')
      .insert({
        project_id: PROJECT_ID,
        goal_type: goal.type,
        target_value: goal.target,
        target_date: goal.target_date,
        status: 'active',
        metadata: { currency: goal.currency, seeded_from: 'project.config.json' }
      })

    if (error && !error.message.includes('duplicate')) {
      console.warn(`  Failed to seed goal ${goal.type}:`, error.message)
    } else {
      console.log(`  Seeded goal: ${goal.type} → ${goal.target} by ${goal.target_date}`)
    }
  }
}

// ── Create PM Tasks When Off-Track ──────────────────────────────────────────

async function createRevenueAlertTasks(goalResults) {
  const { TaskStore } = require('../task-store')
  const store = new TaskStore()

  for (const result of goalResults) {
    if (result.onTrack || !result.recommendation) continue

    const title = `PM: Revenue alert — ${result.trajectory} (${result.goal_type})`
    await store.createTask({
      title,
      agent_id: 'product',
      status: 'ready',
      model: 'sonnet',
      priority: 1,
      tags: ['revenue', 'automated', 'high-priority'],
      description: [
        `Revenue Goal: $${result.target.toLocaleString()} ${result.goal_type.toUpperCase()}`,
        `Current: $${result.current.toLocaleString()} (${result.gapPercent}% vs expected)`,
        `Trajectory: ${result.trajectory} | Days remaining: ${result.daysRemaining}`,
        '',
        `Action: ${result.recommendation}`,
        '',
        'Tasks:',
        '1. Analyze current conversion funnel for bottlenecks',
        '2. Review and reprioritize use cases by revenue impact',
        '3. Recommend 2-3 specific actions to close the gap',
        '4. Update use_case priorities based on analysis'
      ].join('\n'),
      metadata: { created_by: 'revenue-collector', goal_type: result.goal_type, trajectory: result.trajectory }
    })

    console.log(`  Created PM task for ${result.trajectory} ${result.goal_type} goal`)
  }
}

// ── Main Entry Point ────────────────────────────────────────────────────────

async function collectRevenue() {
  console.log('[Revenue Collector] Starting...')

  // 1. Collect from Stripe
  const stripeData = await collectFromStripe()

  // 2. Write metrics
  if (stripeData) {
    await writeRevenueMetrics(stripeData)
    await writeCustomerEvents(stripeData.events)
    console.log(`  MRR: $${(stripeData.mrr_cents / 100).toFixed(2)} | Subscribers: ${stripeData.active_subscribers} | Trials: ${stripeData.trial_users}`)
  }

  // 3. Check goal progress
  const goalResults = await checkGoalProgress(stripeData)
  for (const g of goalResults) {
    console.log(`  Goal ${g.goal_type}: $${g.current}/$${g.target} (${g.trajectory}, ${g.gapPercent}% gap, ${g.daysRemaining}d left)`)
  }

  // 4. Create alert tasks if needed
  await createRevenueAlertTasks(goalResults)

  console.log('[Revenue Collector] Done')
  return { metrics: stripeData, goals: goalResults }
}

module.exports = { collectRevenue, checkGoalProgress }

// Run standalone
if (require.main === module) {
  collectRevenue().catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })
}
