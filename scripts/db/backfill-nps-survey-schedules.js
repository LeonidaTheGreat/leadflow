/*
TASK SPEC (d68cc35c-49d7-4db0-9e8a-643f64384157)
What:
- Update scripts/db/backfill-nps-survey-schedules.js: `runBackfill` and SQL constants to
  1) delete orphan `agent_survey_schedule` rows and
  2) backfill missing schedules using `first_survey_at = created_at + interval '14 days'`,
     with `next_survey_at = NOW()` when first survey is overdue.
- Add tests/integration/backfill-nps-survey-schedules.test.js to verify SQL includes overdue clamp
  and required verification queries.
Verify:
- node tests/integration/backfill-nps-survey-schedules.test.js
- node scripts/db/backfill-nps-survey-schedules.js
- psql "$LOCAL_PG_URL" -c "SELECT COUNT(*) FROM agent_survey_schedule WHERE agent_id NOT IN (SELECT id FROM real_estate_agents);"
- psql "$LOCAL_PG_URL" -c "SELECT COUNT(*) FROM agent_survey_schedule WHERE agent_id IN (SELECT id FROM real_estate_agents);"
- psql "$LOCAL_PG_URL" -c "SELECT COUNT(*) FROM agent_survey_schedule WHERE next_survey_at <= NOW();"
Boundaries:
- Do not change routes, dashboard NPS service code, or database schema/migrations.
- Do not modify unrelated scripts or business logic.
*/
'use strict'

const { execSync } = require('child_process')

const DB = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'

const SQL_DELETE_ORPHANS = 'DELETE FROM agent_survey_schedule WHERE agent_id NOT IN (SELECT id FROM real_estate_agents)'
const SQL_BACKFILL_MISSING = `INSERT INTO agent_survey_schedule (agent_id, next_survey_at, survey_count)
SELECT
  a.id,
  CASE
    WHEN a.created_at + INTERVAL '14 days' < NOW() THEN NOW()
    ELSE a.created_at + INTERVAL '14 days'
  END AS next_survey_at,
  0
FROM real_estate_agents a
WHERE NOT EXISTS (
  SELECT 1 FROM agent_survey_schedule s WHERE s.agent_id = a.id
)
ON CONFLICT (agent_id) DO NOTHING`
const SQL_COUNT_ORPHANS = 'SELECT count(*) FROM agent_survey_schedule WHERE agent_id NOT IN (SELECT id FROM real_estate_agents)'
const SQL_COUNT_VALID_SCHEDULES = 'SELECT count(*) FROM agent_survey_schedule WHERE agent_id IN (SELECT id FROM real_estate_agents)'
const SQL_COUNT_DUE_NOW = 'SELECT count(*) FROM agent_survey_schedule WHERE next_survey_at <= NOW()'

function psql(sql) {
  return execSync(`psql "${DB}" -t -A -c "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim()
}

function runBackfill() {
  const orphaned = psql(SQL_DELETE_ORPHANS)
  console.log('Orphan cleanup:', orphaned)

  const backfilled = psql(SQL_BACKFILL_MISSING)
  console.log('Backfill:', backfilled)

  const remainingOrphans = psql(SQL_COUNT_ORPHANS)
  console.log('Orphans remaining:', remainingOrphans)

  const total = psql(SQL_COUNT_VALID_SCHEDULES)
  console.log('Total schedule entries for real agents:', total)

  const due = psql(SQL_COUNT_DUE_NOW)
  console.log('Agents due for survey now:', due)
}

if (require.main === module) {
  runBackfill()
}

module.exports = {
  SQL_BACKFILL_MISSING,
  SQL_COUNT_DUE_NOW,
  SQL_COUNT_ORPHANS,
  SQL_COUNT_VALID_SCHEDULES,
  SQL_DELETE_ORPHANS,
  runBackfill
}
