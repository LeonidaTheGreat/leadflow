#!/usr/bin/env node
/**
 * Integration Test: satisfaction reply recording hits real DB and persists update
 * Task ID: 09a067f4-edca-4fbe-8392-15b80e18cdc8
 */

const assert = require('assert')
const path = require('path')
const { Client } = require('pg')

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const { createLocalClient } = require('/Users/clawdbot/.openclaw/genome/core/local-pg')
const SatisfactionService = require('../../lib/services/SatisfactionService')

const DATABASE_URL = process.env.LOCAL_PG_URL || process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ Missing LOCAL_PG_URL or DATABASE_URL')
  process.exit(1)
}

function createLogger() {
  return {
    log: () => {},
    warn: () => {},
    error: () => {}
  }
}

async function handleSatisfactionFeedback(service, leadId, inboundBody) {
  const pending = await service.getPendingSatisfactionPing(leadId)
  if (!pending) {
    return { handled: false, reason: 'no_pending_ping' }
  }

  const rating = service.classifyReply(inboundBody)
  const recorded = await service.recordSatisfactionReply(pending.id, inboundBody, rating)

  return {
    handled: recorded,
    eventId: pending.id,
    rating
  }
}

async function run() {
  const pg = new Client({ connectionString: DATABASE_URL })
  const localDbClient = createLocalClient(DATABASE_URL)
  const service = new SatisfactionService({ db: localDbClient, logger: createLogger() })

  const leadId = `it-satisfaction-${Date.now()}`
  const conversationId = `it-convo-${Date.now()}`

  let passed = 0
  let total = 0

  function pass(msg) {
    total += 1
    passed += 1
    console.log(`  ✅ ${msg}`)
  }

  function fail(msg) {
    total += 1
    console.error(`  ❌ ${msg}`)
  }

  try {
    await pg.connect()

    await pg.query(
      `INSERT INTO lead_satisfaction_events (
        lead_id,
        agent_id,
        conversation_id,
        satisfaction_ping_sent_at,
        rating,
        created_at
      ) VALUES ($1, NULL, $2, NOW(), NULL, NOW())`,
      [leadId, conversationId]
    )

    const result = await handleSatisfactionFeedback(service, leadId, 'YES this was very helpful')

    try {
      assert.strictEqual(result.handled, true)
      assert.strictEqual(result.rating, 'positive')
      pass('handleSatisfactionFeedback classifies and handles pending reply')
    } catch (_err) {
      fail('handleSatisfactionFeedback did not return handled=true with positive rating')
    }

    const check = await pg.query(
      `SELECT raw_reply, rating
       FROM lead_satisfaction_events
       WHERE lead_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [leadId]
    )

    try {
      assert.strictEqual(check.rows.length, 1)
      assert.strictEqual(check.rows[0].raw_reply, 'YES this was very helpful')
      assert.strictEqual(check.rows[0].rating, 'positive')
      pass('DB row updated with raw_reply and rating via recordSatisfactionReply')
    } catch (_err) {
      fail('lead_satisfaction_events row was not updated as expected')
    }

    const noPending = await handleSatisfactionFeedback(service, `missing-${Date.now()}`, 'NO')
    try {
      assert.strictEqual(noPending.handled, false)
      assert.strictEqual(noPending.reason, 'no_pending_ping')
      pass('No-op path returns handled=false when no pending ping exists')
    } catch (_err) {
      fail('No-op path did not return expected response for missing pending ping')
    }
  } catch (err) {
    console.error(`\n❌ Integration test failed with error: ${err.message}`)
    process.exitCode = 1
  } finally {
    try {
      await pg.query('DELETE FROM lead_satisfaction_events WHERE lead_id = $1', [leadId])
    } catch (_err) {
      // Best-effort cleanup only.
    }

    await pg.end().catch(() => {})
    await localDbClient.end().catch(() => {})
  }

  const passRate = total > 0 ? passed / total : 0
  console.log(`\nResults: ${passed}/${total} passed (${Math.round(passRate * 100)}%)`)

  if (passed !== total) {
    process.exit(1)
  }
}

run()
