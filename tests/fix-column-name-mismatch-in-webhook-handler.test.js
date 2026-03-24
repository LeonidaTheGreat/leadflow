/**
 * E2E Test: fix-column-name-mismatch-in-webhook-handler
 * Task ID: 3ed3309e-7975-483a-b51f-f0bfbe3cadaa
 *
 * Verifies:
 * 1. subscription_events inserts use user_id (not agent_id) — matches DB schema
 * 2. payments inserts use user_id (not agent_id) — matches DB schema
 * 3. portal-session event log uses user_id (not agent_id)
 * 4. DB schema confirms user_id column exists on both tables
 * 5. No agent_id column in subscription_events or payments inserts
 */

'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const DASHBOARD = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard')
const WEBHOOK_ROUTE = path.join(DASHBOARD, 'app/api/webhooks/stripe/route.ts')
const PORTAL_ROUTE = path.join(DASHBOARD, 'app/api/stripe/portal-session/route.ts')

let passed = 0
let failed = 0
const failures = []

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`)
    failures.push({ name, error: err.message })
    failed++
  }
}

async function asyncTest(name, fn) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`)
    failures.push({ name, error: err.message })
    failed++
  }
}

console.log('\n=== E2E: fix-column-name-mismatch-in-webhook-handler ===\n')

// ── Section 1: Source code checks ─────────────────────────────────────────────
console.log('[1] Webhook handler source code checks')

test('Webhook route file exists', () => {
  assert.ok(fs.existsSync(WEBHOOK_ROUTE), 'route.ts not found at ' + WEBHOOK_ROUTE)
})

const webhookSrc = fs.readFileSync(WEBHOOK_ROUTE, 'utf8')

test('subscription_events inserts use user_id (handleCheckoutComplete)', () => {
  // Find the subscription_events insert block in handleCheckoutComplete
  const checkoutFnMatch = webhookSrc.match(/handleCheckoutComplete[\s\S]*?subscription_events[\s\S]*?insert\(\{([\s\S]*?)\}\)/)
  if (!checkoutFnMatch) {
    // Alternative: just check the first subscription_events insert has user_id
    const firstInsert = webhookSrc.indexOf("from('subscription_events').insert(")
    assert.ok(firstInsert !== -1, 'subscription_events insert not found')
    const insertBlock = webhookSrc.slice(firstInsert, webhookSrc.indexOf('})', firstInsert) + 2)
    assert.ok(insertBlock.includes('user_id:'), `First subscription_events insert missing user_id.\nGot: ${insertBlock}`)
    assert.ok(!insertBlock.includes('agent_id:'), `First subscription_events insert still has agent_id`)
    return
  }
  const block = checkoutFnMatch[1]
  assert.ok(block.includes('user_id:'), `handleCheckoutComplete subscription_events missing user_id. Got: ${block}`)
  assert.ok(!block.includes('agent_id:'), `handleCheckoutComplete subscription_events still has agent_id. Got: ${block}`)
})

test('No subscription_events insert uses agent_id column', () => {
  // Find all subscription_events inserts and check none use agent_id
  const regex = /from\(['"]subscription_events['"]\)\.insert\(\{([\s\S]*?)\}\)/g
  let match
  let count = 0
  while ((match = regex.exec(webhookSrc)) !== null) {
    count++
    const block = match[1]
    assert.ok(
      !block.includes('agent_id:'),
      `subscription_events insert #${count} uses agent_id instead of user_id:\n${block}`
    )
    assert.ok(
      block.includes('user_id:'),
      `subscription_events insert #${count} missing user_id:\n${block}`
    )
  }
  assert.ok(count >= 3, `Expected at least 3 subscription_events inserts, found ${count}`)
})

test('payments insert uses user_id (not agent_id)', () => {
  const regex = /from\(['"]payments['"]\)\.insert\(\{([\s\S]*?)\}\)/g
  let match
  let count = 0
  while ((match = regex.exec(webhookSrc)) !== null) {
    count++
    const block = match[1]
    assert.ok(
      !block.includes('agent_id:'),
      `payments insert #${count} uses agent_id instead of user_id:\n${block}`
    )
    assert.ok(
      block.includes('user_id:'),
      `payments insert #${count} missing user_id:\n${block}`
    )
  }
  assert.ok(count >= 1, `Expected at least 1 payments insert, found ${count}`)
})

// ── Section 2: Portal-session checks ─────────────────────────────────────────
console.log('\n[2] Portal-session route checks')

test('Portal-session route file exists', () => {
  assert.ok(fs.existsSync(PORTAL_ROUTE), 'portal-session/route.ts not found')
})

const portalSrc = fs.readFileSync(PORTAL_ROUTE, 'utf8')

test('portal-session subscription_events insert uses user_id', () => {
  const regex = /from\(['"]subscription_events['"]\)\.insert\(\{([\s\S]*?)\}\)/g
  let match
  let count = 0
  while ((match = regex.exec(portalSrc)) !== null) {
    count++
    const block = match[1]
    assert.ok(
      !block.includes('agent_id:'),
      `portal-session subscription_events insert uses agent_id. Block:\n${block}`
    )
    assert.ok(
      block.includes('user_id:'),
      `portal-session subscription_events insert missing user_id. Block:\n${block}`
    )
  }
  // Portal session has 1 subscription_events insert
  assert.ok(count >= 1, `Expected at least 1 subscription_events insert in portal-session, found ${count}`)
})

// ── Section 3: DB schema confirmation ─────────────────────────────────────────
console.log('\n[3] DB schema migration files confirm user_id column')

test('Migration schema defines user_id on subscription_events (not agent_id)', () => {
  const schemaFiles = [
    path.join(__dirname, '../supabase/migrations/003_stripe_subscriptions.sql'),
    path.join(__dirname, '../sql/stripe-subscriptions-schema.sql'),
  ]

  let found = false
  for (const schemaFile of schemaFiles) {
    if (!fs.existsSync(schemaFile)) continue
    const content = fs.readFileSync(schemaFile, 'utf8')
    const tableMatch = content.match(/CREATE TABLE IF NOT EXISTS subscription_events \([\s\S]*?\);/)
    if (tableMatch) {
      const tableDef = tableMatch[0]
      assert.ok(
        tableDef.includes('user_id'),
        `subscription_events schema has no user_id column in ${schemaFile}`
      )
      assert.ok(
        !tableDef.includes('agent_id'),
        `subscription_events schema still has agent_id column in ${schemaFile}`
      )
      found = true
      break
    }
  }
  assert.ok(found, 'Could not find subscription_events schema definition in migration files')
})

test('Migration schema defines user_id on payments (not agent_id)', () => {
  const schemaFiles = [
    path.join(__dirname, '../supabase/migrations/003_stripe_subscriptions.sql'),
    path.join(__dirname, '../sql/stripe-subscriptions-schema.sql'),
  ]

  let found = false
  for (const schemaFile of schemaFiles) {
    if (!fs.existsSync(schemaFile)) continue
    const content = fs.readFileSync(schemaFile, 'utf8')
    const tableMatch = content.match(/CREATE TABLE IF NOT EXISTS payments \([\s\S]*?\);/)
    if (tableMatch) {
      const tableDef = tableMatch[0]
      assert.ok(
        tableDef.includes('user_id'),
        `payments schema has no user_id column in ${schemaFile}`
      )
      assert.ok(
        !tableDef.includes('agent_id'),
        `payments schema still has agent_id column in ${schemaFile}`
      )
      found = true
      break
    }
  }
  assert.ok(found, 'Could not find payments schema definition in migration files')
})

// ── Section 4: Live DB runtime check (if env vars available) ──────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (SUPABASE_URL && SUPABASE_KEY) {
  console.log('\n[4] Live DB column verification')

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

  async function runDbTests() {
    await asyncTest('subscription_events.user_id column exists (no query error)', async () => {
      const { error } = await sb
        .from('subscription_events')
        .select('user_id')
        .limit(1)
      assert.ok(!error, `subscription_events.user_id query failed: ${error?.message}`)
    })

    await asyncTest('subscription_events.agent_id column does NOT exist', async () => {
      const { error } = await sb
        .from('subscription_events')
        .select('agent_id')
        .limit(1)
      assert.ok(
        error !== null,
        'Expected error querying subscription_events.agent_id (column should not exist)'
      )
      // Accept any error — column doesn't exist
    })

    await asyncTest('payments.user_id column exists (no query error)', async () => {
      const { error } = await sb
        .from('payments')
        .select('user_id')
        .limit(1)
      assert.ok(!error, `payments.user_id query failed: ${error?.message}`)
    })

    await asyncTest('payments.agent_id column does NOT exist', async () => {
      const { error } = await sb
        .from('payments')
        .select('agent_id')
        .limit(1)
      assert.ok(
        error !== null,
        'Expected error querying payments.agent_id (column should not exist)'
      )
    })

    printSummary()
  }

  runDbTests().catch(err => {
    console.error('DB test fatal:', err.message)
    process.exit(1)
  })
} else {
  console.log('\n[4] DB runtime check: SKIPPED (no Supabase env vars)')
  printSummary()
}

function printSummary() {
  console.log(`\n${'─'.repeat(55)}`)
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`)
  if (failures.length > 0) {
    console.log('\nFailed:')
    failures.forEach(f => console.log(`  ✗ ${f.name}: ${f.error}`))
    process.exit(1)
  } else {
    console.log('All tests passed ✓')
    process.exit(0)
  }
}
