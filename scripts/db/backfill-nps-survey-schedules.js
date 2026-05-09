'use strict'

/*
taskSpec:
What:
- Change /scripts/db/backfill-nps-survey-schedules.js:
  - keep orphan deletion query for agent_survey_schedule
  - update backfill INSERT SELECT so next_survey_at = NOW() when created_at + 14 days is in the past, otherwise created_at + 14 days
  - keep verification count queries for total scheduled real agents and due-now agents
Verify:
- Run: node scripts/db/backfill-nps-survey-schedules.js
- Run: psql -d openclaw -t -A -c "SELECT count(*) FROM agent_survey_schedule WHERE agent_id NOT IN (SELECT id FROM real_estate_agents);" (expect 0)
- Run: psql -d openclaw -t -A -c "SELECT count(*) FROM agent_survey_schedule WHERE agent_id IN (SELECT id FROM real_estate_agents);" (expect 63)
- Run: psql -d openclaw -t -A -c "SELECT count(*) FROM agent_survey_schedule WHERE next_survey_at <= NOW();" (expect >= 4)
- Run tests/build gates: npm run lint, npm test, npm run build, npm audit --audit-level=high
Boundaries:
- Do not change NPS API route/service behavior
- Do not modify database schema or migrations
- Do not alter unrelated cron routes or dashboard UI
*/

const { execSync } = require('child_process')

const DB = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'

function psql(sql) {
  return execSync(`psql "${DB}" -t -A -c "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim()
}

const orphaned = psql("DELETE FROM agent_survey_schedule WHERE agent_id NOT IN (SELECT id FROM real_estate_agents)")
console.log('Orphan cleanup:', orphaned)

const backfilled = psql("INSERT INTO agent_survey_schedule (agent_id, next_survey_at, survey_count) SELECT id, CASE WHEN created_at + INTERVAL '14 days' < NOW() THEN NOW() ELSE created_at + INTERVAL '14 days' END, 0 FROM real_estate_agents WHERE id NOT IN (SELECT agent_id FROM agent_survey_schedule) ON CONFLICT (agent_id) DO NOTHING")
console.log('Backfill:', backfilled)

const total = psql("SELECT count(*) FROM agent_survey_schedule WHERE agent_id IN (SELECT id FROM real_estate_agents)")
console.log('Total schedule entries for real agents:', total)

const due = psql("SELECT count(*) FROM agent_survey_schedule s JOIN real_estate_agents r ON s.agent_id = r.id WHERE s.next_survey_at <= NOW()")
console.log('Agents due for survey now:', due)
