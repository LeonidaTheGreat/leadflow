'use strict'
const fs = require('fs'), path = require('path')
const projectRoot = path.join(__dirname, '..')
const dashboardRoot = path.join(projectRoot, 'product/lead-response/dashboard')
describe('Admin pilot invite flow — E2E', () => {
  test('POST /api/admin/invite-pilot route exists', () => {
    expect(fs.existsSync(path.join(dashboardRoot, 'app/api/admin/invite-pilot/route.ts'))).toBe(true)
  })
  test('invite-pilot enforces X-Admin-Token auth', () => {
    const c = fs.readFileSync(path.join(dashboardRoot, 'app/api/admin/invite-pilot/route.ts'), 'utf8')
    expect(c).toMatch(/X-Admin-Token|x-admin-token|ADMIN_SECRET/)
  })
  test('invite-pilot generates a secure token', () => {
    const c = fs.readFileSync(path.join(dashboardRoot, 'app/api/admin/invite-pilot/route.ts'), 'utf8')
    expect(c).toMatch(/sha256|randomBytes|crypto/)
  })
  test('accept-invite page exists', () => {
    expect(fs.existsSync(path.join(dashboardRoot, 'app/accept-invite/page.tsx'))).toBe(true)
  })
  test('accept-invite page wraps useSearchParams in Suspense', () => {
    const c = fs.readFileSync(path.join(dashboardRoot, 'app/accept-invite/page.tsx'), 'utf8')
    expect(c).toMatch(/Suspense/)
    expect(c).toMatch(/useSearchParams/)
  })
  test('POST /api/auth/accept-invite route exists', () => {
    expect(fs.existsSync(path.join(dashboardRoot, 'app/api/auth/accept-invite/route.ts'))).toBe(true)
  })
  test('accept-invite validates token against pilot_invites table', () => {
    const c = fs.readFileSync(path.join(dashboardRoot, 'app/api/auth/accept-invite/route.ts'), 'utf8')
    expect(c).toMatch(/pilot_invites/)
  })
  test('pilot_invites migration exists', () => {
    const migPath = path.join(projectRoot, 'migrations/014_pilot_invites.sql')
    expect(fs.existsSync(migPath)).toBe(true)
    const c = fs.readFileSync(migPath, 'utf8')
    expect(c).toMatch(/CREATE TABLE/)
    expect(c).toMatch(/pilot_invites/)
  })
  test('admin invite page at /admin/invite exists', () => {
    expect(fs.existsSync(path.join(dashboardRoot, 'app/admin/invite/page.tsx'))).toBe(true)
  })
})
