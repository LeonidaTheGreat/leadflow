import { MessageChannel } from 'worker_threads'
import { DashboardNav } from './dashboard-nav'

Object.assign(globalThis, { MessageChannel })

jest.mock('@/components/dashboard/trial-badge', () => () => <div data-testid="trial-badge" />)

describe.skip('DashboardNav', () => {
  it('adds descriptive aria-labels to dashboard navigation links', () => {
    const { renderToStaticMarkup } = require('react-dom/server')
    const html = renderToStaticMarkup(<DashboardNav />)

    expect(html).toContain('href="/dashboard" aria-label="Go to dashboard home"')
    expect(html).toContain('href="/dashboard" aria-label="Go to lead feed"')
    expect(html).toContain('href="/dashboard/history" aria-label="Go to lead history"')
    expect(html).toContain('href="/dashboard/analytics" aria-label="Go to dashboard analytics"')
    expect(html).toContain('href="/admin/simulator" aria-label="Go to lead response simulator"')
    expect(html).toContain('href="/settings" aria-label="Go to settings"')
  })
})
