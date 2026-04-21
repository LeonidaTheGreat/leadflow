#!/usr/bin/env node

/**
 * Capture daily revenue metrics snapshot
 * Can be run manually or via cron/heartbeat
 *
 * Usage: node scripts/tasks/revenue-snapshot.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })

const RevenueMetricsService = require('../../lib/services/RevenueMetricsService')
const { logger } = require('../../lib/logger')

const log = logger.child('revenue-snapshot')

async function main() {
  try {
    log.info('Starting revenue metrics snapshot...')

    const service = new RevenueMetricsService()
    const result = await service.captureSnapshot('leadflow')

    log.info('Revenue snapshot captured successfully', {
      date: result.date,
      mrr: result.mrr_cents,
      activeSubscribers: result.active_subscribers,
      trialUsers: result.trial_users,
      conversionRate: result.conversion_rate,
    })

    console.log('\n✓ Revenue snapshot captured successfully')
    console.log(`  Date: ${result.date}`)
    console.log(`  MRR: $${result.mrr_cents / 100}`)
    console.log(`  Active Subscribers: ${result.active_subscribers}`)
    console.log(`  Trial Users: ${result.trial_users}`)
    console.log(`  Conversion Rate: ${(result.conversion_rate * 100).toFixed(1)}%`)

    process.exit(0)
  } catch (error) {
    log.error('Failed to capture revenue snapshot', { error: error.message })
    console.error('\n✗ Failed to capture revenue snapshot:', error.message)
    process.exit(1)
  }
}

main()
