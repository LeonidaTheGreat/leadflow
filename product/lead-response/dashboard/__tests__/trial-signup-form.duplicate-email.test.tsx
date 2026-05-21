/**
 * TrialSignupForm — duplicate email error rendering tests
 *
 * Verifies that a 409 duplicate-email response causes the form to render
 * a clickable sign-in link rather than plain text.
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import TrialSignupForm from '@/components/trial-signup-form'

// ─── Next.js mocks ───────────────────────────────────────────────────────────

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('next/link', () => {
  const React = require('react')
  return React.forwardRef(function MockLink(
    props: Record<string, unknown>,
    ref: React.Ref<HTMLAnchorElement>,
  ) {
    const { children, href, ...rest } = props
    return React.createElement('a', { href: href as string, ...rest, ref }, children)
  })
})

jest.mock('@/lib/analytics/ga4', () => ({
  trackCTAClick: jest.fn(),
}))

// ─── fetch mock ──────────────────────────────────────────────────────────────

function mockFetch(status: number, body: Record<string, unknown>) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

afterEach(() => {
  jest.restoreAllMocks()
})

// ─── helpers ─────────────────────────────────────────────────────────────────

async function fillAndSubmit(
  getByPlaceholderText: (text: string) => HTMLElement,
  getByRole: (role: string, opts: Record<string, unknown>) => HTMLElement,
  email = 'user@example.com',
  password = 'password123',
) {
  fireEvent.change(getByPlaceholderText('you@example.com'), { target: { value: email } })
  fireEvent.change(getByPlaceholderText('Min 8 characters'), { target: { value: password } })
  fireEvent.click(getByRole('button', { name: /create my free account/i }))
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('TrialSignupForm — duplicate email error (non-compact)', () => {
  it('renders a sign-in link (not plain text) inside the error alert when API returns 409', async () => {
    mockFetch(409, { error: 'An account with this email already exists.' })

    const { getByPlaceholderText, getByRole } = render(<TrialSignupForm />)
    await fillAndSubmit(getByPlaceholderText, getByRole)

    const alert = await screen.findByRole('alert')
    const link = within(alert).getByRole('link', { name: /sign in/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('renders a sign-in link inside the error alert when error message contains "already exists"', async () => {
    mockFetch(409, { error: 'Email already exists in our system.' })

    const { getByPlaceholderText, getByRole } = render(<TrialSignupForm />)
    await fillAndSubmit(getByPlaceholderText, getByRole)

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      const link = within(alert).getByRole('link', { name: /sign in/i })
      expect(link).toHaveAttribute('href', '/login')
    })
  })

  it('does NOT show sign-in link inside error alert for generic API errors', async () => {
    mockFetch(500, { error: 'Internal server error.' })

    const { getByPlaceholderText, getByRole } = render(<TrialSignupForm />)
    await fillAndSubmit(getByPlaceholderText, getByRole)

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(within(alert).queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument()
    })
  })
})

describe('TrialSignupForm — duplicate email error (compact)', () => {
  it('renders a sign-in link inside the error alert in compact mode on 409', async () => {
    mockFetch(409, { error: 'An account with this email already exists.' })

    const { getByPlaceholderText, getByRole } = render(<TrialSignupForm compact />)

    fireEvent.change(getByPlaceholderText('Enter your email'), { target: { value: 'user@example.com' } })
    fireEvent.change(getByPlaceholderText('Create password (8+ chars)'), { target: { value: 'password123' } })
    fireEvent.click(getByRole('button', { name: /start free trial/i }))

    const alert = await screen.findByRole('alert')
    const link = within(alert).getByRole('link', { name: /sign in/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })
})

describe('TrialSignupForm — isDuplicateEmailError reset on re-submit', () => {
  it('clears sign-in link when user re-submits after a duplicate-email error', async () => {
    let signupCallCount = 0
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/events/track')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
      }
      signupCallCount++
      if (signupCallCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({ error: 'An account with this email already exists.' }),
        })
      }
      return Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Something went wrong. Please try again.' }),
      })
    })

    const { getByPlaceholderText, getByRole } = render(<TrialSignupForm />)

    fireEvent.change(getByPlaceholderText('you@example.com'), { target: { value: 'dup@example.com' } })
    fireEvent.change(getByPlaceholderText('Min 8 characters'), { target: { value: 'password123' } })
    fireEvent.click(getByRole('button', { name: /create my free account/i }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('link', { name: /sign in/i })).toBeInTheDocument()

    // Re-submit with different email — isDuplicateEmailError must reset
    fireEvent.change(getByPlaceholderText('you@example.com'), { target: { value: 'new@example.com' } })
    fireEvent.click(getByRole('button', { name: /create my free account/i }))

    await waitFor(() => {
      const updatedAlert = screen.getByRole('alert')
      expect(within(updatedAlert).queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument()
    })
  })
})
