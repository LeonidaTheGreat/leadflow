import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner'

describe('SampleDataBanner', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    localStorage.clear()
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' && input === '/api/leads/sample-status') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            agentId: 'agent-123',
            hasSampleLeads: true,
            sampleLeadCount: 3,
            dismissed: false,
          }),
        } as Response)
      }

      if (typeof input === 'string' && input === '/api/analytics/event') {
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) } as Response)
      }

      throw new Error(`Unexpected fetch: ${String(input)}`)
    }) as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('stores dismissal by agentId key', async () => {
    render(<SampleDataBanner />)

    await waitFor(() => {
      expect(screen.getByText(/welcome! here are some sample leads/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))

    expect(localStorage.getItem('sample-data-dismissed-agent-123')).toBe('true')
    expect(localStorage.getItem('sample-data-dismissed-true')).toBeNull()
  })
})
