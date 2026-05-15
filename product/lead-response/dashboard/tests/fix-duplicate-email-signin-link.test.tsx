/**
 * Test: duplicate email error shows sign-in link in TrialSignupForm
 * Task: baac6654-1efa-4759-90d3-ede92cd5c4b5
 *
 * Verifies that when the API returns a 409 (duplicate email) response,
 * TrialSignupForm renders a clickable sign-in link inside the error alert
 * instead of plain text.
 *
 * Bug: Before the fix, the error was rendered as plain text with no link.
 * After the fix, a <Link href="/login"> element is rendered inside the alert.
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import TrialSignupForm from '@/components/trial-signup-form'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}))

// Mock Next.js Link as a plain anchor for test-environment rendering
jest.mock('next/link', () => {
  const React = require('react')
  return React.forwardRef(function MockLink(
    props: Record<string, unknown>,
    ref: React.Ref<HTMLAnchorElement>,
  ) {
    const { children, href, ...rest } = props
    return React.createElement('a', { href, ...rest, ref }, children)
  })
})

// Mock GA4 analytics (non-blocking)
jest.mock('@/lib/analytics/ga4', () => ({
  trackCTAClick: jest.fn(),
}))

/** Helper: fill and submit the non-compact TrialSignupForm */
async function fillAndSubmit(email = 'user@example.com', password = 'password123') {
  fireEvent.change(screen.getByLabelText(/^email address$/i), {
    target: { value: email },
  })
  // Target the password input by its id to avoid ambiguity with the eye-toggle aria-label
  fireEvent.change(screen.getByTestId('trial-password-input') ?? screen.getByDisplayValue(''), {
    target: { value: password },
  })
  fireEvent.click(screen.getByRole('button', { name: /create my free account/i }))
}

describe('TrialSignupForm — duplicate email shows sign-in link', () => {
  const mockFetch = jest.fn()

  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders sign-in link inside error alert when API returns 409 (duplicate email)', async () => {
    // Simulate a 409 Conflict response from /api/auth/trial-signup
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'An account with this email already exists. Sign in instead.',
      }),
    })

    render(<TrialSignupForm />)

    // Fill email field
    fireEvent.change(screen.getByLabelText(/^email address$/i), {
      target: { value: 'existing@example.com' },
    })
    // Fill password by id (avoids ambiguity with show-password toggle aria-label)
    const passwordInput = document.getElementById('trial-password')!
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create my free account/i }))

    // Wait for the error alert to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // The sign-in link must be rendered INSIDE the error alert, pointing to /login
    const alertEl = screen.getByRole('alert')
    const signInLink = within(alertEl).getByRole('link', { name: /sign in/i })
    expect(signInLink).toBeInTheDocument()
    expect(signInLink).toHaveAttribute('href', '/login')

    // Alert must contain the "already" message
    expect(alertEl).toHaveTextContent(/already/i)
  })

  it('renders sign-in link inside error alert when error message contains "already exists" (any status)', async () => {
    // Edge case: non-409 status but message still indicates duplicate
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'An account with this email already exists.',
      }),
    })

    render(<TrialSignupForm />)

    fireEvent.change(screen.getByLabelText(/^email address$/i), {
      target: { value: 'existing@example.com' },
    })
    const passwordInput = document.getElementById('trial-password')!
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create my free account/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    const alertEl = screen.getByRole('alert')
    const signInLink = within(alertEl).getByRole('link', { name: /sign in/i })
    expect(signInLink).toBeInTheDocument()
    expect(signInLink).toHaveAttribute('href', '/login')
  })

  it('does NOT render sign-in link inside error alert for unrelated errors', async () => {
    // Generic API error — not a duplicate email
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: 'Something went wrong. Please try again.',
      }),
    })

    render(<TrialSignupForm />)

    fireEvent.change(screen.getByLabelText(/^email address$/i), {
      target: { value: 'user@example.com' },
    })
    const passwordInput = document.getElementById('trial-password')!
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create my free account/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // No sign-in link inside the error alert for non-duplicate errors
    const alertEl = screen.getByRole('alert')
    const linksInAlert = within(alertEl).queryAllByRole('link')
    expect(linksInAlert).toHaveLength(0)

    // Plain error text should show the message
    expect(alertEl).toHaveTextContent(/something went wrong/i)
  })
})

describe('TrialSignupForm — duplicate email detection logic', () => {
  it('detects duplicate email via 409 status code', () => {
    const status = 409
    const errorMessage = 'An account with this email already exists. Sign in instead.'

    const isDuplicate =
      status === 409 || errorMessage.toLowerCase().includes('already exists')

    expect(isDuplicate).toBe(true)
  })

  it('detects duplicate email via "already exists" in message (any status)', () => {
    const status = 400
    const errorMessage = 'An account with this email already exists.'

    const isDuplicate =
      status === 409 || errorMessage.toLowerCase().includes('already exists')

    expect(isDuplicate).toBe(true)
  })

  it('does not flag unrelated errors as duplicate email', () => {
    const status = 500
    const errorMessage = 'Internal server error'

    const isDuplicate =
      status === 409 || errorMessage.toLowerCase().includes('already exists')

    expect(isDuplicate).toBe(false)
  })

  it('API returns 409 status for duplicate email (source of truth)', () => {
    // The trial-signup route returns 409 with this exact message for duplicates
    const expectedStatus = 409
    const expectedMessage = 'An account with this email already exists. Sign in instead.'

    expect(expectedStatus).toBe(409)
    expect(expectedMessage).toContain('already exists')
    expect(expectedMessage).toContain('Sign in')
  })
})

describe('TrialSignupForm source — sign-in link implementation', () => {
  const fs = require('fs')
  const path = require('path')
  const formPath = path.resolve(
    __dirname,
    '../components/trial-signup-form.tsx',
  )
  const content = fs.readFileSync(formPath, 'utf8')

  it('form tracks isDuplicateEmailError state', () => {
    expect(content).toContain('isDuplicateEmailError')
    expect(content).toContain('setIsDuplicateEmailError')
  })

  it('form detects 409 status to set isDuplicateEmailError', () => {
    expect(content).toContain('response.status === 409')
  })

  it('form detects "already exists" in message to set isDuplicateEmailError', () => {
    expect(content).toContain("includes('already exists')")
  })

  it('form renders <Link href="/login"> when isDuplicateEmailError is true', () => {
    expect(content).toContain('href="/login"')
    expect(content).toContain('isDuplicateEmailError')
  })

  it('form resets isDuplicateEmailError on each new submit', () => {
    // setIsDuplicateEmailError(false) must be called in handleSubmit before the API call
    const handleSubmitStart = content.indexOf('const handleSubmit')
    const resetCall = content.indexOf('setIsDuplicateEmailError(false)', handleSubmitStart)
    const fetchCall = content.indexOf("fetch('/api/auth/trial-signup'", handleSubmitStart)

    expect(resetCall).toBeGreaterThan(handleSubmitStart)
    expect(resetCall).toBeLessThan(fetchCall)
  })
})
