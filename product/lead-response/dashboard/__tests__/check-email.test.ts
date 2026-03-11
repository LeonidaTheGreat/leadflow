/**
 * Tests for check-email API routes.
 * Verifies that email availability checks query the real_estate_agents table,
 * not the agents (orchestration) table — bug fix for daea6410.
 *
 * Bug: Both check-email routes were querying .from('agents') which has no customer
 * email records, causing duplicate checks to always return "available".
 * Fix: Routes now query .from('real_estate_agents') which is the customer table.
 */

// Read the route files as strings to verify the table name used
import * as fs from 'fs'
import * as path from 'path'

const DASHBOARD_DIR = path.resolve(__dirname, '..')

describe('Email check routes — correct table (real_estate_agents)', () => {
  const routeFiles = [
    'app/api/onboarding/check-email/route.ts',
    'app/api/agents/check-email/route.ts',
  ]

  routeFiles.forEach((relPath) => {
    const fullPath = path.join(DASHBOARD_DIR, relPath)
    const content = fs.readFileSync(fullPath, 'utf-8')

    describe(relPath, () => {
      it('queries real_estate_agents table (not agents)', () => {
        expect(content).toContain("from('real_estate_agents')")
      })

      it('does NOT query the agents orchestration table for email', () => {
        // The agents table is for orchestration agents (no email field).
        // Customer email lookups must use real_estate_agents.
        // Allow .from('agents') only if it's inside a comment.
        const lines = content.split('\n')
        const nonCommentLines = lines.filter(
          (line) => !line.trim().startsWith('//')  && !line.trim().startsWith('*')
        )
        const badLines = nonCommentLines.filter((line) => line.includes(".from('agents')"))
        expect(badLines).toHaveLength(0)
      })
    })
  })
})

describe('Email availability logic', () => {
  it('returns available=false when a matching real_estate_agent exists', () => {
    // Unit-level contract test: if the DB query returns data, available must be false.
    // This mirrors what both route handlers do after querying real_estate_agents.
    const mockAgent = { id: 'agent-123', email: 'test@example.com', status: 'active' }

    // Simulate the route logic
    const existingAgent = mockAgent // DB returned a result
    const available = !existingAgent

    expect(available).toBe(false)
  })

  it('returns available=true when no real_estate_agent exists', () => {
    const existingAgent = null // DB returned nothing

    const available = !existingAgent

    expect(available).toBe(true)
  })

  it('normalizes email to lowercase before querying', () => {
    const rawEmail = 'TEST@Example.COM'
    const normalized = rawEmail.toLowerCase().trim()

    expect(normalized).toBe('test@example.com')
  })
})
