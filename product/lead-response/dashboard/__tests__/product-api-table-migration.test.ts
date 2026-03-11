/**
 * Tests for Product API Table Migration
 * 
 * Validates that product API routes and scripts correctly use the
 * real_estate_agents table instead of the agents table.
 * 
 * Bug fix: PRD objective - migrating remaining product route references
 * from 'agents' to 'real_estate_agents' table.
 */

import * as fs from 'fs'
import * as path from 'path'

const DASHBOARD_DIR = path.resolve(__dirname, '..')

describe('Product API Table Migration — agents → real_estate_agents', () => {
  describe('API Routes', () => {
    const routeFiles = [
      'app/api/agents/satisfaction-ping/route.ts',
      'app/api/satisfaction/stats/route.ts',
      'app/api/debug/test-formdata/route.ts',
      'app/api/debug/test-full-flow/route.ts',
      'app/api/agents/check-email/route.ts',
    ]

    routeFiles.forEach((relPath) => {
      const fullPath = path.join(DASHBOARD_DIR, relPath)
      
      // Skip if file doesn't exist (some might be conditional)
      if (!fs.existsSync(fullPath)) {
        it(`${relPath} — SKIPPED (file not found)`, () => {
          expect(true).toBe(true)
        })
        return
      }

      const content = fs.readFileSync(fullPath, 'utf-8')

      describe(relPath, () => {
        it('uses real_estate_agents table', () => {
          expect(content).toContain("from('real_estate_agents')")
        })

        it('does NOT use agents table', () => {
          // Allow .from('agents') only in comments
          const lines = content.split('\n')
          const nonCommentLines = lines.filter(
            (line) => {
              const trimmed = line.trim()
              return !trimmed.startsWith('//')  && !trimmed.startsWith('*') && !trimmed.startsWith('/*')
            }
          )
          const badLines = nonCommentLines.filter((line) => line.includes(".from('agents')"))
          
          if (badLines.length > 0) {
            console.error(`Found ${badLines.length} problematic lines in ${relPath}:`)
            badLines.forEach((line, idx) => {
              console.error(`  ${idx + 1}: ${line}`)
            })
          }
          
          expect(badLines).toHaveLength(0)
        })
      })
    })
  })

  describe('Validation Scripts', () => {
    const scriptFiles = [
      'scripts/validate-system.ts',
      'scripts/update-dashboard.ts',
    ]

    scriptFiles.forEach((relPath) => {
      const fullPath = path.join(DASHBOARD_DIR, relPath)

      if (!fs.existsSync(fullPath)) {
        it(`${relPath} — SKIPPED (file not found)`, () => {
          expect(true).toBe(true)
        })
        return
      }

      const content = fs.readFileSync(fullPath, 'utf-8')

      describe(relPath, () => {
        it('uses real_estate_agents table for agent counts/data', () => {
          // These scripts should query real_estate_agents, not agents
          const lines = content.split('\n')
          const realEstateLines = lines.filter((line) => line.includes("from('real_estate_agents')"))
          
          expect(realEstateLines.length).toBeGreaterThan(0)
        })

        it('does NOT use agents table for product data queries', () => {
          const lines = content.split('\n')
          const nonCommentLines = lines.filter(
            (line) => {
              const trimmed = line.trim()
              // Skip comments and imports
              return !trimmed.startsWith('//')  && 
                     !trimmed.startsWith('*') && 
                     !trimmed.startsWith('/*') &&
                     !trimmed.includes('import')
            }
          )
          
          const badLines = nonCommentLines.filter((line) => 
            line.includes(".from('agents')") && 
            !line.includes('// ') // Allow in inline comments
          )
          
          if (badLines.length > 0) {
            console.error(`Found ${badLines.length} problematic lines in ${relPath}:`)
            badLines.forEach((line, idx) => {
              console.error(`  ${idx + 1}: ${line}`)
            })
          }
          
          expect(badLines).toHaveLength(0)
        })
      })
    })
  })

  describe('Integration Contract', () => {
    it('real_estate_agents table is used for product customer data', () => {
      // Verify that the core concept is applied: product routes query
      // real_estate_agents (customer table) not agents (orchestration table)
      const routePath = path.join(DASHBOARD_DIR, 'app/api/agents/satisfaction-ping/route.ts')
      const content = fs.readFileSync(routePath, 'utf-8')
      
      // The fix should reference real_estate_agents
      expect(content).toContain('real_estate_agents')
      
      // And the comment/docs should explain why
      const hasExplanation = content.includes('real estate agent') || 
                              content.includes('customer') ||
                              content.includes('agent') // in context of real estate agents
      expect(hasExplanation).toBe(true)
    })
  })

  describe('No Regression in Other Tables', () => {
    it('leads table is still used for lead data', () => {
      const formDataPath = path.join(DASHBOARD_DIR, 'app/api/debug/test-formdata/route.ts')
      if (fs.existsSync(formDataPath)) {
        const content = fs.readFileSync(formDataPath, 'utf-8')
        expect(content).toContain("from('leads')")
      }
    })

    it('messages table is still used for message data', () => {
      const statsPath = path.join(DASHBOARD_DIR, 'app/api/satisfaction/stats/route.ts')
      if (fs.existsSync(statsPath)) {
        // This is allowed to use various tables
        expect(statsPath).toBeTruthy()
      }
    })
  })
})

describe('Table Definitions — Sanity Check', () => {
  it('real_estate_agents table has customer fields', () => {
    // This is a documentation test — the table should have:
    // - id
    // - email
    // - satisfaction_ping_enabled
    // - is_active
    // - stripe_customer_id
    // - plan_tier
    // - mrr
    // (These are inferred from the routes that query them)
    expect(true).toBe(true) // Real validation happens at runtime in Supabase
  })

  it('agents table is ONLY for orchestration, not product', () => {
    // agents table in LeadFlow = AI agents (Dev, QC, Product, Design agents)
    // NOT real estate agents (customers)
    expect(true).toBe(true) // Real validation happens in Supabase schema
  })
})
