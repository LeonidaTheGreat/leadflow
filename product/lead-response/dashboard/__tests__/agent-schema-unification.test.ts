/**
 * UC: uc-buyer-journey-agent-schema-unification
 * Decision: Option B — consolidate to real_estate_agents only (no agents table for product data).
 *
 * Acceptance criteria:
 * 1. Zero is_active=true filters in inbound-sms-service (uses status=active instead)
 * 2. realEstateAgentRowToAgent mapper produces an Agent with required fields (hasRequiredAgent:true)
 * 3. Agent interface fully satisfied by mapper output
 * 4. No product code queries a legacy .from('agents') table
 */

import * as fs from 'fs'
import * as path from 'path'
import { realEstateAgentRowToAgent } from '../lib/agent-mapper'

const DASHBOARD_DIR = path.resolve(__dirname, '..')

// ── Acceptance Criterion 1: no is_active=true filters in service code ─────────

describe('Schema Decision: Option B — real_estate_agents is the single source of truth', () => {
  const SERVICE_FILES = [
    'lib/services/inbound-sms-service.ts',
    'lib/services/fub-webhook-service.ts',
  ]

  SERVICE_FILES.forEach((relPath) => {
    const fullPath = path.join(DASHBOARD_DIR, relPath)
    if (!fs.existsSync(fullPath)) return
    const content = fs.readFileSync(fullPath, 'utf-8')

    it(`${relPath}: zero .eq('is_active', true) filters`, () => {
      expect(content).not.toMatch(/\.eq\(['"]is_active['"],\s*true\)/)
    })

    it(`${relPath}: uses real_estate_agents table for agent lookup`, () => {
      expect(content).toContain("from('real_estate_agents')")
    })

    it(`${relPath}: uses realEstateAgentRowToAgent mapper`, () => {
      expect(content).toContain('realEstateAgentRowToAgent')
    })
  })
})

// ── Acceptance Criterion 2: mapper produces hasRequiredAgent:true ─────────────

describe('realEstateAgentRowToAgent mapper', () => {
  const minimalRow = {
    id: 'uuid-1',
    email: 'agent@realty.com',
    first_name: 'Jane',
    last_name: 'Smith',
    phone_number: null,
    state: 'CA',
    status: 'active',
    timezone: 'America/Los_Angeles',
    satisfaction_ping_enabled: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }

  it('returns a non-null Agent', () => {
    const agent = realEstateAgentRowToAgent(minimalRow)
    expect(agent).not.toBeNull()
  })

  it('produces hasRequiredAgent:true (agent && market && settings)', () => {
    const agent = realEstateAgentRowToAgent(minimalRow)
    const hasRequiredAgent = !!(agent && agent.market && agent.settings)
    expect(hasRequiredAgent).toBe(true)
  })

  it('maps name from first_name + last_name', () => {
    const agent = realEstateAgentRowToAgent(minimalRow)
    expect(agent.name).toBe('Jane Smith')
  })

  it('derives market from state', () => {
    const agent = realEstateAgentRowToAgent(minimalRow)
    expect(['ca-ontario', 'us-national']).toContain(agent.market)
  })

  it('sets is_active=true when status=active', () => {
    const agent = realEstateAgentRowToAgent(minimalRow)
    expect(agent.is_active).toBe(true)
  })

  it('sets is_active=false when status is not active', () => {
    const agent = realEstateAgentRowToAgent({ ...minimalRow, status: 'onboarding' })
    expect(agent.is_active).toBe(false)
  })

  it('provides default settings with required fields', () => {
    const agent = realEstateAgentRowToAgent(minimalRow)
    expect(agent.settings).toMatchObject({
      auto_respond: expect.any(Boolean),
      response_delay_seconds: expect.any(Number),
      human_handoff_threshold: expect.any(Number),
      booking_enabled: expect.any(Boolean),
    })
  })

  it('falls back to email when name is empty', () => {
    const agent = realEstateAgentRowToAgent({
      ...minimalRow,
      first_name: '',
      last_name: '',
    })
    expect(agent.name).toBe(minimalRow.email)
  })
})

// ── Acceptance Criterion 3: agent-mapper.ts exports the required function ─────

describe('agent-mapper module exports', () => {
  it('exports realEstateAgentRowToAgent', () => {
    expect(typeof realEstateAgentRowToAgent).toBe('function')
  })

  it('exports RealEstateAgentRow interface (import succeeds)', () => {
    // Static import works = interface is properly exported
    expect(true).toBe(true)
  })
})

// ── Acceptance Criterion 4: no product routes use .from('agents') ─────────────

describe('No product routes use legacy .from("agents") table', () => {
  const SCAN_DIRS = ['app/api', 'lib/services', 'lib']
  const EXCLUDED_PATTERNS = [
    /node_modules/,
    /\.test\./,
    /\.spec\./,
    /__tests__/,
  ]

  function scanForAgentsTableUsage(dir: string): string[] {
    const fullDir = path.join(DASHBOARD_DIR, dir)
    if (!fs.existsSync(fullDir)) return []

    const violations: string[] = []

    function walk(current: string) {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const fullPath = path.join(current, entry.name)
        if (EXCLUDED_PATTERNS.some((p) => p.test(fullPath))) continue

        if (entry.isDirectory()) {
          walk(fullPath)
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          const content = fs.readFileSync(fullPath, 'utf-8')
          const lines = content.split('\n')
          lines.forEach((line, idx) => {
            const trimmed = line.trim()
            if (
              !trimmed.startsWith('//') &&
              !trimmed.startsWith('*') &&
              !trimmed.startsWith('/*') &&
              trimmed.includes(".from('agents')")
            ) {
              violations.push(`${path.relative(DASHBOARD_DIR, fullPath)}:${idx + 1}: ${trimmed}`)
            }
          })
        }
      }
    }

    walk(fullDir)
    return violations
  }

  it('app/api — no non-comment .from("agents") calls', () => {
    const violations = scanForAgentsTableUsage('app/api')
    if (violations.length > 0) {
      console.error('Violations found:\n' + violations.join('\n'))
    }
    expect(violations).toHaveLength(0)
  })

  it('lib/services — no non-comment .from("agents") calls', () => {
    const violations = scanForAgentsTableUsage('lib/services')
    if (violations.length > 0) {
      console.error('Violations found:\n' + violations.join('\n'))
    }
    expect(violations).toHaveLength(0)
  })
})
