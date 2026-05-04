#!/usr/bin/env node

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

function run() {
  const dashboardRoot = path.resolve(__dirname, '..')
  const navFile = path.join(dashboardRoot, 'app', 'dashboard', 'dashboard-nav.tsx')

  const buildOutput = execFileSync('npm', ['run', 'build'], {
    cwd: dashboardRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })

  assert(
    buildOutput.includes('Compiled successfully') || buildOutput.includes('✓ Compiled successfully'),
    'Expected Next.js build to compile successfully'
  )

  const navSource = fs.readFileSync(navFile, 'utf8')

  const navBlockMatch = navSource.match(/export const DASHBOARD_NAV_ITEMS:[\s\S]*?\] as const/)
  assert(navBlockMatch, 'Could not locate DASHBOARD_NAV_ITEMS block in dashboard-nav.tsx')

  const navBlock = navBlockMatch[0]
  assert(navBlock.includes("{ href: '/dashboard', label: 'Lead Feed'"), 'Lead Feed must point to /dashboard')
  assert(navBlock.includes("{ href: '/dashboard/history', label: 'History'"), 'History must point to /dashboard/history')
  assert(!navBlock.includes("href: '/dashboard/leads'"), 'Navigation must not include stale /dashboard/leads route')

  const hrefMatches = [...navBlock.matchAll(/href: '([^']+)'/g)].map((m) => m[1])
  assert(hrefMatches.length > 0, 'Expected at least one nav href')
  // Reports intentionally redirects to /dashboard/analytics (no dedicated reports page), so hrefs are not all unique
  assert(!navBlock.includes("href: '/dashboard/reports'"), 'Reports nav item must not point to /dashboard/reports (no page exists there)')
  assert(!navBlock.includes("href: '/dashboard/assignments'"), 'Assignments nav item must be removed (no data model)')
  assert(!navBlock.includes("href: '/dashboard/settings'"), 'Settings must use /settings not /dashboard/settings')

  console.log('PASS uc-1015-navigation-links.test.js')
}

try {
  run()
} catch (error) {
  console.error('FAIL uc-1015-navigation-links.test.js')
  console.error(error.message || error)
  process.exit(1)
}
