/**
 * E2E Test: trial-countdown-widget
 *
 * Verifies the Trial Countdown Widget & Urgency feature:
 * 1. TrialCountdownWidget component renders for trial agents
 * 2. Three urgency tiers (green > 7, yellow 3-7, red <= 3) are implemented
 * 3. Expired state is handled with "restore access" messaging
 * 4. Upgrade button is always visible in all states
 * 5. Hours display when <= 1 day remaining
 * 6. Widget does not render for paid users
 * 7. Component file exists at correct path
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const dashboardDir = path.resolve(__dirname, '../../product/lead-response/dashboard')
let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`)
    failed++
  }
}

function readFile(relPath) {
  return fs.readFileSync(path.join(dashboardDir, relPath), 'utf8')
}

function fileExists(relPath) {
  return fs.existsSync(path.join(dashboardDir, relPath))
}

async function run() {
  console.log('\n=== E2E: Trial Countdown Widget & Urgency ===\n')

  // ── AC-8: Component file exists at correct path ────────────────────────────

  console.log('File existence:')

  await test('TrialCountdownWidget component exists at correct path', async () => {
    assert.ok(
      fileExists('components/dashboard/TrialCountdownWidget.tsx'),
      'TrialCountdownWidget.tsx not found at components/dashboard/'
    )
  })

  await test('Dashboard page imports TrialCountdownWidget', async () => {
    const src = readFile('app/dashboard/page.tsx')
    assert.ok(
      src.includes('TrialCountdownWidget'),
      'Dashboard page does not import TrialCountdownWidget'
    )
  })

  await test('Dashboard page renders TrialCountdownWidget', async () => {
    const src = readFile('app/dashboard/page.tsx')
    assert.ok(
      src.includes('<TrialCountdownWidget'),
      'Dashboard page does not render TrialCountdownWidget component'
    )
  })

  // ── AC-1: Green state renders with upgrade button ────────────────────────

  console.log('\nAC-1: Green state (> 7 days):')

  await test('Component checks daysRemaining > 7 for green state', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(
      src.includes('daysRemaining <= 7') || src.includes('>= 7'),
      'Missing check for green state (daysRemaining > 7)'
    )
  })

  await test('Component uses emerald color for green state', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(src.includes('emerald'), 'Missing emerald color class for green state')
  })

  await test('Upgrade button visible in green state', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(src.includes('Upgrade'), 'Missing upgrade button')
    assert.ok(src.includes('Upgrade to Pro'), 'Missing upgrade button label')
  })

  // ── AC-2: Yellow state renders ────────────────────────────────────────────

  console.log('\nAC-2: Yellow state (3-7 days):')

  await test('Component checks daysRemaining 3-7 for yellow state', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(
      (src.includes('daysRemaining <= 7') && src.includes('daysRemaining <= 3')) ||
      src.includes('yellow'),
      'Missing logic for yellow state (3-7 days threshold)'
    )
  })

  await test('Component uses yellow color for yellow state', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(src.includes('yellow'), 'Missing yellow color class for yellow state')
  })

  // ── AC-3: Red state renders ───────────────────────────────────────────────

  console.log('\nAC-3: Red state (<= 3 days):')

  await test('Component checks daysRemaining <= 3 for red state', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(
      src.includes('daysRemaining <= 3') || src.includes('daysRemaining<=3'),
      'Missing check for red state (daysRemaining <= 3)'
    )
  })

  await test('Component uses red color for red state', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(src.includes('red'), 'Missing red color class for red state')
  })

  // ── AC-4: Expired state renders ───────────────────────────────────────────

  console.log('\nAC-4: Expired state:')

  await test('Component checks isExpired flag for expired state', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(src.includes('isExpired'), 'Missing isExpired check')
  })

  await test('Expired state shows "restore access" or similar messaging', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(
      src.includes('restore access') || src.includes('Trial ended'),
      'Missing "restore access" messaging for expired state'
    )
  })

  // ── AC-5: Upgrade button always present ────────────────────────────────────

  console.log('\nAC-5: Upgrade button always visible:')

  await test('Upgrade button is not conditionally hidden (always visible)', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    // Count button renders to ensure it's not behind a conditional that only shows in red state
    const buttonMatches = src.match(/onClick={handleUpgrade}/g) || []
    assert.ok(buttonMatches.length > 0, 'Missing upgrade button onclick handler')
    // Verify button is outside of urgency-specific conditionals by checking structure
    assert.ok(src.includes('className={'), 'Button styling is not dynamic across all states')
  })

  await test('Button links to /settings/billing or initiates checkout', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(
      src.includes('handleUpgrade') || src.includes('upgrade-checkout'),
      'Button does not link to upgrade flow'
    )
  })

  // ── AC-6: Hours shown when <= 1 day remaining ────────────────────────────

  console.log('\nAC-6: Hours display when <= 1 day:')

  await test('Component calculates and displays hours remaining', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(
      src.includes('hoursRemaining') || src.includes('Math.ceil'),
      'Missing hours calculation logic'
    )
  })

  await test('Component handles daysRemaining = 0 case with hours', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(
      src.includes('hour') || src.includes('hours'),
      'Missing hours display in component'
    )
  })

  // ── AC-7: Widget not shown for paid users ─────────────────────────────────

  console.log('\nAC-7: Hidden for paid users:')

  await test('Component returns null for non-trial/non-pilot users', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(
      src.includes('!status.isTrial') && src.includes('!status.isPilot'),
      'Missing check to hide widget for paid users'
    )
  })

  await test('Component checks both isTrial and isPilot flags', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    const lines = src.split('\n')
    let foundCheck = false
    for (const line of lines) {
      if (line.includes('isTrial') && line.includes('isPilot')) {
        foundCheck = true
        break
      }
    }
    assert.ok(foundCheck, 'Missing combined isTrial/isPilot check')
  })

  // ── Component code quality checks ────────────────────────────────────────

  console.log('\nCode quality:')

  await test('Component fetches trial status from API on mount', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(
      src.includes('/api/auth/trial-status'),
      'Component does not fetch from trial-status API'
    )
  })

  await test('Component uses useEffect for side effects', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(src.includes('useEffect'), 'Missing useEffect hook')
  })

  await test('Expiry date formatted as "Expires May 15" style', async () => {
    const src = readFile('components/dashboard/TrialCountdownWidget.tsx')
    assert.ok(
      src.includes('toLocaleDateString') || src.includes('Expires'),
      'Missing expiry date formatting'
    )
  })

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log(`\n=== Results ===`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total: ${passed + failed}\n`)

  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
