/**
 * Landing Page CTA Analytics — Integration Tests
 *
 * Verifies that all PRD-specified CTA IDs are present in the landing page
 * markup and that trackCTAClick is called with correct parameters on click.
 *
 * PRD CTA IDs tested:
 *   - join_pilot_hero     (hero section)
 *   - get_started_hero    (hero section)
 *   - see_how_it_works    (hero section)
 *   - join_pilot_nav      (navigation)
 *   - sign_in_nav         (navigation)
 *   - pricing_starter     (pricing section)
 *   - pricing_pro         (pricing section)
 *   - pricing_team        (pricing section)
 *   - lead_magnet_cta     (lead magnet section)
 */

import { render, screen, fireEvent } from '@testing-library/react'
import HomePage from '@/app/page'

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
      'join_pilot_hero',
      'get_started_hero',
      'see_how_it_works',
      'join_pilot_nav',
      'sign_in_nav',
      'pricing_starter',
      'pricing_pro',
      'pricing_team',
      'lead_magnet_cta',
    ]

    requiredCtaIds.forEach((ctaId) => {
      const el = container.querySelector(`[data-cta-id="${ctaId}"]`)
      expect(el).toBeTruthy()
    })
  })

  it('calls trackCTAClick(join_pilot_hero) on hero pilot CTA click', () => {
    const { container } = render(<HomePage />)
    const el = container.querySelector('[data-cta-id="join_pilot_hero"]')!
    fireEvent.click(el)
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'join_pilot_hero',
      "Join the Pilot — It's Free",
      'hero',
    )
  })

  it('calls trackCTAClick(get_started_hero) on Get Started click', () => {
    render(<HomePage />)
    fireEvent.click(screen.getByText('Get Started Free'))
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'get_started_hero',
      'Get Started Free',
      'hero',
    )
  })

  it('calls trackCTAClick(see_how_it_works) on demo button click', () => {
    render(<HomePage />)
    fireEvent.click(screen.getByText('See How It Works'))
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'see_how_it_works',
      'See How It Works',
      'hero',
    )
  })

  it('calls trackCTAClick(join_pilot_nav) on nav pilot CTA click', () => {
    render(<HomePage />)
    fireEvent.click(screen.getByText('Join Free Pilot'))
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'join_pilot_nav',
      'Join Free Pilot',
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

  it('calls trackCTAClick(pricing_starter) on starter pricing CTA click', () => {
    render(<HomePage />)
    fireEvent.click(screen.getByText(/Starter — Free pilot/))
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'pricing_starter',
      'Get Starter',
      'pricing',
    )
  })

  it('calls trackCTAClick(pricing_pro) on pro pricing CTA click', () => {
    render(<HomePage />)
    fireEvent.click(screen.getByText(/Pro — Most popular/))
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'pricing_pro',
      'Get Pro',
      'pricing',
    )
  })

  it('calls trackCTAClick(pricing_team) on team pricing CTA click', () => {
    render(<HomePage />)
    fireEvent.click(screen.getByText(/Team — 5 agents/))
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'pricing_team',
      'Get Team',
      'pricing',
    )
  })

  it('calls trackCTAClick(lead_magnet_cta) on lead magnet CTA click', () => {
    const { container } = render(<HomePage />)
    const el = container.querySelector('[data-cta-id="lead_magnet_cta"]')!
    fireEvent.click(el)
    expect(mockTrackCTAClick).toHaveBeenCalledWith(
      'lead_magnet_cta',
      'Download Free Guide',
      'lead_magnet',
    )
  })

  it('attaches scroll milestone observers on mount', () => {
    render(<HomePage />)
    expect(mockAttachScrollMilestoneObservers).toHaveBeenCalledTimes(1)
    const args = mockAttachScrollMilestoneObservers.mock.calls[0][0]
    expect(args).toHaveLength(3)
  })
})
