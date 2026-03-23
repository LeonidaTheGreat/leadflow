#!/usr/bin/env node

/**
 * Setup Stripe Webhook Secret in Vercel Production
 * 
 * This script automates the process of adding STRIPE_WEBHOOK_SECRET to Vercel
 * production environment. It handles both interactive and non-interactive modes.
 * 
 * Non-interactive mode (CI/CD):
 *   echo "whsec_..." | node scripts/setup-stripe-webhook-production.js leadflow-ai
 * 
 * Interactive mode:
 *   node scripts/setup-stripe-webhook-production.js leadflow-ai
 */

const { exec } = require('child_process')
const readline = require('readline')
const path = require('path')
const fs = require('fs')

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

function execPromise(command, stdin = null) {
  return new Promise((resolve, reject) => {
    const child = exec(command, (error, stdout, stderr) => {
      if (error && !stderr.includes('Skip confirmation')) {
        reject({ error, stdout, stderr })
      } else {
        resolve({ stdout, stderr })
      }
    })

    if (stdin) {
      child.stdin.write(stdin)
      child.stdin.end()
    }
  })
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('readable', () => {
      let chunk
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk
      }
    })
    process.stdin.on('end', () => {
      resolve(data.trim())
    })
  })
}

async function promptUser(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function verifySecret(secret) {
  if (!secret || typeof secret !== 'string') {
    return { valid: false, reason: 'No secret provided' }
  }

  secret = secret.trim()

  if (!secret.startsWith('whsec_')) {
    return { valid: false, reason: 'Webhook secrets must start with "whsec_"' }
  }

  if (secret.length < 40) {
    return { valid: false, reason: `Secret too short (${secret.length} chars, expected 40+)` }
  }

  return { valid: true, secret }
}

async function setupStripeSecret(project, webhookSecret, stripeSecret = null) {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan')
  log('║  Setup Stripe Webhook Secret in Vercel Production               ║', 'cyan')
  log(`║  Project: ${project.padEnd(54)} ║`, 'cyan')
  log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan')

  // Verify secret format
  log('Step 1: Validate webhook secret format', 'bright')
  log('───────────────────────────────────────\n')

  const validation = await verifySecret(webhookSecret)
  if (!validation.valid) {
    log(`❌ Invalid secret: ${validation.reason}`, 'red')
    log(`   You provided: ${webhookSecret.substring(0, 20)}...\n`, 'red')
    process.exit(1)
  }

  log(`✅ Secret format valid: ${webhookSecret.substring(0, 20)}...${webhookSecret.substring(webhookSecret.length - 10)}\n`)

  // Verify Vercel auth
  log('Step 2: Verify Vercel authentication', 'bright')
  log('────────────────────────────────────\n')

  try {
    const { stdout } = await execPromise('vercel --version')
    log(`✅ Vercel CLI available: ${stdout.trim()}\n`)
  } catch (e) {
    log('❌ Vercel CLI not found. Install with: npm install -g vercel', 'red')
    process.exit(1)
  }

  try {
    await execPromise('vercel whoami')
    log('✅ Vercel authentication valid\n')
  } catch (e) {
    log('❌ Not logged into Vercel. Run: vercel login', 'red')
    process.exit(1)
  }

  // Determine target directory based on project
  log('Step 3: Configure project target', 'bright')
  log('───────────────────────────────\n')

  let projectDir
  if (project === 'leadflow-ai') {
    projectDir = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard')
  } else if (project === 'fub-inbound-webhook') {
    projectDir = path.join(__dirname, '..')
  } else {
    log(`⚠️  Unknown project: ${project}`, 'yellow')
    log(`   Using current directory: ${process.cwd()}\n`)
    projectDir = process.cwd()
  }

  log(`Target directory: ${projectDir}`)
  if (!fs.existsSync(projectDir)) {
    log(`❌ Directory not found: ${projectDir}`, 'red')
    process.exit(1)
  }
  log(`✅ Directory exists\n`)

  // Add STRIPE_WEBHOOK_SECRET
  log('Step 4: Add STRIPE_WEBHOOK_SECRET to Vercel production', 'bright')
  log('───────────────────────────────────────────────────────\n')

  try {
    log('Adding STRIPE_WEBHOOK_SECRET...')
    const command = `cd "${projectDir}" && vercel env add STRIPE_WEBHOOK_SECRET production --yes --sensitive`
    await execPromise(command, webhookSecret + '\n')
    log('✅ STRIPE_WEBHOOK_SECRET added to Vercel production\n')
  } catch (e) {
    log('❌ Failed to add STRIPE_WEBHOOK_SECRET to Vercel', 'red')
    log(`   Error: ${e.stderr || e.error?.message || 'Unknown error'}\n`, 'red')
    // Don't exit - continue to next step
  }

  // Add STRIPE_SECRET_KEY if provided
  if (stripeSecret) {
    log('Step 5: Add STRIPE_SECRET_KEY to Vercel production', 'bright')
    log('───────────────────────────────────────────────────\n')

    try {
      log('Adding STRIPE_SECRET_KEY...')
      const command = `cd "${projectDir}" && vercel env add STRIPE_SECRET_KEY production --yes --sensitive`
      await execPromise(command, stripeSecret + '\n')
      log('✅ STRIPE_SECRET_KEY added to Vercel production\n')
    } catch (e) {
      log('⚠️  Failed to add STRIPE_SECRET_KEY (optional)', 'yellow')
      log(`   Error: ${e.stderr || e.error?.message || 'Unknown error'}\n`, 'yellow')
    }
  }

  // Verify variables are set
  log('Step 6: Verify environment variables in Vercel', 'bright')
  log('──────────────────────────────────────────────\n')

  try {
    const { stdout } = await execPromise(`cd "${projectDir}" && vercel env ls`)
    if (stdout.includes('STRIPE_WEBHOOK_SECRET')) {
      log('✅ STRIPE_WEBHOOK_SECRET verified in Vercel\n')
    } else {
      log('⚠️  STRIPE_WEBHOOK_SECRET not found in Vercel env list\n', 'yellow')
    }
    if (stripeSecret && stdout.includes('STRIPE_SECRET_KEY')) {
      log('✅ STRIPE_SECRET_KEY verified in Vercel\n')
    }
  } catch (e) {
    log('⚠️  Could not verify environment variables', 'yellow')
    log(`   Error: ${e.stderr || e.error?.message || 'Unknown error'}\n`, 'yellow')
  }

  // Summary and next steps
  log('\n╔════════════════════════════════════════════════════════════════╗', 'green')
  log('║  ✅ SETUP COMPLETE — NEXT STEPS                                 ║', 'green')
  log('╚════════════════════════════════════════════════════════════════╝\n', 'green')

  log('1. Deploy to production:', 'bright')
  log(`   cd ${projectDir}`)
  log(`   vercel --prod\n`)

  log('2. Verify the webhook is working:', 'bright')
  log(`   node scripts/verify-stripe-webhook-secret.js\n`)

  log('3. Monitor webhook deliveries:', 'bright')
  log(`   https://dashboard.stripe.com/webhooks\n`)

  log('Documentation:', 'bright')
  log('  - Stripe Webhook Setup: docs/STRIPE_WEBHOOK_SETUP.md\n')
}

async function main() {
  const args = process.argv.slice(2)
  const project = args[0] || 'leadflow-ai'

  let webhookSecret = null
  let stripeSecret = null

  // Check for input from stdin (non-interactive mode)
  if (!process.stdin.isTTY) {
    log('📥 Reading credentials from stdin...\n', 'cyan')
    const input = await readStdin()
    const [secret1, secret2] = input.split('\n').filter(s => s.trim())
    webhookSecret = secret1
    stripeSecret = secret2 || null
  }

  // Prompt if not provided
  if (!webhookSecret) {
    log('📌 Where to get your webhook secret:\n', 'bright')
    log('1. Go to: https://dashboard.stripe.com/webhooks')
    log('2. Find the endpoint: https://leadflow-ai-five.vercel.app/api/webhooks/stripe')
    log('3. Click on it, find "Signing secret", click "Reveal"')
    log('4. Copy the secret (starts with whsec_)\n')

    webhookSecret = await promptUser('Paste the webhook secret: ')
  }

  if (!stripeSecret) {
    stripeSecret = await promptUser('Paste the STRIPE_SECRET_KEY (or leave blank): ')
  }

  await setupStripeSecret(project, webhookSecret, stripeSecret || null)
}

main().catch((e) => {
  log(`\n❌ Fatal error: ${e.message || e}`, 'red')
  process.exit(1)
})
