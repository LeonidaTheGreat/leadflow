import { AnalyticsService } from '../lib/services/AnalyticsService'

type Row = Record<string, any>

class MockQueryBuilder implements PromiseLike<any> {
  private filters: Array<{ type: 'eq' | 'gte' | 'in'; key: string; value: any }> = []
  private sort: { key: string; ascending: boolean } | null = null

  constructor(
    private readonly table: string,
    private readonly dataset: Record<string, Row[]>,
    private readonly errors: Record<string, Error | null>
  ) {}

  select() {
    return this
  }

  eq(key: string, value: any) {
    this.filters.push({ type: 'eq', key, value })
    return this
  }

  gte(key: string, value: any) {
    this.filters.push({ type: 'gte', key, value })
    return this
  }

  in(key: string, value: any[]) {
    this.filters.push({ type: 'in', key, value })
    return this
  }

  order(key: string, options?: { ascending?: boolean }) {
    this.sort = { key, ascending: options?.ascending ?? true }
    return this
  }

  private execute() {
    const error = this.errors[this.table]
    if (error) {
      return Promise.resolve({ data: null, error })
    }

    let rows = [...(this.dataset[this.table] || [])]

    for (const filter of this.filters) {
      if (filter.type === 'eq') {
        rows = rows.filter((row) => row[filter.key] === filter.value)
      }

      if (filter.type === 'gte') {
        rows = rows.filter((row) => row[filter.key] >= filter.value)
      }

      if (filter.type === 'in') {
        rows = rows.filter((row) => filter.value.includes(row[filter.key]))
      }
    }

    if (this.sort) {
      rows.sort((left, right) => {
        const leftValue = left[this.sort!.key]
        const rightValue = right[this.sort!.key]
        if (leftValue === rightValue) {
          return 0
        }

        const result = leftValue > rightValue ? 1 : -1
        return this.sort!.ascending ? result : result * -1
      })
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

describe('AnalyticsService', () => {
  const messages = [
    { id: 'm1', lead_id: 'lead-1', direction: 'outbound', status: 'sent', created_at: '2026-04-07T10:00:00.000Z' },
    { id: 'm2', lead_id: 'lead-1', direction: 'inbound', status: 'delivered', created_at: '2026-04-07T10:05:00.000Z' },
    { id: 'm3', lead_id: 'lead-2', direction: 'outbound', status: 'delivered', created_at: '2026-04-08T11:00:00.000Z' },
    { id: 'm4', lead_id: 'lead-2', direction: 'outbound', status: 'failed', created_at: '2026-04-08T12:00:00.000Z' },
    { id: 'm5', lead_id: 'lead-2', direction: 'outbound', status: null, created_at: '2026-04-08T13:00:00.000Z' },
    { id: 'm6', lead_id: 'lead-3', direction: 'outbound', status: 'sent', created_at: '2026-04-09T09:00:00.000Z' },
  ]

  const leads = [
    { id: 'lead-1', created_at: '2026-04-07T09:00:00.000Z' },
    { id: 'lead-2', created_at: '2026-04-08T09:00:00.000Z' },
    { id: 'lead-3', created_at: '2026-04-09T09:00:00.000Z' },
  ]

  const bookings = [
    { lead_id: 'lead-1', created_at: '2026-04-08T10:00:00.000Z' },
    { lead_id: 'lead-1', created_at: '2026-04-08T11:00:00.000Z' },
    { lead_id: 'lead-3', created_at: '2026-04-09T10:00:00.000Z' },
  ]

  const events = [
    { lead_id: 'lead-1', event_type: 'sequence_started', created_at: '2026-04-07T10:00:00.000Z', event_data: {} },
    { lead_id: 'lead-2', event_type: 'sequence_started', created_at: '2026-04-08T10:00:00.000Z', event_data: {} },
    { lead_id: 'lead-1', event_type: 'sequence_completed', created_at: '2026-04-08T10:30:00.000Z', event_data: {} },
  ]

  const dataset = { messages, leads, bookings, events }

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-09T12:00:00.000Z').getTime())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('groups outbound messages by day', async () => {
    const service = new AnalyticsService(createMockDb(dataset))

    const result = await service.getMessagesPerDay(30)

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      { date: '2026-04-07', count: 1 },
      { date: '2026-04-08', count: 3 },
      { date: '2026-04-09', count: 1 },
    ])
  })

  it('calculates delivery stats with pending fallback', async () => {
    const service = new AnalyticsService(createMockDb(dataset))

    const result = await service.getDeliveryStats(30)

    expect(result).toMatchObject({
      sent: 2,
      delivered: 1,
      failed: 1,
      pending: 1,
      error: null,
    })
  })

  it('calculates unique lead response rate', async () => {
    const service = new AnalyticsService(createMockDb(dataset))

    const result = await service.getResponseRate(30)

    expect(result).toEqual({
      totalSent: 3,
      totalResponded: 1,
      responseRate: 33.3,
      error: null,
    })
  })

  it('uses sequence events when present', async () => {
    const service = new AnalyticsService(createMockDb(dataset))

    const result = await service.getSequenceCompletion(30)

    expect(result).toEqual({
      started: 2,
      completed: 1,
      completionRate: 50,
      error: null,
    })
  })

  it('falls back to outbound message counts when sequence events are unavailable', async () => {
    const service = new AnalyticsService(
      createMockDb({ ...dataset, events: [] })
    )

    const result = await service.getSequenceCompletion(30)

    expect(result).toEqual({
      started: 3,
      completed: 1,
      completionRate: 33.3,
      error: null,
    })
  })

  it('computes lead conversion from bookings', async () => {
    const service = new AnalyticsService(createMockDb(dataset))

    const result = await service.getLeadConversion(30)

    expect(result).toEqual({
      totalLeads: 3,
      convertedLeads: 2,
      conversionRate: 66.7,
      error: null,
    })
  })

  it('computes average and median response time in minutes', async () => {
    const service = new AnalyticsService(createMockDb(dataset))

    const result = await service.getAvgResponseTime(30)

    expect(result).toEqual({
      avgResponseTime: 5,
      medianResponseTime: 5,
      error: null,
    })
  })

  it('aggregates all dashboard metrics through the service class', async () => {
    const service = new AnalyticsService(createMockDb(dataset))

    const result = await service.getAnalyticsDashboard(30)

    expect(result.messagesPerDay.data).toHaveLength(3)
    expect(result.deliveryStats.delivered).toBe(1)
    expect(result.responseRate.responseRate).toBe(33.3)
    expect(result.sequenceCompletion.completionRate).toBe(50)
    expect(result.leadConversion.conversionRate).toBe(66.7)
    expect(result.responseTime.avgResponseTime).toBe(5)
  })

  it('returns safe defaults when bookings lookup fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const service = new AnalyticsService(
      createMockDb(dataset, { bookings: new Error('bookings unavailable') })
    )

    const result = await service.getLeadConversion(30)

    expect(result.totalLeads).toBe(3)
    expect(result.convertedLeads).toBe(0)
    expect(result.conversionRate).toBe(0)
    expect(result.error).toEqual(new Error('bookings unavailable'))
  })
})
