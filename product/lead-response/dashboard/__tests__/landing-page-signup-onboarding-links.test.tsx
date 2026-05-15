/**
 * TASK SPEC (cc686016-bd32-49a2-93f6-d70ef43d4166)
 * What:
 * - Update `product/lead-response/dashboard/app/page.tsx` (`HomePage`) to include explicit landing-page links to `/signup` and `/onboarding`.
 * - Add regression test `product/lead-response/dashboard/__tests__/landing-page-signup-onboarding-links.test.tsx`
 *   to verify those links are rendered.
 *
 * Verify:
 * - Run `cd product/lead-response/dashboard && npm test -- --runInBand __tests__/landing-page-signup-onboarding-links.test.tsx`
 *   and expect passing assertions for `/signup` and `/onboarding` hrefs.
 * - Run `cd product/lead-response/dashboard && npm test` and expect full suite to pass.
 * - Run `cd product/lead-response/dashboard && npx next build` and expect successful build.
 * - Run `rg -n 'href=\"/signup\"|href=\"/onboarding\"' product/lead-response/dashboard/app/page.tsx`
 *   and expect at least one hit for each path.
 *
 * Boundaries:
 * - Do not modify signup or onboarding API routes, services, or database schema.
 * - Do not change pricing logic, analytics schema, or unrelated page sections.
 * - Do not touch auto-generated docs/config files listed as protected.
 */
import { render } from '@testing-library/react'
import HomePage from '@/app/page'

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
    const { children, ...rest } = props
    return React.createElement('a', { ...rest, ref }, children)
  })
})

jest.mock('@/lib/analytics/ga4', () => ({
  trackCTAClick: jest.fn(),
  attachScrollMilestoneObservers: jest.fn(() => jest.fn()),
}))

jest.mock('@/components/trial-signup-form', () => ({
  __esModule: true,
  default: () => null,
}))

window.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
})) as unknown as typeof IntersectionObserver

describe('Landing page signup/onboarding links', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true } as Response)) as jest.Mock
  })

  it('renders at least one link to /signup', () => {
    const { container } = render(<HomePage />)
    expect(container.querySelector('a[href="/signup"]')).toBeTruthy()
  })

  it('renders at least one link to /onboarding', () => {
    const { container } = render(<HomePage />)
    expect(container.querySelector('a[href="/onboarding"]')).toBeTruthy()
  })
})
