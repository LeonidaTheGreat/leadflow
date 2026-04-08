#!/usr/bin/env node

const assert = require('assert')
const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function run() {
  const root = path.resolve(__dirname, '..')
  const adminPage = path.join(root, 'app', 'admin', 'page.tsx')
  const apiRoute = path.join(root, 'app', 'api', 'admin', 'gtm-status', 'route.ts')
  const pilotCampaignsPage = path.join(root, 'app', 'admin', 'pilot-campaigns', 'page.tsx')

  assert.ok(fs.existsSync(adminPage), 'app/admin/page.tsx should exist')
  assert.ok(fs.existsSync(apiRoute), 'app/api/admin/gtm-status/route.ts should exist')

  const adminSource = read(adminPage)
  assert.ok(
    adminSource.includes("fetch('/api/admin/gtm-status')"),
    'Admin command center should fetch /api/admin/gtm-status'
  )
  assert.ok(
    adminSource.includes("href=\"/admin/pilot-campaigns\"") ||
      adminSource.includes('href="/admin/pilot-campaigns"'),
    'Admin page should link to /admin/pilot-campaigns'
  )
  assert.ok(
    adminSource.includes('href="/admin/outreach"'),
    'Admin page should link to /admin/outreach'
  )
  assert.ok(
    adminSource.includes('href="/admin/pilots"'),
    'Admin page should link to /admin/pilots'
  )
  assert.ok(
    adminSource.includes('href="/admin/funnel"'),
    'Admin page should link to /admin/funnel'
  )
  assert.ok(
    adminSource.includes('GTM Execution Command Center'),
    'Admin page should render the GTM execution heading'
  )

  const apiSource = read(apiRoute)
  assert.ok(apiSource.includes("from('pilot_recruitment_campaigns')"), 'GTM API should read pilot campaigns')
  assert.ok(apiSource.includes("from('pilot_recruitment_targets')"), 'GTM API should read recruitment targets')
  assert.ok(apiSource.includes("from('pilot_progress')"), 'GTM API should read pilot progress')
  assert.ok(apiSource.includes("from('action_items')"), 'GTM API should read pending action items')
  assert.ok(apiSource.includes('checkSmsDeliveryHealth'), 'GTM API should include SMS delivery health')
  assert.ok(apiSource.includes('getA2pRegistrationStatus'), 'GTM API should include A2P registration status')

  const pilotCampaignsSource = read(pilotCampaignsPage)
  assert.ok(
    pilotCampaignsSource.includes('Link href="/admin"') || pilotCampaignsSource.includes("Link href=\"/admin\""),
    'Pilot campaigns page should link back to /admin'
  )

  console.log('PASS gtm-execution-command-center.test.js')
}

try {
  run()
} catch (error) {
  console.error('FAIL gtm-execution-command-center.test.js')
  console.error(error.message || error)
  process.exit(1)
}
