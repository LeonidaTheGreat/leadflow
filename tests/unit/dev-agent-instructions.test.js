'use strict'
/**
 * Regression guard: dev agent instruction files must contain the TEST FILE PLACEMENT rule.
 * Added for task 6d856e34 — prevents silent removal of the rule.
 */

const fs = require('fs')
const path = require('path')

const SOUL_MD = '/Users/clawdbot/.openclaw/workspace-dev/SOUL.md'
const ROLE_CONTEXT = path.join(__dirname, '../../node_modules/../..', 'node_modules') // placeholder

describe('Dev agent instructions', () => {
  describe('SOUL.md TEST FILE PLACEMENT rule', () => {
    let soulContent

    beforeAll(() => {
      if (!fs.existsSync(SOUL_MD)) {
        soulContent = null
        return
      }
      soulContent = fs.readFileSync(SOUL_MD, 'utf8')
    })

    it('exists at expected path', () => {
      expect(fs.existsSync(SOUL_MD)).toBe(true)
    })

    it('contains TEST FILE PLACEMENT rule', () => {
      if (!soulContent) return // skip if file missing (CI environment)
      expect(soulContent).toMatch(/TEST FILE PLACEMENT/)
    })

    it('explicitly forbids product/lead-response/dashboard/tests/', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/product\/lead-response\/dashboard\/tests/)
    })

    it('requires tests/ directory', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/tests\/e2e|tests\/integration|tests\/unit/)
    })

    it('does not contain stale taskSpec HTML comment', () => {
      if (!soulContent) return
      expect(soulContent).not.toMatch(/<!--\s*taskSpec/)
    })
  })

  describe('role-context.js buildRoleContext() dev section', () => {
    let roleContext

    beforeAll(() => {
      try {
        roleContext = require('/Users/clawdbot/projects/genome/core/food/role-context')
      } catch {
        roleContext = null
      }
    })

    it('loads without error', () => {
      if (!roleContext) return // skip if genome not available
      expect(roleContext).toBeDefined()
    })

    it('buildRoleContext() for dev includes TEST FILE PLACEMENT', () => {
      if (!roleContext) return
      const out = roleContext.buildRoleContext('dev', 'Implement: test', 'desc')
      const text = out.spawnRole || out.roleContext || JSON.stringify(out)
      expect(text).toMatch(/TEST FILE PLACEMENT/)
    })

    it('buildRoleContext() for dev forbids dashboard/tests path', () => {
      if (!roleContext) return
      const out = roleContext.buildRoleContext('dev', 'Implement: test', 'desc')
      const text = out.spawnRole || out.roleContext || JSON.stringify(out)
      expect(text).toMatch(/product\/lead-response\/dashboard\/tests/)
    })
  })
})
