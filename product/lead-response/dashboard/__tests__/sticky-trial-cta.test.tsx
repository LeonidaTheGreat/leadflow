import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import StickyTrialCTA from '@/components/StickyTrialCTA'

jest.mock('@/lib/analytics/demo', () => ({
  trackDemoEvent: jest.fn(),
}))

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>
  }
})

import { trackDemoEvent } from '@/lib/analytics/demo'

describe('StickyTrialCTA', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when show is false', () => {
    const { container } = render(
      <StickyTrialCTA show={false} source="demo" sessionId="test-123" />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders the sticky bar when show is true', () => {
    render(
      <StickyTrialCTA show={true} source="demo" sessionId="test-123" />
    )
    expect(screen.getByText('Start your free trial')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password (8+ chars)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start free trial/i })).toBeInTheDocument()
  })

  it('fires demo_cta_shown event when shown', () => {
    render(
      <StickyTrialCTA show={true} source="demo" sessionId="test-session" />
    )
    expect(trackDemoEvent).toHaveBeenCalledWith('demo_cta_shown', {
      session_id: 'test-session',
      cta_target: 'demo',
    })
  })

  it('hides when dismiss button is clicked', () => {
    render(
      <StickyTrialCTA show={true} source="demo" sessionId="test-123" />
    )
    const dismissBtn = screen.getByLabelText('Dismiss')
    fireEvent.click(dismissBtn)
    expect(screen.queryByText('Start your free trial')).not.toBeInTheDocument()
  })

  it('persists dismiss to sessionStorage', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')
    render(
      <StickyTrialCTA show={true} source="demo" sessionId="test-123" />
    )
    fireEvent.click(screen.getByLabelText('Dismiss'))
    expect(setItemSpy).toHaveBeenCalledWith('demo_cta_dismissed', '1')
    setItemSpy.mockRestore()
  })

  it('starts dismissed when sessionStorage flag is set', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) =>
      key === 'demo_cta_dismissed' ? '1' : null
    )
    const { container } = render(
      <StickyTrialCTA show={true} source="demo" sessionId="test-123" />
    )
    expect(container.innerHTML).toBe('')
    jest.spyOn(Storage.prototype, 'getItem').mockRestore()
  })

  it('validates email before submission', async () => {
    render(
      <StickyTrialCTA show={true} source="demo" sessionId="test-123" />
    )
    const emailInput = screen.getByPlaceholderText('Email address')
    const passwordInput = screen.getByPlaceholderText('Password (8+ chars)')

    fireEvent.change(emailInput, { target: { value: 'not-an-email' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.submit(screen.getByRole('button', { name: /start free trial/i }))

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('validates password length before submission', async () => {
    render(
      <StickyTrialCTA show={true} source="demo" sessionId="test-123" />
    )
    const emailInput = screen.getByPlaceholderText('Email address')
    const passwordInput = screen.getByPlaceholderText('Password (8+ chars)')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'short' } })
    fireEvent.submit(screen.getByRole('button', { name: /start free trial/i }))

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    })
  })

  it('submits to trial-signup API with correct source', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        token: 'test-token',
        user: { id: '1', email: 'test@example.com' },
        redirectTo: '/dashboard/onboarding',
      }),
    })
    global.fetch = mockFetch

    render(
      <StickyTrialCTA show={true} source="demo" sessionId="test-session" />
    )

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'agent@realty.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password (8+ chars)'), {
      target: { value: 'securepass123' },
    })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /start free trial/i }))
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/trial-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'agent@realty.com',
          password: 'securepass123',
          source: 'demo',
        }),
      })
    })
  })

  it('shows success message after signup', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        token: 'tok',
        user: { id: '1' },
        redirectTo: '/dashboard/onboarding',
      }),
    })

    render(
      <StickyTrialCTA show={true} source="demo" sessionId="test-session" />
    )

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'agent@realty.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password (8+ chars)'), {
      target: { value: 'securepass123' },
    })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /start free trial/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/Account created/)).toBeInTheDocument()
    })
  })

  it('handles duplicate email error (409)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'An account with this email already exists.' }),
    })

    render(
      <StickyTrialCTA show={true} source="demo" sessionId="test-123" />
    )

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'existing@realty.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password (8+ chars)'), {
      target: { value: 'securepass123' },
    })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /start free trial/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    })
  })

  it('uses prefillEmail when provided', () => {
    render(
      <StickyTrialCTA show={true} source="simulator" sessionId="test-123" prefillEmail="pre@test.com" />
    )
    const emailInput = screen.getByPlaceholderText('Email address') as HTMLInputElement
    expect(emailInput.value).toBe('pre@test.com')
  })
})
