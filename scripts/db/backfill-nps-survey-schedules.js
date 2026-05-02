'use strict'

const { execSync } = require('child_process')

const DB = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'

function psql(sql) {
  return execSync(`psql "${DB}" -t -A -c "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim()
}

const orphaned = psql("DELETE FROM agent_survey_schedule WHERE agent_id NOT IN (SELECT id FROM real_estate_agents)")
console.log('Orphan cleanup:', orphaned)

const backfilled = psql("INSERT INTO agent_survey_schedule (agent_id, next_survey_at, survey_count) SELECT id, created_at + INTERVAL '14 days', 0 FROM real_estate_agents WHERE id NOT IN (SELECT agent_id FROM agent_survey_schedule) ON CONFLICT (agent_id) DO NOTHING")
console.log('Backfill:', backfilled)

const total = psql("SELECT count(*) FROM agent_survey_schedule WHERE agent_id IN (SELECT id FROM real_estate_agents)")
console.log('Total schedule entries for real agents:', total)

const due = psql("SELECT count(*) FROM agent_survey_schedule s JOIN real_estate_agents r ON s.agent_id = r.id WHERE s.next_survey_at <= NOW()")
console.log('Agents due for survey now:', due)
