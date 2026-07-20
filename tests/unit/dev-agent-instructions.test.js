'use strict'
/**
 * Regression guard: dev agent instruction files must contain mandatory rules.
 * task 6d856e34 — TEST FILE PLACEMENT rule
 * task 8a042514 — 4 escalation rules from ORCHESTRATOR-DECISIONS-2026-07-19:
 *   (1) BRANCH-PUSH VERIFICATION before reportSuccess()
 *   (2) GATE-FIX PRE-CHECK before fixing a gate
 *   (3) NO COMPLETION-REPORT JSON in git
 *   (4) UC DONE-TASK CHECK before starting
 */

const fs = require('fs')

const SOUL_MD = '/Users/clawdbot/.openclaw/workspace-dev/SOUL.md'
const ROLE_CONTEXT_PATH = '/Users/clawdbot/projects/genome/core/food/role-context'

describe('Dev agent instructions', () => {
  describe('SOUL.md rules', () => {
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
      if (!soulContent) return
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

    // Escalation rules from ORCHESTRATOR-DECISIONS-2026-07-19 (task 8a042514)
    it('BRANCH-PUSH VERIFICATION explicitly tied to before reportSuccess()', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/before reportSuccess\(\)/)
    })

    it('contains GATE-FIX PRE-CHECK rule', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/GATE-FIX PRE-CHECK/)
    })

    it('contains NO COMPLETION-REPORT JSON IN GIT rule', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/NO COMPLETION-REPORT JSON IN GIT|completion-reports\/COMPLETION/)
    })

    it('contains UC DONE-TASK CHECK rule', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/UC DONE-TASK CHECK/)
    })
  })

  describe('role-context.js buildRoleContext() dev section', () => {
    let roleContext

    beforeAll(() => {
      try {
        roleContext = require(ROLE_CONTEXT_PATH)
      } catch {
        roleContext = null
      }
    })

    it('loads without error', () => {
      if (!roleContext) return
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

    // Escalation rules from ORCHESTRATOR-DECISIONS-2026-07-19 (task 8a042514)
    it('BRANCH-PUSH VERIFICATION explicitly before reportSuccess()', () => {
      if (!roleContext) return
      const out = roleContext.buildRoleContext('dev', 'Implement: test', 'desc')
      const text = out.spawnRole || out.roleContext || JSON.stringify(out)
      expect(text).toMatch(/before reportSuccess\(\)/)
    })

    it('GATE-FIX PRE-CHECK present in fix-task spawnRole', () => {
      if (!roleContext) return
      const out = roleContext.buildRoleContext('dev', 'Fix: build failures', 'desc')
      const text = out.spawnRole || out.roleContext || JSON.stringify(out)
      expect(text).toMatch(/GATE-FIX PRE-CHECK/)
    })

    it('Gate 5 catches completion-reports JSON files', () => {
      if (!roleContext) return
      const out = roleContext.buildRoleContext('dev', 'Implement: test', 'desc')
      const text = out.spawnRole || out.roleContext || JSON.stringify(out)
      expect(text).toMatch(/completion-reports/)
    })

    it('UC DONE-TASK CHECK present in spawnRole', () => {
      if (!roleContext) return
      const out = roleContext.buildRoleContext('dev', 'Implement: test', 'desc')
      const text = out.spawnRole || out.roleContext || JSON.stringify(out)
      expect(text).toMatch(/UC DONE-TASK CHECK/)
    })
  })
})
