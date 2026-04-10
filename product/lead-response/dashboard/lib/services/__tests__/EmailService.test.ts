jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}))

const { supabaseServer } = jest.requireMock('@/lib/supabase-server')
import { EmailService } from '../EmailService'

describe('dashboard EmailService', () => {
  beforeEach(() => {
    supabaseServer.from.mockClear()
  })

  it('logs queued events when transport is unconfigured', async () => {
    const service = new EmailService({
      isConfigured: () => false,
      send: jest.fn().mockResolvedValue({ success: true, mock: true, id: 'mock_1' }),
    } as any)

    const result = await service.sendLogged({
      customerId: 'agent-1',
      emailType: 'welcome',
      recipient: 'agent@example.com',
      subject: 'Welcome',
      html: '<p>Hello</p>',
    })

    expect(result).toBe(true)
    expect(supabaseServer.from).toHaveBeenCalledWith('email_events')
    const insert = supabaseServer.from.mock.results[0].value.insert
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: 'agent-1',
        email_type: 'welcome',
        recipient: 'agent@example.com',
        status: 'queued',
      })
    )
  })

  it('uses specialized delivery methods when requested', async () => {
    const sendVerification = jest.fn().mockResolvedValue({ success: true, id: 'resend-123' })
    const service = new EmailService({
      isConfigured: () => true,
      send: jest.fn(),
      sendVerification,
    } as any)

    const result = await service.sendLogged({
      customerId: 'agent-2',
      emailType: 'verification',
      recipient: 'agent@example.com',
      subject: 'Verify',
      html: '<p>Verify</p>',
      method: 'sendVerification',
    })

    expect(result).toBe(true)
    expect(sendVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'agent@example.com',
        subject: 'Verify',
      })
    )
  })
})
