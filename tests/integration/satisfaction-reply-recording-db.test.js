#!/usr/bin/env node
/**
 * Integration test: satisfaction reply recording against real PostgreSQL
 * Task ID: 09a067f4-edca-4fbe-8392-15b80e18cdc8
 */

const assert = require('assert')
const crypto = require('crypto')
const path = require('path')
const { Client } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const PG_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'

const POSITIVE_KEYWORDS = ['yes', 'helpful', 'good', 'great', 'thanks', 'thank', 'awesome', 'perfect', 'excellent', 'amazing']
const NEGATIVE_KEYWORDS = ['no', 'bad', 'annoying', 'quit', 'terrible', 'horrible', 'awful', 'hate', 'useless']
const NEUTRAL_KEYWORDS = ['neutral', 'ok', 'okay', 'fine', 'meh', 'alright', 'average']

function classifyReply(reply) {
  const normalized = (reply || '').trim().toLowerCase()

  if (POSITIVE_KEYWORDS.includes(normalized)) return 'positive'
  if (NEGATIVE_KEYWORDS.includes(normalized)) return 'negative'
  if (NEUTRAL_KEYWORDS.includes(normalized)) return 'neutral'

  for (const kw of POSITIVE_KEYWORDS) {
    if (normalized.startsWith(kw + ' ') || normalized === kw) return 'positive'
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (normalized.startsWith(kw + ' ') || normalized === kw) return 'negative'
  }
  for (const kw of NEUTRAL_KEYWORDS) {
    if (normalized.startsWith(kw + ' ') || normalized === kw) return 'neutral'
  }

  return 'unclassified'
}

async function getPendingSatisfactionPing(client, leadId) {
  const result = await client.query(
    `
      SELECT id
      FROM lead_satisfaction_events
      WHERE lead_id = $1
        AND satisfaction_ping_sent_at IS NOT NULL
        AND rating IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [leadId]
  )

  return result.rows[0] || null
}

async function recordSatisfactionReply(client, eventId, rawReply, rating) {
  const result = await client.query(
    `
      UPDATE lead_satisfaction_events
      SET raw_reply = $2,
          rating = $3
      WHERE id = $1
      RETURNING id
    `,
    [eventId, rawReply, rating]
  )

  return result.rowCount === 1
}

async function handleSatisfactionFeedback(client, leadId, rawReply) {
  const pendingPing = await getPendingSatisfactionPing(client, leadId)
  if (!pendingPing) {
    return { handled: false, rating: null }
  }

  const rating = classifyReply(rawReply)
  const recorded = await recordSatisfactionReply(client, pendingPing.id, rawReply, rating)

  return {
    handled: recorded,
    rating,
    eventId: pendingPing.id,
  }
}

let passed = 0
let total = 0

async function runTest(name, fn) {
  total++
  try {
    await fn()
    passed++
    console.log(`✅ ${name}`)
  } catch (error) {
    console.error(`❌ ${name}`)
    console.error(`   ${error.message}`)
  }
}

async function createFixtures(client, suffix) {
  const agentInsert = await client.query(
    `
      INSERT INTO real_estate_agents (email, password_hash, first_name, last_name)
      VALUES ($1, $2, 'Integration', 'Tester')
      RETURNING id
    `,
    [`sat-reply-${suffix}@example.com`, 'integration-test-hash']
  )
  const agentId = agentInsert.rows[0].id

  const phoneTail = String(Math.floor(Math.random() * 10000000)).padStart(7, '0')
  const leadInsert = await client.query(
    `
      INSERT INTO leads (agent_id, phone, source, consent_sms, dnc, name)
      VALUES ($1, $2, 'integration_test', true, false, 'Satisfaction Lead')
      RETURNING id
    `,
    [agentId, `+1555${phoneTail}`]
  )
  const leadId = leadInsert.rows[0].id

  return { agentId, leadId }
}

async function cleanupFixtures(client, ids) {
  if (ids.eventIds.length > 0) {
    await client.query('DELETE FROM lead_satisfaction_events WHERE id = ANY($1::uuid[])', [ids.eventIds])
  }
  if (ids.leadIds.length > 0) {
    await client.query('DELETE FROM leads WHERE id = ANY($1::uuid[])', [ids.leadIds])
  }
  if (ids.agentIds.length > 0) {
    await client.query('DELETE FROM real_estate_agents WHERE id = ANY($1::uuid[])', [ids.agentIds])
  }
}

async function main() {
  const client = new Client({ connectionString: PG_URL })
  const ids = { agentIds: [], leadIds: [], eventIds: [] }

  try {
    await client.connect()

    await runTest('handleSatisfactionFeedback records raw_reply and rating on pending ping', async () => {
      const suffix = crypto.randomUUID().slice(0, 8)
      const { agentId, leadId } = await createFixtures(client, suffix)
      ids.agentIds.push(agentId)
      ids.leadIds.push(leadId)

      const eventInsert = await client.query(
        `
          INSERT INTO lead_satisfaction_events (lead_id, agent_id, satisfaction_ping_sent_at, rating)
          VALUES ($1, $2, NOW(), NULL)
          RETURNING id
        `,
        [leadId, agentId]
      )
      const eventId = eventInsert.rows[0].id
      ids.eventIds.push(eventId)

      const reply = 'YES very helpful'
      const result = await handleSatisfactionFeedback(client, leadId, reply)

      assert.strictEqual(result.handled, true)
      assert.strictEqual(result.rating, 'positive')
      assert.strictEqual(result.eventId, eventId)

      const verify = await client.query(
        'SELECT raw_reply, rating FROM lead_satisfaction_events WHERE id = $1',
        [eventId]
      )

      assert.strictEqual(verify.rowCount, 1)
      assert.strictEqual(verify.rows[0].raw_reply, reply)
      assert.strictEqual(verify.rows[0].rating, 'positive')
    })

    await runTest('handleSatisfactionFeedback no-ops when there is no pending ping', async () => {
      const suffix = crypto.randomUUID().slice(0, 8)
      const { agentId, leadId } = await createFixtures(client, suffix)
      ids.agentIds.push(agentId)
      ids.leadIds.push(leadId)

      const result = await handleSatisfactionFeedback(client, leadId, 'NO thanks')

      assert.deepStrictEqual(result, { handled: false, rating: null })

      const verify = await client.query(
        'SELECT COUNT(*)::int AS cnt FROM lead_satisfaction_events WHERE lead_id = $1',
        [leadId]
      )
      assert.strictEqual(verify.rows[0].cnt, 0)
    })
  } finally {
    try {
      await cleanupFixtures(client, ids)
    } finally {
      await client.end()
    }
  }

  const passRate = total === 0 ? 0 : passed / total
  console.log(`\nResults: ${passed}/${total} passed (${Math.round(passRate * 100)}%)`)

  if (passed !== total) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Test runner error:', error.message)
  process.exit(1)
})
