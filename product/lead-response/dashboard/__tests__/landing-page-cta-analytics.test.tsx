/**
 * Landing Page CTA Analytics — Integration Tests
 *
 * Verifies that all PRD-specified CTA IDs are present in the landing page
 * markup and that trackCTAClick is called with correct parameters on click.
 *
 * PRD CTA IDs tested:
 *   - join_pilot_nav      (navigation)
 *   - sign_in_nav         (navigation)
 *   - see_how_it_works    (hero section)
 *   - start_trial_features (features section)
 *   - pricing_starter     (pricing section)
 *   - pricing_pro         (pricing section)
 *   - pricing_team        (pricing section)
 *   - start_trial_pricing (pricing section)
 */

import { render, screen, fireEvent } from '@testing-library/react'
import HomePage from '@/app/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/link to render as <a> with all props forwarded
jest.mock('next/link', () => {
  const React = require('react')
  return React.forwardRef(function MockLink(
    props: Record<string, unknown>,
    ref: React.Ref<HTMLAnchorElement>,
  ) {
    const { children, ...rest } = props
    return React.createElement('a', { ...rest, ref }, children)
  })
})

// Mock the analytics module
const mockTrackCTAClick = jest.fn()
const mockAttachScrollMilestoneObservers = jest.fn(() => jest.fn())

jest.mock('@/lib/analytics/ga4', () => ({
  trackCTAClick: (...args: unknown[]) => mockTrackCTAClick(...args),
  attachScrollMilestoneObservers: (...args: unknown[]) => mockAttachScrollMilestoneObservers(...args),
}))

// Mock trial-signup-form component
jest.mock('@/components/trial-signup-form', () => ({
  __esModule: true,
  default: () => null,
}))

// Mock IntersectionObserver
window.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
})) as unknown as typeof IntersectionObserver

describe('Landing Page CTA Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all PRD-specified data-cta-id attributes', () => {
    const { container } = render(<HomePage />)

    const requiredCtaIds = [
      'join_pilot_nav',
      'sign_in_nav',
      'see_how_it_works',
      'start_trial_features',
      'pricing_starter',
      'pricing_pro',
      'pricing_team',
      'start_trial_pricing',
    ]

    requiredCtaIds.forEach((ctaId) => {
      const el = container.querySelector(`[data-cta-id="${ctaId}"]`)
      expect(el).toBeTruthy()
    })
  })

  it('calls trackCTAClick(see_how_it_works) on demo button click', () => {
    render(<HomePage />)
    fireEvent.click(screen.getByText('See how it works ↓'))
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'see_how_it_works',
      'See how it works',
      'hero',
    )
  })

  it('calls trackCTAClick(join_pilot_nav) on nav pilot CTA click', () => {
    const { container } = render(<HomePage />)
    const el = container.querySelector('[data-cta-id="join_pilot_nav"]')!
    fireEvent.click(el)
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'join_pilot_nav',
      'Pilot Program',
      'navigation',
    )
  })

  it('calls trackCTAClick(sign_in_nav) on Sign In click', () => {
    const { container } = render(<HomePage />)
    const el = container.querySelector('[data-cta-id="sign_in_nav"]')!
    fireEvent.click(el)
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'sign_in_nav',
      'Sign In',
      'navigation',
    )
  })

  it('calls trackCTAClick(start_trial_features) on features CTA click', () => {
    render(<HomePage />)
    fireEvent.click(screen.getByText('Start Free Trial — No Credit Card'))
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'start_trial_features',
      'Start Free Trial — No Credit Card',
      'features',
    )
  })

  it('calls trackCTAClick(pricing_starter) on starter pricing CTA click', () => {
    const { container } = render(<HomePage />)
    const starterCta = container.querySelector('[data-cta-id="pricing_starter"]')!
    fireEvent.click(starterCta)
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'pricing_starter',
      'Get Started Starter',
      'pricing',
    )
  })

  it('calls trackCTAClick(pricing_pro) on pro pricing CTA click', () => {
    const { container } = render(<HomePage />)
    const proCta = container.querySelector('[data-cta-id="pricing_pro"]')!
    fireEvent.click(proCta)
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'pricing_pro',
      'Get Started Pro',
      'pricing',
    )
  })

  it('calls trackCTAClick(pricing_team) on team pricing CTA click', () => {
    const { container } = render(<HomePage />)
    const teamCta = container.querySelector('[data-cta-id="pricing_team"]')!
    fireEvent.click(teamCta)
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'pricing_team',
      'Get Started Team',
      'pricing',
    )
  })

  it('calls trackCTAClick(start_trial_pricing) on pricing trial link click', () => {
    const { container } = render(<HomePage />)
    const el = container.querySelector('[data-cta-id="start_trial_pricing"]')!
    fireEvent.click(el)
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'start_trial_pricing',
      'or start free trial',
      'pricing',
    )
  })

  it('attaches scroll milestone observers on mount', () => {
    render(<HomePage />)
    expect(mockAttachScrollMilestoneObservers).toHaveBeenCalledTimes(1)
    const args = mockAttachScrollMilestoneObservers.mock.calls[0][0]
    expect(args).toHaveLength(3)
  })
})
