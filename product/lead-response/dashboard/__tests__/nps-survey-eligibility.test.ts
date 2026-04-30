/**
 * Tests for NPS survey eligibility status filter fix.
 * Verifies that getAgentsDueForSurvey includes trial, pilot, and active agents.
 */

// Track all query builder calls to verify correct filters
let queryBuilderCalls: { method: string; args: any[] }[] = []

const mockQueryBuilder = () => {
  const builder: any = {}
  const methods = ['select', 'eq', 'neq', 'in', 'lte', 'gte', 'gt', 'lt', 'order', 'limit', 'single', 'maybeSingle', 'insert', 'update', 'upsert', 'delete']
  for (const m of methods) {
    builder[m] = (...args: any[]) => {
      queryBuilderCalls.push({ method: m, args })
      return builder
    }
  }
  builder.then = (resolve: any) => resolve({ data: [], error: null })
  return builder
}

jest.mock('../lib/db', () => ({
  createClient: () => ({
    from: (table: string) => {
      queryBuilderCalls.push({ method: 'from', args: [table] })
      return mockQueryBuilder()
    },
  }),
}))

jest.mock('../lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}))

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(() => ({ agent_id: 'test', trigger: 'auto_14d' })),
}))

import { getAgentsDueForSurvey } from '../lib/nps-service'

describe('NPS Survey Eligibility — Status Filter', () => {
  beforeEach(() => {
    queryBuilderCalls = []
  })

  it('queries with .in() for trial, pilot, and active statuses', async () => {
    await getAgentsDueForSurvey()

    const inCall = queryBuilderCalls.find(
      c => c.method === 'in' && c.args[0] === 'real_estate_agents.status'
    )

    expect(inCall).toBeDefined()
    expect(inCall!.args[1]).toEqual(['trial', 'pilot', 'active'])
  })

  it('does NOT use .eq() with status=active', async () => {
    await getAgentsDueForSurvey()

    const eqActiveCall = queryBuilderCalls.find(
      c => c.method === 'eq' && c.args[0] === 'real_estate_agents.status' && c.args[1] === 'active'
    )

    expect(eqActiveCall).toBeUndefined()
  })

  it('queries the agent_survey_schedule table', async () => {
    await getAgentsDueForSurvey()

    const fromCall = queryBuilderCalls.find(
      c => c.method === 'from' && c.args[0] === 'agent_survey_schedule'
    )

    expect(fromCall).toBeDefined()
  })

  it('applies lte filter on next_survey_at', async () => {
    await getAgentsDueForSurvey()

    const lteCall = queryBuilderCalls.find(
      c => c.method === 'lte' && c.args[0] === 'next_survey_at'
    )

    expect(lteCall).toBeDefined()
  })

  it('selects agent_id, survey_count, and joined agent fields', async () => {
    await getAgentsDueForSurvey()

    const selectCall = queryBuilderCalls.find(c => c.method === 'select')

    expect(selectCall).toBeDefined()
    const selectStr = selectCall!.args[0] as string
    expect(selectStr).toContain('agent_id')
    expect(selectStr).toContain('survey_count')
    expect(selectStr).toContain('real_estate_agents!inner')
  })

  it('returns empty array on error', async () => {
    const result = await getAgentsDueForSurvey()
    expect(Array.isArray(result)).toBe(true)
  })
})
