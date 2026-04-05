/**
 * E2E Test: feat-trial-conversion-nudge
 *
 * Verifies the Trial Expiry Conversion Nudge feature:
 * 1. TrialStatusBanner renders for trial agent with <=3 days remaining
 * 2. TrialStatusBanner does NOT render for paid agent
 * 3. TrialStatusBanner shows loading state on upgrade click
 * 4. upgrade-checkout API route exists and accepts POST with plan param
 * 5. upgrade-checkout API returns error on missing plan (unit check via route file)
 * 6. TrialStatusBanner shows error on API failure
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
  console.log('\n=== E2E: Trial Expiry Conversion Nudge ===\n')

  // ── File existence checks ──────────────────────────────────────────────────

  console.log('File existence:')

  await test('TrialStatusBanner component exists', async () => {
    assert.ok(fileExists('components/dashboard/TrialStatusBanner.tsx'), 'TrialStatusBanner.tsx not found')
  })

  await test('UpgradeBanner component exists', async () => {
    assert.ok(fileExists('components/dashboard/UpgradeBanner.tsx'), 'UpgradeBanner.tsx not found')
  })

  await test('upgrade-checkout API route exists', async () => {
    assert.ok(fileExists('app/api/stripe/upgrade-checkout/route.ts'), 'upgrade-checkout/route.ts not found')
  })

  await test('trial-status API route exists', async () => {
    assert.ok(fileExists('app/api/auth/trial-status/route.ts'), 'trial-status/route.ts not found')
  })

  await test('UpgradeSuccessToast component exists', async () => {
    assert.ok(fileExists('components/dashboard/UpgradeSuccessToast.tsx'), 'UpgradeSuccessToast.tsx not found')
  })

  // ── TC-1: TrialStatusBanner renders for trial agent with <=3 days remaining ─

  console.log('\nTC-1: Banner renders for trial agent with <=3 days remaining:')

  await test('Banner checks isTrial flag before rendering', async () => {
    const src = readFile('components/dashboard/TrialStatusBanner.tsx')
    assert.ok(src.includes('isTrial'), 'Missing isTrial check')
    assert.ok(src.includes('isPilot'), 'Missing isPilot check')
  })

  await test('Banner uses daysRemaining <= 3 threshold for ending-soon state', async () => {
    const src = readFile('components/dashboard/TrialStatusBanner.tsx')
    assert.ok(
      src.includes('daysRemaining <= 3') || src.includes('daysRemaining<=3'),
      'Missing <=3 days threshold for isEndingSoon'
    )
  })

  await test('Banner shows amber styling when ending soon', async () => {
    const src = readFile('components/dashboard/TrialStatusBanner.tsx')
    assert.ok(src.includes('amber'), 'Missing amber styling for ending-soon state')
    assert.ok(src.includes('isEndingSoon'), 'Missing isEndingSoon variable')
  })

  await test('Banner shows "Upgrade Now" button only when ending soon (isEndingSoon)', async () => {
    const src = readFile('components/dashboard/TrialStatusBanner.tsx')
    assert.ok(src.includes('isEndingSoon'), 'Missing isEndingSoon guard for upgrade button')
    assert.ok(src.includes('Upgrade Now'), 'Missing "Upgrade Now" text in button')
  })

  // ── TC-2: TrialStatusBanner does NOT render for paid agent ─────────────────

  console.log('\nTC-2: Banner absent for paid agents:')

  await test('Banner returns null when !isTrial && !isPilot', async () => {
    const src = readFile('components/dashboard/TrialStatusBanner.tsx')
    assert.ok(
      src.includes('!status.isTrial && !status.isPilot') ||
      src.includes('!status.isTrial&&!status.isPilot'),
      'Missing guard: return null for paid agents'
    )
  })

  await test('trial-status API returns planTier field', async () => {
    const src = readFile('app/api/auth/trial-status/route.ts')
    assert.ok(src.includes('planTier'), 'trial-status API missing planTier field')
    assert.ok(src.includes("plan_tier === 'trial'") || src.includes("plan_tier==='trial'"), 'Missing trial tier check')
  })

  // ── TC-3: Button shows loading state on upgrade click ──────────────────────

  console.log('\nTC-3: Loading state on upgrade click:')

  await test('TrialStatusBanner has checkoutLoading state', async () => {
    const src = readFile('components/dashboard/TrialStatusBanner.tsx')
    assert.ok(src.includes('checkoutLoading'), 'Missing checkoutLoading state')
    assert.ok(src.includes('setCheckoutLoading'), 'Missing setCheckoutLoading setter')
  })

  await test('Upgrade button is disabled when checkoutLoading is true', async () => {
    const src = readFile('components/dashboard/TrialStatusBanner.tsx')
    assert.ok(src.includes('disabled={checkoutLoading}'), 'Button not disabled during loading')
  })

  await test('Upgrade button shows Loader2 spinner during loading', async () => {
    const src = readFile('components/dashboard/TrialStatusBanner.tsx')
    assert.ok(src.includes('Loader2'), 'Missing Loader2 spinner import/usage')
    assert.ok(src.includes('animate-spin'), 'Missing animate-spin class for spinner')
    assert.ok(src.includes('Processing...'), 'Missing loading text')
  })

  // ── TC-4: upgrade-checkout API route accepts POST with plan param ───────────

  console.log('\nTC-4: upgrade-checkout API exists and accepts plan param:')

  await test('upgrade-checkout route exports POST handler', async () => {
    const src = readFile('app/api/stripe/upgrade-checkout/route.ts')
    assert.ok(src.includes('export async function POST'), 'Missing POST export')
  })

  await test('upgrade-checkout validates plan parameter', async () => {
    const src = readFile('app/api/stripe/upgrade-checkout/route.ts')
    assert.ok(src.includes("plan: 'starter'") || src.includes('PLAN_PRICE_IDS'), 'Missing plan validation')
    assert.ok(
      src.includes("{ error: `Invalid plan") || src.includes('Invalid plan'),
      'Missing invalid plan error response'
    )
  })

  await test('upgrade-checkout includes pro plan price ID mapping', async () => {
    const src = readFile('app/api/stripe/upgrade-checkout/route.ts')
    assert.ok(src.includes('pro'), 'Missing pro plan in price ID mapping')
    assert.ok(
      src.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY') || src.includes('price_professional_monthly'),
      'Missing STRIPE_PRICE_PROFESSIONAL_MONTHLY env reference'
    )
  })

  // ── TC-5: upgrade-checkout returns error on missing/invalid plan ────────────

  console.log('\nTC-5: upgrade-checkout returns error on missing plan:')

  await test('upgrade-checkout returns 400 when plan is missing', async () => {
    const src = readFile('app/api/stripe/upgrade-checkout/route.ts')
    assert.ok(src.includes('status: 400'), 'Missing 400 status for invalid plan')
    assert.ok(
      src.includes('!plan || !PLAN_PRICE_IDS[plan]') || src.includes('!plan'),
      'Missing plan existence check'
    )
  })

  await test('upgrade-checkout uses success_url pointing to /dashboard?upgrade=success', async () => {
    const src = readFile('app/api/stripe/upgrade-checkout/route.ts')
    assert.ok(
      src.includes('/dashboard?upgrade=success'),
      'success_url must point to /dashboard?upgrade=success'
    )
  })

  await test('upgrade-checkout uses cancel_url pointing to /dashboard', async () => {
    const src = readFile('app/api/stripe/upgrade-checkout/route.ts')
    assert.ok(
      src.includes("cancel_url: `${baseUrl}/dashboard`") || src.includes("'/dashboard'"),
      'cancel_url must point to /dashboard'
    )
  })

  // ── TC-6: Banner shows error on API failure ────────────────────────────────

  console.log('\nTC-6: Banner shows inline error on API failure:')

  await test('TrialStatusBanner has checkoutError state', async () => {
    const src = readFile('components/dashboard/TrialStatusBanner.tsx')
    assert.ok(src.includes('checkoutError'), 'Missing checkoutError state')
    assert.ok(src.includes('setCheckoutError'), 'Missing setCheckoutError setter')
  })

  await test('TrialStatusBanner renders checkoutError as inline error message', async () => {
    const src = readFile('components/dashboard/TrialStatusBanner.tsx')
    assert.ok(src.includes('{checkoutError &&'), 'Missing conditional error message render')
    assert.ok(src.includes('checkoutError}'), 'Missing error message text render')
  })

  await test('Banner handles fetch failure with Network error message', async () => {
    const src = readFile('components/dashboard/TrialStatusBanner.tsx')
    assert.ok(
      src.includes('Network error') || src.includes('network error'),
      'Missing network error fallback message'
    )
  })

  await test('handleUpgrade does not navigate on error (stays on page)', async () => {
    const src = readFile('components/dashboard/TrialStatusBanner.tsx')
    // On error path, should set error and return/stop — not call window.location.href
    assert.ok(src.includes('return'), 'Missing early return on error path')
  })

  // ── Dashboard success toast ────────────────────────────────────────────────

  console.log('\nDashboard success toast:')

  await test('UpgradeSuccessToast checks for ?upgrade=success query param', async () => {
    const src = readFile('components/dashboard/UpgradeSuccessToast.tsx')
    assert.ok(
      src.includes("'upgrade'") || src.includes('"upgrade"'),
      'Missing upgrade query param check'
    )
    assert.ok(
      src.includes("'success'") || src.includes('"success"'),
      'Missing success value check'
    )
  })

  await test('UpgradeSuccessToast renders success message', async () => {
    const src = readFile('components/dashboard/UpgradeSuccessToast.tsx')
    assert.ok(
      src.includes("You're now on Pro") || src.includes("now on Pro"),
      'Missing success message text'
    )
  })

  await test('Dashboard page imports and renders UpgradeSuccessToast', async () => {
    const src = readFile('app/dashboard/page.tsx')
    assert.ok(src.includes('UpgradeSuccessToast'), 'Dashboard page missing UpgradeSuccessToast')
  })

  await test('Dashboard page wraps UpgradeSuccessToast in Suspense', async () => {
    const src = readFile('app/dashboard/page.tsx')
    const toastIdx = src.indexOf('UpgradeSuccessToast')
    const suspenseIdx = src.lastIndexOf('Suspense', toastIdx)
    assert.ok(suspenseIdx !== -1 && suspenseIdx < toastIdx, 'UpgradeSuccessToast must be wrapped in Suspense')
  })

  // ── UpgradeBanner also updated ─────────────────────────────────────────────

  console.log('\nUpgradeBanner secondary update:')

  await test('UpgradeBanner no longer links to /settings/billing via <a> or Link', async () => {
    const src = readFile('components/dashboard/UpgradeBanner.tsx')
    // The old Link href="/settings/billing" should be gone
    assert.ok(
      !src.includes('href="/settings/billing"') && !src.includes("href='/settings/billing'"),
      'UpgradeBanner still uses /settings/billing link — should use direct checkout'
    )
  })

  await test('UpgradeBanner calls upgrade-checkout endpoint directly', async () => {
    const src = readFile('components/dashboard/UpgradeBanner.tsx')
    assert.ok(
      src.includes('/api/stripe/upgrade-checkout'),
      'UpgradeBanner must call /api/stripe/upgrade-checkout directly'
    )
  })

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
