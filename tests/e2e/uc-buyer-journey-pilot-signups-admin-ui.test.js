const fs = require('fs')
const path = require('path')
const test = require('node:test')
const assert = require('node:assert/strict')

const ROOT = path.resolve(__dirname, '../..')
const DASHBOARD = path.join(ROOT, 'product', 'lead-response', 'dashboard')

function read(relPath) {
  return fs.readFileSync(path.join(DASHBOARD, relPath), 'utf8')
}

test('pilot signups admin page exists and calls list endpoint', () => {
  const file = path.join(DASHBOARD, 'app', 'admin', 'pilot-signups', 'page.tsx')
  assert.ok(fs.existsSync(file), 'pilot signups admin page should exist')
  const src = fs.readFileSync(file, 'utf8')
  assert.ok(src.includes("fetch(`/api/admin/pilot-signups/list?"), 'page should call list endpoint')
  assert.ok(src.includes("fetch('/api/admin/pilot-signups/invite'"), 'page should call invite endpoint')
  assert.ok(src.includes('fetch(`/api/admin/pilot-signups/${signup.id}`'), 'page should call status patch endpoint')
})

test('list route enforces auth and exposes required filters', () => {
  const src = read('app/api/admin/pilot-signups/list/route.ts')
  assert.ok(src.includes('requireAdmin(request)'), 'list route should enforce admin auth')
  assert.ok(src.includes("searchParams.get('status')"), 'list route should parse status filter')
  assert.ok(src.includes("searchParams.get('crm')"), 'list route should parse crm filter')
  assert.ok(src.includes("searchParams.get('monthly_leads')"), 'list route should parse monthly_leads filter')
  assert.ok(src.includes("from('pilot_signups')"), 'list route should query pilot_signups')
  assert.ok(src.includes("from('pilot_invites')"), 'list route should read pilot_invites for invited state')
})

test('status patch route validates status and updates pilot_signups', () => {
  const src = read('app/api/admin/pilot-signups/[id]/route.ts')
  assert.ok(src.includes('requireAdmin(request)'), 'patch route should enforce admin auth')
  assert.ok(src.includes('ALLOWED_STATUS'), 'patch route should validate status values')
  assert.ok(src.includes("from('pilot_signups')"), 'patch route should update pilot_signups')
  assert.ok(src.includes('contacted_at'), 'patch route should update contacted_at when status changes')
})

test('admin command center shows pilot signup card and gtm-status returns counts', () => {
  const pageSrc = read('app/admin/page.tsx')
  const apiSrc = read('app/api/admin/gtm-status/route.ts')

  assert.ok(pageSrc.includes("href=\"/admin/pilot-signups\""), 'admin page should link to pilot-signups')
  assert.ok(pageSrc.includes('pilotSignupCount'), 'admin page should show total pilot signup count')
  assert.ok(pageSrc.includes('uninvitedSignupCount'), 'admin page should show uninvited pilot signup count')

  assert.ok(apiSrc.includes('pilotSignupCount'), 'gtm-status should include pilotSignupCount')
  assert.ok(apiSrc.includes('uninvitedSignupCount'), 'gtm-status should include uninvitedSignupCount')
  assert.ok(apiSrc.includes("from('pilot_signups')"), 'gtm-status should query pilot_signups for counts')
})
