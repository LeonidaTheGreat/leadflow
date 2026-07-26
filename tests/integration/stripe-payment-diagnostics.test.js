'use strict'
/**
 * Integration tests: Stripe Checkout Failure Diagnostics
 * UC: uc-leadflow-checkout-failure-diagnostics
 *
 * Validates:
 * 1. stripe_events table exists in PostgreSQL
 * 2. BillingService._logWebhookEvent writes to stripe_events
 * 3. Dashboard API route file exists and exports GET
 * 4. Dashboard page file exists
 * 5. BillingService does not contain isValidPriceId (regression guard)
 * 6. Migration script exists
 */

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

const PROJECT = path.join(__dirname, '..', '..')
const DASHBOARD = path.join(PROJECT, 'product', 'lead-response', 'dashboard')

let passed = 0
let failed = 0

function wrap(name, fn) {
  return test(name, async () => {
    try {
      await fn()
      passed++
    } catch (e) {
      failed++
      throw e
    }
  })
}

// 1. stripe_events table exists in PostgreSQL
wrap('stripe_events table exists in PostgreSQL', async () => {
  let output = ''
  try {
    output = execSync(
      `psql postgresql://clawdbot@localhost/openclaw -c "SELECT count(*) FROM stripe_events LIMIT 1;"`,
      { encoding: 'utf-8', timeout: 10000 }
    )
  } catch (e) {
    assert.fail(`stripe_events table missing or psql error: ${e.stderr || e.message}`)
  }
  assert.ok(output.includes('count'), 'Expected count query to succeed')
})

// 2. stripe_events table has correct schema
wrap('stripe_events table has id, type, payload, received_at columns', async () => {
  let output = ''
  try {
    output = execSync(
      `psql postgresql://clawdbot@localhost/openclaw -c "\\d stripe_events"`,
      { encoding: 'utf-8', timeout: 10000 }
    )
  } catch (e) {
    assert.fail(`Could not describe stripe_events: ${e.message}`)
  }
  assert.ok(output.includes('id'), 'Missing id column')
  assert.ok(output.includes('type'), 'Missing type column')
  assert.ok(output.includes('payload'), 'Missing payload column')
  assert.ok(output.includes('received_at'), 'Missing received_at column')
})

// 3. BillingService._logWebhookEvent writes to stripe_events
wrap('BillingService._logWebhookEvent inserts to stripe_events', () => {
  const src = fs.readFileSync(path.join(PROJECT, 'lib', 'services', 'BillingService.js'), 'utf8')
  assert.ok(
    src.includes('_logWebhookEvent'),
    'BillingService must have _logWebhookEvent method'
  )
  assert.ok(
    src.includes("'stripe_events'"),
    'BillingService must write to stripe_events table'
  )
  assert.ok(
    src.includes("'subscription_events'"),
    '_logWebhookEvent must still write to subscription_events (existing log)'
  )
})

// 4. BillingService does not contain isValidPriceId (regression guard)
wrap('BillingService must not contain isValidPriceId', () => {
  const src = fs.readFileSync(path.join(PROJECT, 'lib', 'services', 'BillingService.js'), 'utf8')
  assert.ok(
    !src.includes('isValidPriceId'),
    'BillingService must not use isValidPriceId (blocks all payments)'
  )
})

// 5. Dashboard API route exists and has GET export
wrap('dashboard API route app/api/admin/payments/route.ts exists', () => {
  const routePath = path.join(DASHBOARD, 'app', 'api', 'admin', 'payments', 'route.ts')
  assert.ok(fs.existsSync(routePath), `Missing: ${routePath}`)
  const src = fs.readFileSync(routePath, 'utf8')
  assert.ok(src.includes('export async function GET'), 'Must export GET handler')
  assert.ok(src.includes('stripe_events'), 'Must query stripe_events table')
  assert.ok(src.includes('isValidPriceId'), 'Must check price ID validity')
  assert.ok(src.includes('lastPaymentAttempt'), 'Must return lastPaymentAttempt')
  assert.ok(src.includes('priceIdHealth'), 'Must return priceIdHealth')
})

// 6. Dashboard admin page exists
wrap('dashboard admin page app/admin/payments/page.tsx exists', () => {
  const pagePath = path.join(DASHBOARD, 'app', 'admin', 'payments', 'page.tsx')
  assert.ok(fs.existsSync(pagePath), `Missing: ${pagePath}`)
  const src = fs.readFileSync(pagePath, 'utf8')
  assert.ok(src.includes('events-table') || src.includes('events'), 'Must render event log')
  assert.ok(src.includes('price-id-health') || src.includes('priceIdHealth'), 'Must show price ID health')
  assert.ok(src.includes('lastPaymentAttempt'), 'Must show last payment attempt')
})

// 7. Migration script exists
wrap('migration script scripts/db/migrate-stripe-events.sql exists', () => {
  const migPath = path.join(PROJECT, 'scripts', 'db', 'migrate-stripe-events.sql')
  assert.ok(fs.existsSync(migPath), `Missing: ${migPath}`)
  const src = fs.readFileSync(migPath, 'utf8')
  assert.ok(src.includes('CREATE TABLE'), 'Migration must create table')
  assert.ok(src.includes('stripe_events'), 'Migration must create stripe_events')
})

// 8. isValidPriceId regression guard: not in lib/ or routes/
wrap('isValidPriceId not in lib/ JS files (regression guard)', () => {
  function scan(dir) {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scan(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const src = fs.readFileSync(fullPath, 'utf8')
        assert.ok(
          !src.includes('isValidPriceId'),
          `${entry.name} in lib/ must not use isValidPriceId (blocks all payments)`
        )
      }
    }
  }
  scan(path.join(PROJECT, 'lib'))
})

wrap('isValidPriceId not in routes/ JS files (regression guard)', () => {
  function scan(dir) {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scan(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const src = fs.readFileSync(fullPath, 'utf8')
        assert.ok(
          !src.includes('isValidPriceId'),
          `${entry.name} in routes/ must not use isValidPriceId (blocks all payments)`
        )
      }
    }
  }
  scan(path.join(PROJECT, 'routes'))
})
