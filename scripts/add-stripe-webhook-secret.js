#!/usr/bin/env node

/**
 * Add Stripe Webhook Secret to Vercel Production
 * 
 * Interactive script to safely add STRIPE_WEBHOOK_SECRET to Vercel
 * 
 * Usage:
 *   node scripts/add-stripe-webhook-secret.js
 * 
 * Then:
 *   1. Paste the webhook secret from Stripe Dashboard (whsec_...)
 *   2. Script verifies format and adds to Vercel
 *   3. Redeploy with: vercel --prod
 */

const { exec } = require('child_process')
const readline = require('readline')
const path = require('path')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

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

async function main() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan')
  log('║  Add Stripe Webhook Secret to Vercel Production                ║', 'cyan')
  log('║  LeadFlow AI — Billing Webhook Integration                     ║', 'cyan')
  log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan')

  // Step 1: Get secret from user
  log('Step 1: Get webhook secret from Stripe Dashboard', 'bright')
  log('─────────────────────────────────────────────────\n')
  log('1. Go to: https://dashboard.stripe.com/webhooks')
  log('2. Find the endpoint: https://leadflow-ai-five.vercel.app/api/webhooks/stripe')
  log('3. Click on it to view details')
  log('4. Under "Signing secret", click "Reveal"')
  log('5. Copy the secret (starts with whsec_)\n')

  return new Promise((resolve) => {
    rl.question('Paste the webhook secret here: ', async (secret) => {
      rl.close()

      // Validate secret format
      if (!secret || typeof secret !== 'string') {
        log('\n❌ Error: No secret provided', 'red')
        process.exit(1)
      }

      secret = secret.trim()

      if (!secret.startsWith('whsec_')) {
        log(`\n❌ Error: Invalid format. Webhook secrets start with "whsec_"`, 'red')
        log(`   You provided: ${secret.substring(0, 20)}...\n`, 'red')
        process.exit(1)
      }

      if (secret.length < 20) {
        log(`\n❌ Error: Secret too short (${secret.length} chars, expected 40+)`, 'red')
        process.exit(1)
      }

      log(`\n✅ Secret format valid: ${secret.substring(0, 20)}...${secret.substring(secret.length - 10)}\n`)

      // Step 2: Verify Vercel auth
      log('Step 2: Verify Vercel authentication', 'bright')
      log('─────────────────────────────────────────\n')

      try {
        const { stdout } = await execPromise('vercel --version')
        log(`✅ Vercel CLI available: ${stdout.trim()}\n`)
      } catch (e) {
        log('❌ Vercel CLI not found. Install with: npm install -g vercel', 'red')
        process.exit(1)
      }

      // Verify authenticated
      try {
        await execPromise('vercel whoami')
        log('✅ Vercel authentication valid\n')
      } catch (e) {
        log('❌ Not logged into Vercel. Run: vercel login', 'red')
        process.exit(1)
      }

      // Step 3: Add to Vercel
      log('Step 3: Add secret to Vercel production environment', 'bright')
      log('────────────────────────────────────────────────────\n')

      const dashboardCwd = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard')

      try {
        log('Adding STRIPE_WEBHOOK_SECRET to Vercel...')
        const command = `cd "${dashboardCwd}" && vercel env add STRIPE_WEBHOOK_SECRET production`
        const result = await new Promise((res, rej) => {
          const child = exec(command, (error, stdout, stderr) => {
            if (error) rej({ error, stdout, stderr })
            else res({ stdout, stderr })
          })

          // Send the secret to stdin
          setTimeout(() => {
            child.stdin.write(secret)
            child.stdin.write('\n')
            child.stdin.end()
          }, 500)
        })

        log('✅ Environment variable added to Vercel\n')
        log(`   Name: STRIPE_WEBHOOK_SECRET`)
        log(`   Value: ${secret.substring(0, 20)}...${secret.substring(secret.length - 10)}`)
        log(`   Environment: Production\n`)
      } catch (e) {
        log('❌ Failed to add to Vercel', 'red')
        log(`Error: ${e.error?.message || e.stderr || 'Unknown error'}`, 'red')
        process.exit(1)
      }

      // Step 4: Redeploy
      log('Step 4: Redeploy to production', 'bright')
      log('──────────────────────────────\n')
      log('Environment variables only take effect on new deployments.')
      log(`Run this command to redeploy:\n`)
      log(`  cd "${dashboardCwd}"`, 'yellow')
      log(`  vercel --prod\n`, 'yellow')

      log('Step 5: Verify the fix', 'bright')
      log('────────────────────────\n')
      log('After redeployment completes, run:')
      log(`  node tests/fix-stripe-webhook-secret-not-set-in-vercel-production.e2e.test.js\n`, 'yellow')

      // Summary
      log('╔════════════════════════════════════════════════════════════════╗', 'green')
      log('║  ✅ SECRET ADDED — NEXT STEPS                                  ║', 'green')
      log('╚════════════════════════════════════════════════════════════════╝\n', 'green')

      log('1. Redeploy to production:', 'bright')
      log(`   cd ${dashboardCwd}`)
      log(`   vercel --prod\n`)

      log('2. Verify with E2E test:', 'bright')
      log(`   node tests/fix-stripe-webhook-secret-not-set-in-vercel-production.e2e.test.js\n`)

      log('3. Monitor webhook deliveries:', 'bright')
      log(`   https://dashboard.stripe.com/webhooks\n`)

      log('For details, see: STRIPE-WEBHOOK-SECRET-SETUP-GUIDE.md\n')

      resolve()
    })
  })
}

main().catch((e) => {
  log(`\n❌ Fatal error: ${e.message || e}`, 'red')
  process.exit(1)
})
