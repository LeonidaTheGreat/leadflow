/**
 * Test: Signup Page — Plan Cards Render
 *
 * Regression test for: "Signup page shows Choose Your Plan but no plan options are listed"
 * Root cause was useSearchParams() causing SSR render failure (plans grid not rendered).
 * Fix: replaced useSearchParams with window.location.search in useEffect.
 *
 * This test renders the actual SignupPage component and verifies all 3 plan cards
 * appear with correct names and prices — catching any future rendering regression.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next/link', () => {
  const MockLink = React.forwardRef(function MockLink(
    props: Record<string, unknown>,
    ref: React.Ref<HTMLAnchorElement>,
  ) {
    const { children, href, ...rest } = props
    return React.createElement('a', { href: href as string, ...rest, ref }, children)
  })
  return MockLink
})

jest.mock('@/components/trial-signup-form', () => {
  return function MockTrialSignupForm() {
    return React.createElement('div', { 'data-testid': 'trial-signup-form' }, 'Trial Form')
  }
})

jest.mock('@/lib/analytics/ga4', () => ({
  trackFormEvent: jest.fn(),
  trackEvent: jest.fn(),
  trackCTAClick: jest.fn(),
}))

describe('SignupPage — plan cards render', () => {
  // jsdom default: window.location.search = '' → no ?mode=trial → PaidSignupFlow renders plans

  it('renders the Choose Your Plan heading', async () => {
    const SignupPage = (await import('../app/signup/page')).default
    render(<SignupPage />)
    expect(screen.getByText('Choose Your Plan')).toBeInTheDocument()
  })

  it('renders all 3 plan cards', async () => {
    const SignupPage = (await import('../app/signup/page')).default
    render(<SignupPage />)
    expect(screen.getByTestId('signup-plan-card-starter')).toBeInTheDocument()
    expect(screen.getByTestId('signup-plan-card-pro')).toBeInTheDocument()
    expect(screen.getByTestId('signup-plan-card-team')).toBeInTheDocument()
  })

  it('renders correct prices for all plans', async () => {
    const SignupPage = (await import('../app/signup/page')).default
    render(<SignupPage />)
    expect(screen.getByText('$49')).toBeInTheDocument()
    expect(screen.getByText('$149')).toBeInTheDocument()
    expect(screen.getByText('$399')).toBeInTheDocument()
  })

  it('renders plan names: Starter, Pro, Team', async () => {
    const SignupPage = (await import('../app/signup/page')).default
    render(<SignupPage />)
    expect(screen.getByText('Starter')).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
  })

  it('renders Get Started buttons for each plan', async () => {
    const SignupPage = (await import('../app/signup/page')).default
    render(<SignupPage />)
    const buttons = screen.getAllByText('Get Started')
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })

  it('does not render trial form when no ?mode=trial in URL', async () => {
    const SignupPage = (await import('../app/signup/page')).default
    render(<SignupPage />)
    expect(screen.queryByTestId('trial-signup-form')).not.toBeInTheDocument()
  })
})
