#!/usr/bin/env node
'use strict'

/**
 * One-time cleanup and backfill for agent_survey_schedule.
 * feat-nps-survey-trial-agents
 *
 * 1. Delete orphaned rows (agent_id not in real_estate_agents)
 * 2. Backfill missing schedule entries (created_at + 14 days)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const { Client } = require('pg')

const connectionString = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'

async function run() {
  const client = new Client({ connectionString })

  try {
    await client.connect()
    console.log('Connected to PostgreSQL')

    // Step 1: Delete orphaned schedule rows
    const orphanResult = await client.query(`
      DELETE FROM agent_survey_schedule
      WHERE agent_id NOT IN (SELECT id FROM real_estate_agents)
    `)
    console.log(`Deleted ${orphanResult.rowCount} orphaned schedule rows`)

    // Step 2: Backfill missing schedule entries using agent created_at + 14 days
    const backfillResult = await client.query(`
      INSERT INTO agent_survey_schedule (agent_id, next_survey_at, survey_count)
      SELECT
        r.id,
        r.created_at + INTERVAL '14 days',
        0
      FROM real_estate_agents r
      WHERE NOT EXISTS (
        SELECT 1 FROM agent_survey_schedule s WHERE s.agent_id = r.id
      )
    `)
    console.log(`Backfilled ${backfillResult.rowCount} missing schedule entries`)

    // Step 3: Verify
    const verifyOrphans = await client.query(`
      SELECT count(*) AS n FROM agent_survey_schedule
      WHERE agent_id NOT IN (SELECT id FROM real_estate_agents)
    `)
    console.log(`Orphaned rows remaining: ${verifyOrphans.rows[0].n}`)

    const verifyTotal = await client.query(`
      SELECT count(*) AS n FROM agent_survey_schedule
      WHERE agent_id IN (SELECT id FROM real_estate_agents)
    `)
    console.log(`Total valid schedule entries: ${verifyTotal.rows[0].n}`)

    const verifyDue = await client.query(`
      SELECT count(*) AS n FROM agent_survey_schedule s
      JOIN real_estate_agents r ON s.agent_id = r.id
      WHERE s.next_survey_at <= NOW()
    `)
    console.log(`Agents due for survey now: ${verifyDue.rows[0].n}`)

  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
