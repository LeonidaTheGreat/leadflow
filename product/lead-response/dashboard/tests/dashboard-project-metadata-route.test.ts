/**
 * @jest-environment node
 */

let isPostgrestConfiguredMock = jest.fn()
let fromMock = jest.fn()
let loggerErrorMock = jest.fn()

jest.mock('@/lib/db', () => ({
  isPostgrestConfigured: () => isPostgrestConfiguredMock(),
  postgrestAdmin: {
    from: (table: string) => fromMock(table),
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}))

import { GET, __test__ } from '../app/api/dashboard/project-metadata/route'

describe('GET /api/dashboard/project-metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns default metadata when PostgREST is not configured', async () => {
    isPostgrestConfiguredMock.mockReturnValue(false)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metadata.goal).toBe('$20K MRR')
    expect(body.metadata.projectName).toBe('LeadFlow Real Estate AI')
  })

  it('queries project_metadata for leadflow and returns mapped fields', async () => {
    isPostgrestConfiguredMock.mockReturnValue(true)

    const single = jest.fn().mockResolvedValue({
      data: {
        project_name: 'LeadFlow Real Estate AI',
        goal: 'First paying customer by Day 90; $20K MRR by Day 180',
        deadline_days: 90,
        start_date: '2026-02-15T00:00:00-05:00',
        overall_status: 'ACTIVE',
        status_color: '🟢',
      },
      error: null,
    })

    const eq = jest.fn(() => ({ single }))
    const select = jest.fn(() => ({ eq }))
    fromMock.mockReturnValue({ select })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(fromMock).toHaveBeenCalledWith('project_metadata')
    expect(eq).toHaveBeenCalledWith('project_id', 'leadflow')
    expect(body.metadata.projectName).toBe('LeadFlow Real Estate AI')
    expect(body.metadata.goal).toBe('$20K MRR')
    expect(body.metadata.currentDay).toBeGreaterThan(0)
    expect(body.metadata.deadline).toContain('Day 90')
    expect(body.metadata.overallStatus).toBe('ACTIVE')
  })

  it('returns 500 when query fails', async () => {
    isPostgrestConfiguredMock.mockReturnValue(true)

    const single = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    })

    const eq = jest.fn(() => ({ single }))
    const select = jest.fn(() => ({ eq }))
    fromMock.mockReturnValue({ select })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to load project metadata')
    expect(loggerErrorMock).toHaveBeenCalled()
  })
})

describe('project metadata helpers', () => {
  it('normalizeGoal coerces 20k phrasing to canonical label', () => {
    expect(__test__.normalizeGoal('Reach 20K MRR by Q3')).toBe('$20K MRR')
  })

  it('getDeadlineLabel falls back when start date missing', () => {
    expect(__test__.getDeadlineLabel(undefined, 90)).toBe('Day 90')
  })
})
