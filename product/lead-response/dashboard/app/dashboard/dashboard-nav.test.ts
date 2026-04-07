import { DASHBOARD_NAV_ITEMS } from './dashboard-nav'

describe('Dashboard navigation routes', () => {
  it('uses unique hrefs for primary dashboard pages', () => {
    const primaryItems = DASHBOARD_NAV_ITEMS.filter((item) =>
      ['Lead Feed', 'History', 'Analytics'].includes(item.label)
    )

    expect(primaryItems).toHaveLength(3)

    const hrefs = primaryItems.map((item) => item.href)
    expect(new Set(hrefs).size).toBe(3)
    expect(hrefs).toEqual(['/dashboard', '/dashboard/history', '/dashboard/analytics'])
  })
})
