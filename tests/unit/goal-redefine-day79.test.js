'use strict'
/**
 * Tests: Day 79 goal redefinition
 *
 * Verifies:
 * 1. project_goals DB has first_paying_customer milestone
 * 2. MRR goal target_date pushed to Day 180 (2026-08-13)
 * 3. Revenue-collector switch handles first_paying_customer goal type
 */

const { execSync } = require('child_process')

// -- Helper: query local PG --------------------------------------------------

function pgQuery(sql) {
  const result = execSync(
    `psql postgresql://clawdbot@localhost/openclaw -t -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8' }
  ).trim()
  return result
}

// ---------------------------------------------------------------------------

describe('Goal redefinition — Day 79 reality check', () => {
  test('first_paying_customer goal exists in project_goals', () => {
    const row = pgQuery(
      "SELECT goal_type FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer' AND status='active'"
    )
    expect(row).toContain('first_paying_customer')
  })

  test('first_paying_customer target_value is 1 (single subscriber)', () => {
    const row = pgQuery(
      "SELECT target_value FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'"
    )
    expect(row.trim()).toBe('1')
  })

  test('first_paying_customer target_date is Day 90 (2026-05-15)', () => {
    const row = pgQuery(
      "SELECT target_date FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'"
    )
    expect(row).toContain('2026-05-15')
  })

  test('MRR goal target_date pushed to Day 180 (2026-08-13)', () => {
    const row = pgQuery(
      "SELECT target_date FROM project_goals WHERE project_id='leadflow' AND goal_type='mrr'"
    )
    expect(row).toContain('2026-08-13')
  })

  test('MRR goal target_value remains 20000', () => {
    const row = pgQuery(
      "SELECT target_value FROM project_goals WHERE project_id='leadflow' AND goal_type='mrr'"
    )
    expect(row.trim()).toBe('20000')
  })

  test('revenue-collector handles first_paying_customer goal type', () => {
    const fs = require('fs')
    const collectorPath = `${process.env.HOME}/.openclaw/genome/scripts/revenue-collector.js`
    const src = fs.readFileSync(collectorPath, 'utf8')
    expect(src).toContain("case 'first_paying_customer':")
    // Should set currentValue to 1 when active_subscribers > 0
    expect(src).toContain('active_subscribers > 0 ? 1 : 0')
  })

  test('PMF.md documents revised near-term milestone', () => {
    const fs = require('fs')
    const pmf = fs.readFileSync(`${__dirname}/../../PMF.md`, 'utf8')
    expect(pmf).toContain('First paying customer by Day 90')
    expect(pmf).toContain('2026-08-13')
    expect(pmf).toContain('Near-Term Milestone')
  })
})
