'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const NPS_SERVICE_PATH = path.join(__dirname, '../../product/lead-response/dashboard/lib/nps-service.ts')

describe('NPS survey eligibility - no status filter', () => {
  let npsServiceContent

  beforeAll(() => {
    npsServiceContent = fs.readFileSync(NPS_SERVICE_PATH, 'utf8')
  })

  test('getAgentsDueForSurvey does not filter by agent status', () => {
    const fnMatch = npsServiceContent.match(
      /export async function getAgentsDueForSurvey[\s\S]*?^}/m
    )
    expect(fnMatch).toBeTruthy()

    const fnBody = fnMatch[0]
    expect(fnBody).not.toContain(".eq('real_estate_agents.status'")
    expect(fnBody).not.toContain('.eq("real_estate_agents.status"')
  })

  test('getAgentsDueForSurvey still filters by next_survey_at', () => {
    const fnMatch = npsServiceContent.match(
      /export async function getAgentsDueForSurvey[\s\S]*?^}/m
    )
    const fnBody = fnMatch[0]
    expect(fnBody).toContain(".lte('next_survey_at'")
  })

  test('getAgentsDueForSurvey joins real_estate_agents via inner join', () => {
    const fnMatch = npsServiceContent.match(
      /export async function getAgentsDueForSurvey[\s\S]*?^}/m
    )
    const fnBody = fnMatch[0]
    expect(fnBody).toContain('real_estate_agents!inner')
  })

  test('all real_estate_agents have survey schedule entries (DB check)', () => {
    const result = execSync(
      'psql -d openclaw -t -A -c "SELECT count(*) FROM real_estate_agents WHERE id NOT IN (SELECT agent_id FROM agent_survey_schedule)"',
      { encoding: 'utf8' }
    ).trim()
    expect(result).toBe('0')
  })

  test('no orphaned schedule entries exist (DB check)', () => {
    const result = execSync(
      'psql -d openclaw -t -A -c "SELECT count(*) FROM agent_survey_schedule WHERE agent_id NOT IN (SELECT id FROM real_estate_agents)"',
      { encoding: 'utf8' }
    ).trim()
    expect(result).toBe('0')
  })

  test('at least 1 agent is due for survey now (DB check)', () => {
    const result = execSync(
      'psql -d openclaw -t -A -c "SELECT count(*) FROM agent_survey_schedule s JOIN real_estate_agents r ON s.agent_id = r.id WHERE s.next_survey_at <= NOW()"',
      { encoding: 'utf8' }
    ).trim()
    expect(parseInt(result, 10)).toBeGreaterThanOrEqual(1)
  })
})
