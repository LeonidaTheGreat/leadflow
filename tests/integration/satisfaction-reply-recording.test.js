#!/usr/bin/env node
/**
 * Integration test: satisfaction reply recording
 * Task ID: 09a067f4-edca-4fbe-8392-15b80e18cdc8
 *
 * Purpose:
 * - Run handleSatisfactionFeedback against the real DB
 * - Verify a pending satisfaction event is updated with raw_reply + rating
 */

'use strict'

const assert = require('assert')
const path = require('path')
const { Client } = require('pg')
const SatisfactionService = require('../../lib/services/SatisfactionService')

require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const PG_URL = process.env.LOCAL_PG_URL
if (!PG_URL) {
  throw new Error('LOCAL_PG_URL is not set')
}

let passed = 0
let failed = 0

function pass(name) {
  console.log(`  PASS: ${name}`)
  passed++
}

function fail(name, err) {
  console.error(`  FAIL: ${name}`)
  console.error(`       ${err.message}`)
  failed++
}

async function asyncTest(name, fn) {
  try {
    await fn()
    pass(name)
  } catch (err) {
    fail(name, err)
  }
}

function uniqueTag() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`
}

async function createLead(client) {
  const tag = uniqueTag()
  const email = `satisfaction-int-${tag}@leadflow-qc.invalid`
  const phone = `+1555${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`

  const result = await client.query(
    `INSERT INTO leads (phone, source, email, consent_sms, dnc, created_at, updated_at)
     VALUES ($1, 'integration_test', $2, true, false, NOW(), NOW())
     RETURNING id`,
    [phone, email]
  )

  return result.rows[0].id
}

async function createPendingSatisfactionEvent(client, leadId) {
  const result = await client.query(
    `INSERT INTO lead_satisfaction_events (lead_id, agent_id, conversation_id, satisfaction_ping_sent_at, rating, created_at)
     VALUES ($1, NULL, $2, NOW(), NULL, NOW())
     RETURNING id`,
    [leadId, `conversation-${uniqueTag()}`]
  )

  return result.rows[0].id
}

async function cleanup(client, leadIds, eventIds) {
  if (eventIds.length > 0) {
    await client.query('DELETE FROM lead_satisfaction_events WHERE id = ANY($1::uuid[])', [eventIds])
  }
  if (leadIds.length > 0) {
    await client.query('DELETE FROM leads WHERE id = ANY($1::uuid[])', [leadIds])
  }
}

/**
 * Mirrors the webhook satisfaction-reply handling flow:
 * 1. find pending ping
 * 2. classify inbound reply
 * 3. persist raw_reply + rating
 */
async function handleSatisfactionFeedback({ client, leadId, inboundBody, classifier }) {
  const pending = await client.query(
    `SELECT id
     FROM lead_satisfaction_events
     WHERE lead_id = $1
       AND satisfaction_ping_sent_at IS NOT NULL
       AND rating IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [leadId]
  )

  if (pending.rows.length === 0) {
    return { handled: false, eventId: null, rating: null }
  }

  const eventId = pending.rows[0].id
  const rating = classifier.classifyReply(inboundBody)

  const update = await client.query(
    `UPDATE lead_satisfaction_events
     SET raw_reply = $1, rating = $2
     WHERE id = $3
     RETURNING id, raw_reply, rating`,
    [inboundBody, rating, eventId]
  )

  return {
    handled: true,
    eventId,
    rating,
    updatedRow: update.rows[0],
  }
}

async function run() {
  console.log('\nIntegration: satisfaction reply recording\n')

  const client = new Client({ connectionString: PG_URL })
  const service = new SatisfactionService({ db: {}, logger: { log() {}, error() {} } })
  const leadIds = []
  const eventIds = []

  await client.connect()

  try {
    await asyncTest('handleSatisfactionFeedback records YES reply as positive and stores raw_reply', async () => {
      const leadId = await createLead(client)
      leadIds.push(leadId)

      const eventId = await createPendingSatisfactionEvent(client, leadId)
      eventIds.push(eventId)

      const result = await handleSatisfactionFeedback({
        client,
        leadId,
        inboundBody: 'YES',
        classifier: service,
      })

      assert.strictEqual(result.handled, true, 'Expected pending satisfaction event to be handled')
      assert.strictEqual(result.eventId, eventId, 'Expected pending event id to be updated')
      assert.strictEqual(result.rating, 'positive', 'Expected YES to classify as positive')

      const verify = await client.query(
        `SELECT raw_reply, rating FROM lead_satisfaction_events WHERE id = $1`,
        [eventId]
      )

      assert.strictEqual(verify.rows.length, 1, 'Expected event row to exist')
      assert.strictEqual(verify.rows[0].raw_reply, 'YES', 'raw_reply was not persisted correctly')
      assert.strictEqual(verify.rows[0].rating, 'positive', 'rating was not persisted correctly')
    })

    await asyncTest('handleSatisfactionFeedback records NO prefix reply as negative', async () => {
      const leadId = await createLead(client)
      leadIds.push(leadId)

      const eventId = await createPendingSatisfactionEvent(client, leadId)
      eventIds.push(eventId)

      const result = await handleSatisfactionFeedback({
        client,
        leadId,
        inboundBody: 'no thanks',
        classifier: service,
      })

      assert.strictEqual(result.handled, true, 'Expected pending satisfaction event to be handled')
      assert.strictEqual(result.rating, 'negative', 'Expected "no thanks" to classify as negative')

      const verify = await client.query(
        `SELECT raw_reply, rating FROM lead_satisfaction_events WHERE id = $1`,
        [eventId]
      )

      assert.strictEqual(verify.rows[0].raw_reply, 'no thanks', 'raw_reply mismatch')
      assert.strictEqual(verify.rows[0].rating, 'negative', 'rating mismatch')
    })

    await asyncTest('handleSatisfactionFeedback returns handled=false when no pending ping exists', async () => {
      const leadId = await createLead(client)
      leadIds.push(leadId)

      const result = await handleSatisfactionFeedback({
        client,
        leadId,
        inboundBody: 'YES',
        classifier: service,
      })

      assert.deepStrictEqual(result, { handled: false, eventId: null, rating: null })

      const verify = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM lead_satisfaction_events
         WHERE lead_id = $1`,
        [leadId]
      )

      assert.strictEqual(verify.rows[0].count, 0, 'No rows should be created when no pending ping exists')
    })
  } finally {
    try {
      await cleanup(client, leadIds, eventIds)
    } finally {
      await client.end()
    }
  }

  const total = passed + failed
  const passRate = total ? passed / total : 0

  console.log(`\nResults: ${passed}/${total} passed (${Math.round(passRate * 100)}%)`)

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
