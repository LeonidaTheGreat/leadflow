import { MessageChannel } from 'worker_threads'
import { DashboardNav } from './dashboard-nav'

Object.assign(globalThis, { MessageChannel })

jest.mock('@/components/dashboard/trial-badge', () => () => <div data-testid="trial-badge" />)

describe('DashboardNav', () => {
  it('renders navigation links with correct hrefs and data-testid attributes', () => {
    const { renderToStaticMarkup } = require('react-dom/server')
    const html = renderToStaticMarkup(<DashboardNav />)

    // Default (non-admin) nav renders 4 items: Lead Feed, History, Analytics, Settings
    expect(html).toContain('href="/dashboard"')
    expect(html).toContain('data-testid="nav-link-lead-feed"')

    expect(html).toContain('href="/dashboard/history"')
    expect(html).toContain('data-testid="nav-link-history"')

    expect(html).toContain('href="/dashboard/analytics"')
    expect(html).toContain('data-testid="nav-link-analytics"')

    expect(html).toContain('href="/settings"')
    expect(html).toContain('data-testid="nav-link-settings"')
  })

  it('does not render admin-only items by default', () => {
    const { renderToStaticMarkup } = require('react-dom/server')
    const html = renderToStaticMarkup(<DashboardNav />)

    expect(html).not.toContain('href="/dashboard/admin"')
    expect(html).not.toContain('href="/dashboard/dev"')
  })

  it('renders admin-only items when isAdmin is true', () => {
    const { renderToStaticMarkup } = require('react-dom/server')
    const html = renderToStaticMarkup(<DashboardNav isAdmin />)

    expect(html).toContain('href="/dashboard/admin"')
    expect(html).toContain('data-testid="nav-link-admin"')

    expect(html).toContain('href="/dashboard/dev"')
    expect(html).toContain('data-testid="nav-link-dev"')
  })

  it('includes touch-friendly horizontal scroll classes for mobile', () => {
    const { renderToStaticMarkup } = require('react-dom/server')
    const html = renderToStaticMarkup(<DashboardNav />)

    expect(html).toContain('overflow-x-auto')
    expect(html).toContain('touch-pan-x')
    expect(html).toContain('snap-x')
    expect(html).toContain('min-h-10')
  })
})
