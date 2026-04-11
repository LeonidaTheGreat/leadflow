/**
 * @jest-environment node
 */

import { LeadService } from '@/lib/services/LeadService'

describe('LeadService', () => {
  test('createLead inserts into leads table', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'lead-1' }, error: null })
    const select = jest.fn(() => ({ single }))
    const insert = jest.fn(() => ({ select }))
    const from = jest.fn(() => ({ insert }))
    const db = { from } as any

    const service = new LeadService(db)
    const result = await service.createLead({ phone: '+15550000000', source: 'test' } as any)

    expect(from).toHaveBeenCalledWith('leads')
    expect(insert).toHaveBeenCalled()
    expect(result.data?.id).toBe('lead-1')
  })

  test('updateLead updates lead by id', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'lead-2' }, error: null })
    const select = jest.fn(() => ({ single }))
    const eq = jest.fn(() => ({ select }))
    const update = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ update }))
    const db = { from } as any

    const service = new LeadService(db)
    const result = await service.updateLead('lead-2', { status: 'qualified' } as any)

    expect(from).toHaveBeenCalledWith('leads')
    expect(update).toHaveBeenCalledWith({ status: 'qualified' })
    expect(eq).toHaveBeenCalledWith('id', 'lead-2')
    expect(result.data?.id).toBe('lead-2')
  })
})
