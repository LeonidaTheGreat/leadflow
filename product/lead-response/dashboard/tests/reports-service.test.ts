import { ReportsService } from '../lib/services/ReportsService'

type Row = Record<string, any>

class MockQueryBuilder implements PromiseLike<any> {
  private filters: Array<{ type: 'gte'; key: string; value: any }> = []

  constructor(
    private readonly table: string,
    private readonly dataset: Record<string, Row[]>,
    private readonly errors: Record<string, Error | null>
  ) {}

  select() {
    return this
  }

  gte(key: string, value: any) {
    this.filters.push({ type: 'gte', key, value })
    return this
  }

  private execute() {
    const error = this.errors[this.table]
    if (error) {
      return Promise.resolve({ data: null, error })
    }

    let rows = [...(this.dataset[this.table] || [])]

    for (const filter of this.filters) {
      rows = rows.filter((row) => row[filter.key] >= filter.value)
    }

    return Promise.resolve({ data: rows, error: null })
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }
}

function createMockDb(dataset: Record<string, Row[]>, errors: Record<string, Error | null> = {}) {
  return {
    from(table: string) {
      return new MockQueryBuilder(table, dataset, errors)
    },
  }
}

describe('ReportsService', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-01T12:00:00.000Z').getTime())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('builds distinct reports data with at-risk and top-performing leads', async () => {
    const service = new ReportsService(createMockDb({
      leads: [
        { id: 'lead-1', first_name: 'Alex', last_name: 'Stone', status: 'new', created_at: '2026-04-25T10:00:00.000Z' },
        { id: 'lead-2', first_name: 'Mia', last_name: 'Rivera', status: 'active', created_at: '2026-04-26T10:00:00.000Z' },
      ],
      messages: [
        { lead_id: 'lead-1', direction: 'outbound', created_at: '2026-04-25T11:00:00.000Z' },
        { lead_id: 'lead-1', direction: 'outbound', created_at: '2026-04-25T13:00:00.000Z' },
        { lead_id: 'lead-2', direction: 'outbound', created_at: '2026-04-26T11:00:00.000Z' },
        { lead_id: 'lead-2', direction: 'inbound', created_at: '2026-04-26T12:00:00.000Z' },
      ],
      bookings: [{ lead_id: 'lead-2', created_at: '2026-04-27T10:00:00.000Z' }],
    }))

    const result = await service.getSummaryReport(30)

    expect(result.reportRangeDays).toBe(30)
    expect(result.totals).toEqual({ activeLeads: 2, leadsWithoutReply: 1, bookedLeads: 1 })
    expect(result.atRiskLeads).toHaveLength(1)
    expect(result.atRiskLeads[0].name).toBe('Alex Stone')
    expect(result.topPerformingLeads).toHaveLength(1)
    expect(result.topPerformingLeads[0].name).toBe('Mia Rivera')
    expect(result.actionItems.length).toBeGreaterThan(0)
  })

  it('returns safe fallback payload when DB query fails', async () => {
    const service = new ReportsService(createMockDb({ leads: [], messages: [], bookings: [] }, { messages: new Error('db down') }))

    const result = await service.getSummaryReport(30)

    expect(result.headline).toContain('Report unavailable')
    expect(result.totals).toEqual({ activeLeads: 0, leadsWithoutReply: 0, bookedLeads: 0 })
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
