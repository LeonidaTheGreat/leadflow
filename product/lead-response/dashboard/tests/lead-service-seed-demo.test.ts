import { LeadService } from '@/lib/services/LeadService'

describe('LeadService.seedDemoLeads', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('creates sample leads and sample messages for an agent', async () => {
    const executeLeads = jest.fn().mockResolvedValue({
      data: [{ id: 'lead-1' }, { id: 'lead-2' }, { id: 'lead-3' }],
      error: null,
    })
    const executeMessages = jest.fn().mockResolvedValue({ error: null })

    const leadsInsert = jest.fn(() => ({
      select: jest.fn(() => ({ execute: executeLeads })),
    }))
    const messagesInsert = jest.fn(() => ({ execute: executeMessages }))

    const from = jest.fn((table: string) => {
      if (table === 'leads') {
        return { insert: leadsInsert }
      }
      if (table === 'messages') {
        return { insert: messagesInsert }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const db = { from }
    const service = new LeadService(db as any)

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000)

    const result = await service.seedDemoLeads('agent-123')

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(3)

    expect(from).toHaveBeenCalledWith('leads')
    expect(leadsInsert).toHaveBeenCalledTimes(1)
    const leadsPayload = leadsInsert.mock.calls[0][0]
    expect(leadsPayload).toHaveLength(3)
    expect(leadsPayload.every((lead: any) => lead.agent_id === 'agent-123')).toBe(true)

    expect(from).toHaveBeenCalledWith('messages')
    expect(messagesInsert).toHaveBeenCalledTimes(1)
    const messagesPayload = messagesInsert.mock.calls[0][0]
    expect(messagesPayload).toHaveLength(3)
    expect(messagesPayload.every((msg: any) => msg.channel === 'sms' && msg.ai_generated)).toBe(true)

    nowSpy.mockRestore()
  })

  test('returns leads error and skips message inserts when lead insert fails', async () => {
    const executeLeads = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'insert failed' },
    })
    const leadsInsert = jest.fn(() => ({
      select: jest.fn(() => ({ execute: executeLeads })),
    }))
    const messagesInsert = jest.fn(() => ({
      execute: jest.fn(),
    }))

    const from = jest.fn((table: string) => {
      if (table === 'leads') {
        return { insert: leadsInsert }
      }
      if (table === 'messages') {
        return { insert: messagesInsert }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const service = new LeadService({ from } as any)

    const result = await service.seedDemoLeads('agent-123')

    expect(result.data).toEqual([])
    expect(result.error).toEqual({ message: 'insert failed' })
    expect(messagesInsert).not.toHaveBeenCalled()
  })
})
