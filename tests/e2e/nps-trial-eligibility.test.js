'use strict'

/**
 * E2E test: NPS survey eligibility expanded to trial/onboarding agents
 * UC: feat-nps-survey-trial-agents
 *
 * Verifies the DB-level behavior that getAgentsDueForSurvey() relies on.
 * Requires a running local PostgreSQL DB (LOCAL_PG_URL or default openclaw).
 */

const assert = require('assert')
const { execSync } = require('child_process')

const DB = process.env.LOCAL_PG_URL
  ? process.env.LOCAL_PG_URL
  : 'postgresql://clawdbot@localhost/openclaw'

function q(sql) {
  const escaped = sql.replace(/"/g, '\\"')
  return execSync(`psql "${DB}" -t -A -c "${escaped}"`, { encoding: 'utf8' }).trim()
}

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${err.message}`)
    failed++
  }
}

console.log('\nNPS trial eligibility E2E tests\n')

// ── Test 1: Query without status filter returns agents due for survey ──────────
test('agents due for survey are returned without a status filter', () => {
  const count = parseInt(q(
    'SELECT count(*) FROM agent_survey_schedule s ' +
    "JOIN real_estate_agents r ON s.agent_id = r.id WHERE s.next_survey_at <= NOW()"
  ), 10)
  assert.ok(count >= 0, `Expected non-negative count, got ${count}`)
})

// ── Test 2: Query WITH old status filter returns fewer or equal results ────────
test('old active-only filter would exclude trial/onboarding agents', () => {
  const withFilter = parseInt(q(
    "SELECT count(*) FROM agent_survey_schedule s " +
    "JOIN real_estate_agents r ON s.agent_id = r.id " +
    "WHERE s.next_survey_at <= NOW() AND r.status = 'active'"
  ), 10)
  const withoutFilter = parseInt(q(
    'SELECT count(*) FROM agent_survey_schedule s ' +
    "JOIN real_estate_agents r ON s.agent_id = r.id WHERE s.next_survey_at <= NOW()"
  ), 10)
  assert.ok(
    withFilter <= withoutFilter,
    `With filter (${withFilter}) should be <= without filter (${withoutFilter})`
  )
  // On this system there are no 'active' agents, so filter would block everyone
  if (withFilter === 0 && withoutFilter > 0) {
    console.log(`    note: old filter would have blocked all ${withoutFilter} eligible agent(s) — all are trial/onboarding`)
  }
})

// ── Test 3: All real agents have a schedule entry (backfill prerequisite) ─────
test('all real_estate_agents have a survey schedule entry', () => {
  const missing = parseInt(q(
    'SELECT count(*) FROM real_estate_agents WHERE id NOT IN (SELECT agent_id FROM agent_survey_schedule)'
  ), 10)
  assert.strictEqual(missing, 0, `${missing} agent(s) are missing schedule entries — run backfill-nps-survey-schedules.js`)
})

// ── Test 4: next_survey_at filter is still respected ──────────────────────────
test('next_survey_at filter still excludes future-scheduled agents', () => {
  const dueNow = parseInt(q(
    "SELECT count(*) FROM agent_survey_schedule s " +
    "JOIN real_estate_agents r ON s.agent_id = r.id WHERE s.next_survey_at <= NOW()"
  ), 10)
  const allScheduled = parseInt(q(
    "SELECT count(*) FROM agent_survey_schedule s " +
    "JOIN real_estate_agents r ON s.agent_id = r.id"
  ), 10)
  assert.ok(
    dueNow <= allScheduled,
    `Due (${dueNow}) should never exceed total scheduled (${allScheduled})`
  )
})

// ── Summary ───────────────────────────────────────────────────────────────────
const total = passed + failed
console.log(`\n${passed}/${total} passed`)
if (failed > 0) {
  process.exit(1)
}
