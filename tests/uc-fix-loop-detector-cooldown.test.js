/**
 * Tests for uc-fix-loop-detector-cooldown
 * Verifies all three acceptance criteria:
 * 1. Migration 006 applied — distribution_channels table has landing_page record
 * 2. Loop detector uses 24h cooldown (twentyFourHoursAgo variable)
 * 3. UC completion gate uses single string literal in distribution-collector.js
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const PSQL = '/opt/homebrew/Cellar/postgresql@16/16.13/bin/psql'
const PG_DSN = 'postgresql://clawdbot@localhost/openclaw'
const TASK_STORE = path.join(process.env.HOME, '.openclaw/genome/core/task-store.js')
const DIST_COLLECTOR = path.join(process.env.HOME, '.openclaw/genome/scripts/distribution-collector.js')

describe('uc-fix-loop-detector-cooldown acceptance checks', () => {
  // AC-1: Migration 006 applied — landing page record present in local PG
  test('migration-applied: distribution_channels has active landing_page for leadflow', () => {
    const result = execSync(
      `${PSQL} ${PG_DSN} -t -c "SELECT COUNT(*) FROM distribution_channels WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'"`,
      { encoding: 'utf-8' }
    ).trim()
    expect(result).toBe('1')
  })

  // AC-2: Loop detector uses 24h cooldown window
  test('cooldown-code-present: task-store.js contains twentyFourHoursAgo', () => {
    const content = fs.readFileSync(TASK_STORE, 'utf-8')
    const count = (content.match(/twentyFourHoursAgo/g) || []).length
    // Check via grep -c (lines containing the string)
    const grepResult = execSync(`grep -c "twentyFourHoursAgo" ${TASK_STORE}`, { encoding: 'utf-8' }).trim()
    expect(grepResult).toBe('1')
    expect(count).toBeGreaterThanOrEqual(1)
  })

  // AC-3: UC gate present — gtm-landing-page appears exactly once in distribution-collector.js
  test('uc-gate-present: distribution-collector.js contains gtm-landing-page exactly once', () => {
    const grepResult = execSync(`grep -c "gtm-landing-page" ${DIST_COLLECTOR}`, { encoding: 'utf-8' }).trim()
    expect(grepResult).toBe('1')
  })

  // Bonus: Verify UC_LANDING_PAGE constant is defined
  test('distribution-collector.js defines UC_LANDING_PAGE constant', () => {
    const content = fs.readFileSync(DIST_COLLECTOR, 'utf-8')
    expect(content).toContain("const UC_LANDING_PAGE = 'gtm-landing-page'")
  })

  // Bonus: Verify 24h window is actually used (not 30min)
  test('task-store.js uses 24h cooldown (24 * 60 * 60 * 1000)', () => {
    const content = fs.readFileSync(TASK_STORE, 'utf-8')
    expect(content).toContain('24 * 60 * 60 * 1000')
    // 30-min window should no longer be used in the loop detection block
    const loopDetectBlock = content.match(/Runtime loop detection[\s\S]{0,800}twentyFourHoursAgo/)
    expect(loopDetectBlock).not.toBeNull()
  })
})
