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

const DISTRIBUTION_COLLECTOR = path.resolve('/Users/clawdbot/.openclaw/genome/scripts/distribution-collector.js')
const TASK_STORE = path.resolve('/Users/clawdbot/.openclaw/genome/core/task-store.js')
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
      expect(parseInt(result, 10)).toBe(1)
    })

    it('active landing page row exists for leadflow project', () => {
      const count = pgQuery(
        "SELECT COUNT(*) FROM distribution_channels WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'"
      )
      expect(parseInt(count, 10)).toBeGreaterThanOrEqual(1)
    })
  })

  describe('AC-3: UC completion gate in distribution-collector.js', () => {
    it('distribution-collector.js contains UC_ISSUE_MAP definition', () => {
      const content = fs.readFileSync(DISTRIBUTION_COLLECTOR, 'utf8')
      expect(content).toContain('UC_ISSUE_MAP')
    })

    it('distribution-collector.js checks completedUcIds before pushing issues', () => {
      const content = fs.readFileSync(DISTRIBUTION_COLLECTOR, 'utf8')
      expect(content).toContain('completedUcIds')
    })

    it('UC_ISSUE_MAP covers all 5 issue types', () => {
      const content = fs.readFileSync(DISTRIBUTION_COLLECTOR, 'utf8')
      expect(content).toContain('no_landing_page')
      expect(content).toContain('zero_traffic')
      expect(content).toContain('zero_signups')
      expect(content).toContain('low_conversion')
      expect(content).toContain('low_trial_conversion')
    })

    it('grep -c of UC_ISSUE_MAP|completedUcIds in distribution-collector.js >= 2', () => {
      const count = grepCount(DISTRIBUTION_COLLECTOR, 'completedUcIds|UC_ISSUE_MAP')
      expect(count).toBeGreaterThanOrEqual(2)
    })
  })

  describe('AC-4: 30-min task cooldown in distribution-collector.js', () => {
    it('distribution-collector.js contains thirtyMinutesAgo variable', () => {
      const content = fs.readFileSync(DISTRIBUTION_COLLECTOR, 'utf8')
      expect(content).toContain('thirtyMinutesAgo')
    })

    it('30-min cooldown is computed from 30 * 60 * 1000', () => {
      const content = fs.readFileSync(DISTRIBUTION_COLLECTOR, 'utf8')
      expect(content).toContain('30 * 60 * 1000')
    })

    it('grep -c thirtyMinutesAgo in distribution-collector.js >= 1', () => {
      const count = grepCount(DISTRIBUTION_COLLECTOR, 'thirtyMinutesAgo')
      expect(count).toBeGreaterThanOrEqual(1)
    })
  })

  describe('AC-5: timestamp-based loop dedup in task-store.js', () => {
    it('task-store.js contains thirtyMinutesAgo variable', () => {
      const content = fs.readFileSync(TASK_STORE, 'utf8')
      expect(content).toContain('thirtyMinutesAgo')
    })

    it('task-store.js loop detector uses .gte with timestamp (not status check)', () => {
      const content = fs.readFileSync(TASK_STORE, 'utf8')
      // Should have .gte('created_at', thirtyMinutesAgo) in the loop detection block
      expect(content).toMatch(/\.gte\('created_at',\s*thirtyMinutesAgo\)/)
    })

    it('grep -c thirtyMinutesAgo in task-store.js >= 1', () => {
      const count = grepCount(TASK_STORE, 'thirtyMinutesAgo')
      expect(count).toBeGreaterThanOrEqual(1)
    })
  })
})
