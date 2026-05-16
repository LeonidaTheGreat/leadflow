'use strict'

const assert = require('assert')
const path = require('path')

const backfill = require(path.join(__dirname, '../../scripts/db/backfill-nps-survey-schedules.js'))

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
  } catch (error) {
    console.error(`FAIL: ${name} — ${error.message}`)
    process.exitCode = 1
  }
}

console.log('\n=== backfill-nps-survey-schedules SQL tests ===\n')

test('deletes orphan schedule rows by missing agent id', () => {
  assert.ok(
    backfill.SQL_DELETE_ORPHANS.includes('DELETE FROM agent_survey_schedule'),
    'Expected orphan delete SQL to target agent_survey_schedule'
  )
  assert.ok(
    backfill.SQL_DELETE_ORPHANS.includes('NOT IN (SELECT id FROM real_estate_agents)'),
    'Expected orphan delete SQL to only delete rows without matching real_estate_agents'
  )
})

test('backfill SQL clamps overdue first surveys to NOW()', () => {
  assert.ok(
    backfill.SQL_BACKFILL_MISSING.includes("created_at + INTERVAL '14 days'"),
    'Expected first survey offset of 14 days from created_at'
  )
  assert.ok(
    backfill.SQL_BACKFILL_MISSING.includes('THEN NOW()'),
    'Expected overdue schedule fallback to NOW()'
  )
  assert.ok(
    backfill.SQL_BACKFILL_MISSING.includes('ON CONFLICT (agent_id) DO NOTHING'),
    'Expected idempotent upsert behavior for existing schedules'
  )
})

test('verification queries are exposed for post-run checks', () => {
  assert.ok(
    backfill.SQL_COUNT_ORPHANS.includes('count(*)'),
    'Expected orphan count verification query'
  )
  assert.ok(
    backfill.SQL_COUNT_VALID_SCHEDULES.includes('agent_id IN (SELECT id FROM real_estate_agents)'),
    'Expected valid schedule count verification query'
  )
  assert.ok(
    backfill.SQL_COUNT_DUE_NOW.includes('next_survey_at <= NOW()'),
    'Expected due-now verification query'
  )
})
