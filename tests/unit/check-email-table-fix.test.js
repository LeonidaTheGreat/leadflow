'use strict'

/**
 * Regression guard: check-email routes must query real_estate_agents, not agents.
 *
 * Bug (daea6410 / ecb6ef9b): Both routes queried .from('agents') — the orchestration
 * agents table, which has no customer email field. This caused duplicate email checks
 * to always return "available", allowing duplicate customer accounts.
 *
 * Fix: Routes now query .from('real_estate_agents'), the customer table.
 */

const fs = require('fs')
const path = require('path')

const DASHBOARD = path.resolve(__dirname, '../../product/lead-response/dashboard')

const ROUTES = {
  onboarding: path.join(DASHBOARD, 'app/api/onboarding/check-email/route.ts'),
  agents: path.join(DASHBOARD, 'app/api/agents/check-email/route.ts'),
}

describe('check-email routes — correct table (real_estate_agents)', () => {
  for (const [label, filePath] of Object.entries(ROUTES)) {
    describe(label, () => {
      let content

      beforeAll(() => {
        content = fs.readFileSync(filePath, 'utf8')
      })

      it('queries real_estate_agents table', () => {
        expect(
          content.includes(".from('real_estate_agents')") ||
            content.includes('.from("real_estate_agents")')
        ).toBe(true)
      })

      it('does NOT query the orchestration agents table', () => {
        const nonCommentLines = content
          .split('\n')
          .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
        const badLines = nonCommentLines.filter(
          (line) => line.includes(".from('agents')") || line.includes('.from("agents")')
        )
        expect(badLines).toHaveLength(0)
      })

      it('uses parameterised .eq() filter', () => {
        expect(content).toContain('.eq(')
      })
    })
  }
})
