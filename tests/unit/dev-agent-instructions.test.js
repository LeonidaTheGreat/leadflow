'use strict'
/**
 * Regression guard: dev agent instruction files must contain mandatory rules.
 * task 6d856e34 — TEST FILE PLACEMENT rule
 * task 8a042514 — 4 escalation rules from ORCHESTRATOR-DECISIONS-2026-07-19:
 *   (1) BRANCH-PUSH VERIFICATION before reportSuccess()
 *   (2) GATE-FIX PRE-CHECK before fixing a gate
 *   (3) NO COMPLETION-REPORT JSON in git
 *   (4) UC DONE-TASK CHECK before starting
 * task a4f90022 — PHANTOM COMPLETION PROHIBITION rule:
 *   NEVER call reportSuccess() without verifying branch pushed to GitHub
 * task ab27c3e7 — GATE-FIX PRE-CHECK gate_self_resolved:
 *   If gate already passes, report no-op completed with note "Gate self-resolved"
 * task 2c85a8f1 — ORCHESTRATOR-DECISIONS JSON must never be staged in git:
 *   covers ORCHESTRATOR-DECISIONS-*.json in addition to completion-reports/
 * task 7ca3e70c — GIT NETWORK RESILIENCE rule:
 *   If any git remote operation times out, retry with 30s wait + HTTPS fallback
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

    // Phantom completion prohibition (task a4f90022)
    it('contains PHANTOM COMPLETION PROHIBITION rule', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/PHANTOM COMPLETION PROHIBITION/)
    })

    it('prohibits reportSuccess() without verified remote branch', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/NEVER call.*reportSuccess.*without/)
    })

    // Gate self-resolved no-op rule (task ab27c3e7)
    it('GATE-FIX PRE-CHECK uses gate_self_resolved category', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/gate_self_resolved/)
    })

    it('GATE-FIX PRE-CHECK specifies no-op completed with gate self-resolved note', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/Gate self-resolved/)
    })

    // ORCHESTRATOR-DECISIONS JSON in git prohibition (task 2c85a8f1)
    it('covers ORCHESTRATOR-DECISIONS-*.json in the no-commit rule', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/ORCHESTRATOR-DECISIONS/)
    })

    it('tells dev to check for ORCHESTRATOR-DECISIONS files before committing', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/ORCHESTRATOR-DECISIONS.*\.json/)
    })

    // GIT NETWORK RESILIENCE (task 7ca3e70c)
    it('contains GIT NETWORK RESILIENCE rule', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/GIT NETWORK RESILIENCE/)
    })

    it('GIT NETWORK RESILIENCE specifies HTTPS fallback URL', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/https:\/\/github\.com\/LeonidaTheGreat\/leadflow\.git/)
    })

    it('GIT NETWORK RESILIENCE instructs retry before failing', () => {
      if (!soulContent) return
      expect(soulContent).toMatch(/do NOT immediately fail/)
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

    // Phantom completion prohibition (task a4f90022)
    it('PHANTOM COMPLETION PROHIBITION present in spawnRole', () => {
      if (!roleContext) return
      const out = roleContext.buildRoleContext('dev', 'Implement: test', 'desc')
      const text = out.spawnRole || out.roleContext || JSON.stringify(out)
      expect(text).toMatch(/PHANTOM COMPLETION PROHIBITION/)
    })

    it('reportSuccess prohibition without verified branch present in spawnRole', () => {
      if (!roleContext) return
      const out = roleContext.buildRoleContext('dev', 'Implement: test', 'desc')
      const text = out.spawnRole || out.roleContext || JSON.stringify(out)
      expect(text).toMatch(/NEVER call reportSuccess\(\) without first verifying/)
    })

    // Gate self-resolved no-op rule (task ab27c3e7)
    it('GATE-FIX PRE-CHECK uses gate_self_resolved category in fix-task spawnRole', () => {
      if (!roleContext) return
      const out = roleContext.buildRoleContext('dev', 'Fix: build failures', 'desc')
      const text = out.spawnRole || out.roleContext || JSON.stringify(out)
      expect(text).toMatch(/gate_self_resolved/)
    })

    it('GATE-FIX PRE-CHECK instructs gate self-resolved note in fix-task spawnRole', () => {
      if (!roleContext) return
      const out = roleContext.buildRoleContext('dev', 'Fix: build failures', 'desc')
      const text = out.spawnRole || out.roleContext || JSON.stringify(out)
      expect(text).toMatch(/Gate self-resolved/)
    })

    // ORCHESTRATOR-DECISIONS JSON in git prohibition (task 2c85a8f1)
    it('Gate 5 catches ORCHESTRATOR-DECISIONS JSON files', () => {
      if (!roleContext) return
      const out = roleContext.buildRoleContext('dev', 'Implement: test', 'desc')
      const text = out.spawnRole || out.roleContext || JSON.stringify(out)
      expect(text).toMatch(/ORCHESTRATOR-DECISIONS/)
    })

    // GIT NETWORK RESILIENCE (task 7ca3e70c)
    it('GIT NETWORK RESILIENCE present in spawnRole', () => {
      if (!roleContext) return
      const out = roleContext.buildRoleContext('dev', 'Implement: test', 'desc')
      const text = out.spawnRole || out.roleContext || JSON.stringify(out)
      expect(text).toMatch(/GIT NETWORK RESILIENCE/)
    })

    it('GIT NETWORK RESILIENCE specifies HTTPS fallback URL in spawnRole', () => {
      if (!roleContext) return
      const out = roleContext.buildRoleContext('dev', 'Implement: test', 'desc')
      const text = out.spawnRole || out.roleContext || JSON.stringify(out)
      expect(text).toMatch(/https:\/\/github\.com\/LeonidaTheGreat\/leadflow\.git/)
    })
  })
})
