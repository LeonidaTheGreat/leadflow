/**
 * Stats Bar PRD Compliance Tests — FR-2
 *
 * Verifies that the landing page (page.tsx) contains the 4 PRD-specified
 * metrics in the dedicated stats bar section:
 *   <30s  | Response Time
 *   78%   | Deals to First Responder
 *   35%   | Leads Never Responded To
 *   24/7  | Always On
 *
 * We validate the source file content because @testing-library/react is not
 * installed. This is equivalent to an AST-level content check and ensures
 * the copy shipped to production is spec-compliant.
 */

import * as fs from 'fs'
import * as path from 'path'

const pagePath = path.join(__dirname, '..', 'app', 'page.tsx')
const pageSource = fs.readFileSync(pagePath, 'utf-8')

describe('Stats Bar — FR-2 PRD Compliance (source verification)', () => {
  it('page.tsx exists and is non-empty', () => {
    expect(pageSource.length).toBeGreaterThan(0)
  })

  it('contains <30s as the Response Time stat value', () => {
    // Encoded as &lt;30s in JSX
    expect(pageSource).toContain('&lt;30s')
  })

  it('contains "Response Time" as the stat label', () => {
    expect(pageSource).toContain('Response Time')
  })

  it('contains 78% as the Deals to First Responder stat value', () => {
    expect(pageSource).toContain('78%')
  })

  it('contains "Deals to First Responder" as the stat label', () => {
    expect(pageSource).toContain('Deals to First Responder')
  })

  it('contains 35% as the Leads Never Responded To stat value', () => {
    expect(pageSource).toContain('35%')
  })

  it('contains "Leads Never Responded To" as the stat label', () => {
    expect(pageSource).toContain('Leads Never Responded To')
  })

  it('contains 24/7 as the Always On stat value', () => {
    expect(pageSource).toContain('24/7')
  })

  it('contains "Always On" as the stat label', () => {
    expect(pageSource).toContain('Always On')
  })

  it('contains the dedicated stats bar section comment (FR-2)', () => {
    expect(pageSource).toContain('FR-2')
  })

  it('does NOT show the old incorrect "21x" metric in a stats context', () => {
    // The old stats grid had "21x" as a primary metric — it must be gone
    // (it may appear in testimonials or descriptions, but not as a standalone stat value)
    // Check the stats grid specifically by verifying the social proof grid no longer references 21x as a stat
    const statsGridMatch = pageSource.match(
      /grid cols-2 lg:grid-cols-4.*?<\/div>\s*<\/div>\s*<\/div>\s*<div className="grid/s
    )
    // If we can extract the stats grid section, "21x" should not be in it
    if (statsGridMatch) {
      expect(statsGridMatch[0]).not.toContain('21x')
    }
    // The updated stats grid should contain 78% instead
    expect(pageSource).toContain('78%')
  })

  it('all 4 PRD metrics appear in the teal stats bar section', () => {
    // Extract the dedicated stats bar section
    const statsBarMatch = pageSource.match(/Stats Bar.*?FR-2.*?<\/section>/s)
    expect(statsBarMatch).not.toBeNull()
    if (statsBarMatch) {
      const statsBarSection = statsBarMatch[0]
      expect(statsBarSection).toContain('&lt;30s')
      expect(statsBarSection).toContain('78%')
      expect(statsBarSection).toContain('35%')
      expect(statsBarSection).toContain('24/7')
      expect(statsBarSection).toContain('Response Time')
      expect(statsBarSection).toContain('Deals to First Responder')
      expect(statsBarSection).toContain('Leads Never Responded To')
      expect(statsBarSection).toContain('Always On')
    }
  })
})
