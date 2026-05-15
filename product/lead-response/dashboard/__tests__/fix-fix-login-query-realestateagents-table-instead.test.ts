/**
 * Task Spec
 * What:
 * - Change file: product/lead-response/dashboard/__tests__/fix-fix-login-query-realestateagents-table-instead.test.ts
 * - Add a regression test that validates app/api/auth/login/route.ts queries real_estate_agents and does not query agents.
 * Verify:
 * - Run: cd product/lead-response/dashboard && npm test -- --runTestsByPath __tests__/fix-fix-login-query-realestateagents-table-instead.test.ts
 * - Run: cd /private/var/folders/6d/xd0z4ldx1l17klqt54scqxsc0000gp/T/leadflow-7d9e8113-2c44-4eec-987b-1d257ef3584b && npm test
 * - Run: cd /private/var/folders/6d/xd0z4ldx1l17klqt54scqxsc0000gp/T/leadflow-7d9e8113-2c44-4eec-987b-1d257ef3584b && npm run build
 * - Expected: tests pass and build succeeds; login route contains from('real_estate_agents') and no executable from('agents').
 * Boundaries:
 * - Do not modify runtime login logic or database schema.
 * - Do not touch unrelated routes/services.
 * - Only add regression coverage for this specific table-selection behavior.
 */

import * as fs from 'fs'
import * as path from 'path'

const DASHBOARD_DIR = path.resolve(__dirname, '..')
const LOGIN_ROUTE = path.join(DASHBOARD_DIR, 'app/api/auth/login/route.ts')

describe('Login route table selection regression', () => {
  const content = fs.readFileSync(LOGIN_ROUTE, 'utf-8')

  it('queries real_estate_agents for credential lookup', () => {
    expect(content).toContain("from('real_estate_agents')")
  })

  it('does not query agents table in executable code', () => {
    const lines = content.split('\n')
    const nonCommentLines = lines.filter((line) => {
      const trimmed = line.trim()
      return !trimmed.startsWith('//') && !trimmed.startsWith('*')
    })

    const badLines = nonCommentLines.filter((line) =>
      line.includes("from('agents')") || line.includes('from("agents")')
    )

    expect(badLines).toHaveLength(0)
  })
})
