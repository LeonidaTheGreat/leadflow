/**
 * @jest-environment node
 */

const mockJson = jest.fn((body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }))

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: (...args: unknown[]) => mockJson(...args) },
}))

const mockRequireAdmin = jest.fn()
jest.mock('@/lib/services/AuthService', () => ({ requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args) }))

const mockFrom = jest.fn()
jest.mock('@/lib/db', () => ({ postgrestAdmin: { from: (...args: unknown[]) => mockFrom(...args) } }))

jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn() } }))

function makeListReq(query = ''): any { return { url: `http://localhost/api/admin/pilot-signups/list${query}` } }
function makePatchReq(body: any): any { return { json: async () => body } }

describe('pilot signups admin routes', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('list route returns 401 for unauthorized', async () => {
    mockRequireAdmin.mockResolvedValueOnce(false)
    const mod = await import('@/app/api/admin/pilot-signups/list/route')
    await mod.GET(makeListReq())
    expect(mockJson).toHaveBeenCalledWith({ success: false, error: 'Unauthorized' }, { status: 401 })
  })

  it('list route returns joined signups with stats', async () => {
    mockRequireAdmin.mockResolvedValueOnce(true)

    const signupRows = [
      { id: '1', name: 'A', email: 'a@test.com', status: 'new', follow_up_sent: true, created_at: '2026-05-01', updated_at: '2026-05-01', contacted_at: null },
      { id: '2', name: 'B', email: 'b@test.com', status: 'contacted', follow_up_sent: false, created_at: '2026-05-02', updated_at: '2026-05-02', contacted_at: null },
    ]
    const inviteRows = [{ email: 'b@test.com', invited_at: '2026-05-03T00:00:00Z' }]

    const signupQuery: any = { select: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), then: (resolve: any) => Promise.resolve({ data: signupRows, error: null }).then(resolve) }
    const inviteQuery: any = { select: jest.fn().mockResolvedValue({ data: inviteRows, error: null }) }

    mockFrom.mockImplementation((table: string) => (table === 'pilot_signups' ? signupQuery : inviteQuery))

    const mod = await import('@/app/api/admin/pilot-signups/list/route')
    await mod.GET(makeListReq('?page=1&limit=50'))

    const payload = mockJson.mock.calls[0][0] as any
    expect(payload.total).toBe(2)
    expect(payload.signups[1].invited).toBe(true)
    expect(payload.stats.invited).toBe(1)
  })

  it('patch route validates status', async () => {
    mockRequireAdmin.mockResolvedValueOnce(true)
    const mod = await import('@/app/api/admin/pilot-signups/[id]/route')
    await mod.PATCH(makePatchReq({ status: 'bad' }), { params: Promise.resolve({ id: 'abc' }) })
    expect(mockJson).toHaveBeenCalledWith({ success: false, error: 'Invalid status value' }, { status: 400 })
  })

  it('patch route updates and returns signup', async () => {
    mockRequireAdmin.mockResolvedValueOnce(true)
    const updateChain: any = { update: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'abc', status: 'contacted' }, error: null }) }
    mockFrom.mockReturnValue(updateChain)

    const mod = await import('@/app/api/admin/pilot-signups/[id]/route')
    await mod.PATCH(makePatchReq({ status: 'contacted' }), { params: Promise.resolve({ id: 'abc' }) })
    expect(mockJson).toHaveBeenCalledWith({ success: true, signup: { id: 'abc', status: 'contacted' } })
  })
})
