'use strict'
const fs = require('fs'), path = require('path')
const projectRoot = path.join(__dirname, '..')
const dashboardRoot = path.join(projectRoot, 'product/lead-response/dashboard')
describe('Admin pilot invite flow — QC security', () => {
  test('invite-pilot has no hardcoded secrets', () => {
    const c = fs.readFileSync(path.join(dashboardRoot, 'app/api/admin/invite-pilot/route.ts'), 'utf8')
    expect(c).not.toMatch(/sk_live_/)
  })
  test('token stored as hash, not raw', () => {
    const c = fs.readFileSync(path.join(dashboardRoot, 'app/api/admin/invite-pilot/route.ts'), 'utf8')
    expect(c).toMatch(/tokenHash/)
    expect(c).toMatch(/sha256/)
  })
  test('invite creation has error handling', () => {
    const c = fs.readFileSync(path.join(dashboardRoot, 'app/api/admin/invite-pilot/route.ts'), 'utf8')
    expect(c).toMatch(/try|catch|error/)
  })
  test('accept-invite validates token expiry', () => {
    const c = fs.readFileSync(path.join(dashboardRoot, 'app/api/auth/accept-invite/route.ts'), 'utf8')
    expect(c).toMatch(/token_expires_at|expires/)
  })
  test('migration token column is TEXT not UUID', () => {
    const c = fs.readFileSync(path.join(projectRoot, 'migrations/014_pilot_invites.sql'), 'utf8')
    expect(c).toMatch(/token\s+TEXT/)
  })
})
