import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DashboardNav } from '@/app/dashboard/dashboard-nav'

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

describe('E2E: buyer journey logout button', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock | undefined) = jest.fn().mockResolvedValue({ ok: true }) as any
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = 'leadflow_session=session-token'
  })

  it('loads dashboard nav, opens user menu, logs out, and redirects to /login', async () => {
    localStorage.setItem('leadflow_user', JSON.stringify({ id: 'agent-e2e' }))

    render(<DashboardNav />)
    fireEvent.click(screen.getByTestId('user-menu-button'))
    fireEvent.click(screen.getByTestId('user-menu-logout-button'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
      expect(mockPush).toHaveBeenCalledWith('/login')
      expect(mockRefresh).toHaveBeenCalled()
    })

    expect(localStorage.getItem('leadflow_user')).toBeNull()
    expect(document.cookie).not.toContain('leadflow_session=')
  })
})
