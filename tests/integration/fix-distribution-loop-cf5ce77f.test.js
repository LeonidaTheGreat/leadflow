/**
 * Tests for Fix Distribution Loop — Wave 6/8
 * Task: cf5ce77f-5273-468f-88e7-f24c56894eef
 *
 * Verifies:
 *   1. distribution_channels table exists in local PG with active landing page
 *   2. distribution-collector.js has UC completion gate (UC_ISSUE_MAP + completedUcIds)
 *   3. distribution-collector.js has 30-min task cooldown
 *   4. task-store.js loop detector uses timestamp-based dedup (thirtyMinutesAgo)
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const assert = require('assert').strict

const DISTRIBUTION_COLLECTOR = path.join(require('os').homedir(), '.openclaw', 'genome', 'scripts', 'distribution-collector.js')
const TASK_STORE = path.join(require('os').homedir(), '.openclaw', 'genome', 'core', 'task-store.js')
const PSQL = '/opt/homebrew/Cellar/postgresql@16/16.13/bin/psql'
const PG_URL = 'postgresql://clawdbot@localhost/openclaw'

// ── Helpers ──────────────────────────────────────────────────────────────────

function pgQuery(sql) {
  return execSync(`${PSQL} "${PG_URL}" -tAc "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim()
}

function grepCount(file, pattern) {
  try {
    const result = execSync(`grep -cE '${pattern}' '${file}'`, { encoding: 'utf8' }).trim()
    return parseInt(result, 10)
  } catch (e) {
    // grep exits 1 when no matches
    return 0
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Fix Distribution Loop (cf5ce77f)', () => {
  describe('AC-1 + AC-2: distribution_channels table and landing page seed', () => {
    it('distribution_channels table exists in local PG', () => {
      const result = pgQuery('SELECT COUNT(*) FROM information_schema.tables WHERE table_name=\'distribution_channels\'')
      assert.strictEqual(parseInt(result, 10), 1)
    })

    it('active landing page row exists for leadflow project', () => {
      const count = pgQuery(
        "SELECT COUNT(*) FROM distribution_channels WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'"
      )
      assert.ok(parseInt(count, 10) >= 1, 'Expected at least 1 active landing page row')
    })
  })

  describe('AC-3: UC completion gate in distribution-collector.js', () => {
    it('distribution-collector.js contains UC_ISSUE_MAP definition', () => {
      const content = fs.readFileSync(DISTRIBUTION_COLLECTOR, 'utf8')
      assert.ok(content.includes('UC_ISSUE_MAP'), 'UC_ISSUE_MAP should be defined')
    })

    it('distribution-collector.js checks completedUcIds before pushing issues', () => {
      const content = fs.readFileSync(DISTRIBUTION_COLLECTOR, 'utf8')
      assert.ok(content.includes('completedUcIds'), 'completedUcIds should be used for UC gate checks')
    })

    it('UC_ISSUE_MAP covers all 5 issue types', () => {
      const content = fs.readFileSync(DISTRIBUTION_COLLECTOR, 'utf8')
      assert.ok(content.includes('no_landing_page'), 'Should include no_landing_page')
      assert.ok(content.includes('zero_traffic'), 'Should include zero_traffic')
      assert.ok(content.includes('zero_signups'), 'Should include zero_signups')
      assert.ok(content.includes('low_conversion'), 'Should include low_conversion')
      assert.ok(content.includes('low_trial_conversion'), 'Should include low_trial_conversion')
    })

    it('grep -c of UC_ISSUE_MAP|completedUcIds in distribution-collector.js >= 2', () => {
      const count = grepCount(DISTRIBUTION_COLLECTOR, 'completedUcIds|UC_ISSUE_MAP')
      assert.ok(count >= 2, `Expected grep count >= 2, got ${count}`)
    })
  })

  describe('AC-4: 30-min task cooldown in distribution-collector.js', () => {
    it('distribution-collector.js contains thirtyMinutesAgo variable', () => {
      const content = fs.readFileSync(DISTRIBUTION_COLLECTOR, 'utf8')
      assert.ok(content.includes('thirtyMinutesAgo'), 'thirtyMinutesAgo variable should be defined')
    })

    it('30-min cooldown is computed from 30 * 60 * 1000', () => {
      const content = fs.readFileSync(DISTRIBUTION_COLLECTOR, 'utf8')
      assert.ok(content.includes('30 * 60 * 1000'), '30-min window should be computed as 30 * 60 * 1000')
    })

    it('grep -c thirtyMinutesAgo in distribution-collector.js >= 1', () => {
      const count = grepCount(DISTRIBUTION_COLLECTOR, 'thirtyMinutesAgo')
      assert.ok(count >= 1, `Expected grep count >= 1, got ${count}`)
    })
  })

  describe('AC-5: timestamp-based loop dedup in task-store.js', () => {
    it('task-store.js contains thirtyMinutesAgo variable', () => {
      const content = fs.readFileSync(TASK_STORE, 'utf8')
      assert.ok(content.includes('thirtyMinutesAgo'), 'thirtyMinutesAgo variable should be defined in task-store.js')
    })

    it('task-store.js loop detector uses .gte with timestamp (not status check)', () => {
      const content = fs.readFileSync(TASK_STORE, 'utf8')
      // Should have .gte('created_at', thirtyMinutesAgo) in the loop detection block
      const pattern = /\.gte\('created_at',\s*thirtyMinutesAgo\)/
      assert.ok(pattern.test(content), 'task-store.js should use .gte with timestamp for loop detection')
    })

    it('grep -c thirtyMinutesAgo in task-store.js >= 1', () => {
      const count = grepCount(TASK_STORE, 'thirtyMinutesAgo')
      assert.ok(count >= 1, `Expected grep count >= 1, got ${count}`)
    })
  })
})
