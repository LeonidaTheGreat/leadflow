import { metadata } from './page'

describe('ReportsPage metadata', () => {
  it('uses reports-specific title and description distinct from analytics', () => {
    expect(metadata.title).toBe('Reports - AI Lead Response')
    expect(metadata.description).toContain('Operational reporting')
    expect(metadata.title).not.toBe('Analytics - AI Lead Response')
  })
})
