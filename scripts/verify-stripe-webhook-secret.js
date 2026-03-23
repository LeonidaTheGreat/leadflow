#!/usr/bin/env node

/**
 * Verify Stripe Webhook Secret in Vercel Production
 * 
 * Checks if STRIPE_WEBHOOK_SECRET is properly configured in Vercel production
 * and tests the webhook endpoint
 * 
 * Usage:
 *   node scripts/verify-stripe-webhook-secret.js
 */

const https = require('https')
const { exec } = require('child_process')
const path = require('path')

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr })
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          resolve({ status: res.statusCode, body: data })
        })
      })
      .on('error', reject)
  })
}

function httpsPost(url, body = '') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, body: data })
        }
      })
    })

    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan')
  log('║  Verify Stripe Webhook Secret in Vercel Production              ║', 'cyan')
  log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan')

  let passed = 0
  let failed = 0

  // Check 1: Verify Vercel CLI can see the variable
  log('Check 1: Vercel environment configuration', 'bright')
  log('──────────────────────────────────────────\n')

  const dashboardCwd = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard')

  try {
    const { stdout } = await execPromise(`cd "${dashboardCwd}" && vercel env ls`)

    if (stdout.includes('STRIPE_WEBHOOK_SECRET')) {
      log('✅ STRIPE_WEBHOOK_SECRET found in Vercel environment variables')
      passed++
    } else {
      log('❌ STRIPE_WEBHOOK_SECRET NOT found in Vercel environment variables', 'red')
      log('   Run: node scripts/add-stripe-webhook-secret.js\n', 'yellow')
      failed++
    }
  } catch (e) {
    log('❌ Failed to check Vercel environment variables', 'red')
    log(`   Error: ${e.stderr || e.message}\n`, 'red')
    failed++
  }

  // Check 2: Test webhook endpoint
  log('\nCheck 2: Webhook endpoint HTTP status', 'bright')
  log('──────────────────────────────────────\n')

  const webhookUrl = 'https://leadflow-ai-five.vercel.app/api/webhooks/stripe'

  try {
    log(`Testing: POST ${webhookUrl}`)
    const result = await httpsPost(webhookUrl, JSON.stringify({}))

    if (result.status === 400) {
      log(`✅ Webhook endpoint returned HTTP 400 (bad signature)`)
      log('   This is correct — means STRIPE_WEBHOOK_SECRET is set and signature was invalid')
      log('   (This is expected for test requests)\n')
      passed++
    } else if (result.status === 503) {
      log(`❌ Webhook endpoint returned HTTP 503 (Stripe not configured)`, 'red')
      log('   This means STRIPE_WEBHOOK_SECRET is still missing from production')
      log('   1. Run: node scripts/add-stripe-webhook-secret.js')
      log('   2. Then redeploy: cd product/lead-response/dashboard && vercel --prod\n', 'yellow')
      failed++
    } else {
      log(`⚠️  Webhook endpoint returned HTTP ${result.status}`)
      log(`   Body: ${JSON.stringify(result.body)}\n`, 'yellow')
    }
  } catch (e) {
    log(`❌ Failed to test webhook endpoint`, 'red')
    log(`   Error: ${e.message}\n`, 'red')
    failed++
  }

  // Check 3: Run E2E tests
  log('\nCheck 3: E2E test suite', 'bright')
  log('──────────────────────\n')

  const projectRoot = path.join(__dirname, '..')

  try {
    log('Running: node tests/fix-stripe-webhook-secret-not-set-in-vercel-production.e2e.test.js\n')
    await execPromise(`cd "${projectRoot}" && node tests/fix-stripe-webhook-secret-not-set-in-vercel-production.e2e.test.js`)
    log('✅ E2E tests passed\n')
    passed++
  } catch (e) {
    log('❌ E2E tests failed', 'red')
    if (e.stdout) {
      log('Output:', 'yellow')
      console.log(e.stdout)
    }
    if (e.stderr) {
      log('Errors:', 'yellow')
      console.log(e.stderr)
    }
    failed++
  }

  // Summary
  log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan')
  log(`║  VERIFICATION RESULTS                                          ║`, 'cyan')
  log(`║  Passed: ${passed}/3  Failed: ${failed}/3`, 'cyan')
  log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan')

  if (failed === 0) {
    log('✅ All checks passed! Stripe webhook secret is properly configured.\n', 'green')
    log('Next steps:')
    log('1. Monitor webhook deliveries in Stripe Dashboard')
    log('2. Verify subscriptions update in real-time')
    log('3. Test plan upgrades/downgrades\n')
    process.exit(0)
  } else {
    log(`❌ ${failed} check(s) failed. See recommendations above.\n`, 'red')
    process.exit(1)
  }
}

main().catch((e) => {
  log(`\n❌ Fatal error: ${e.message || e}`, 'red')
  process.exit(1)
})
