'use strict'

const fs = require('fs')
const path = require('path')

describe('backfill-nps-survey-schedules script', () => {
  const SCRIPT_PATH = path.join(__dirname, '../../scripts/db/backfill-nps-survey-schedules.js')
  let content

  beforeAll(() => {
    content = fs.readFileSync(SCRIPT_PATH, 'utf8')
  })

  test('deletes orphaned survey schedule rows', () => {
    expect(content).toContain('DELETE FROM agent_survey_schedule WHERE agent_id NOT IN (SELECT id FROM real_estate_agents)')
  })

  test('backfills missing schedules using NOW() when first survey date is already in the past', () => {
    expect(content).toContain("CASE WHEN created_at + INTERVAL '14 days' < NOW() THEN NOW() ELSE created_at + INTERVAL '14 days' END")
  })
})
