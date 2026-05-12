#!/usr/bin/env node
/**
 * Create Stripe Products & Prices for LeadFlow AI
 * ================================================
 * Run this script once with a real Stripe key to create the products/prices,
 * then set the resulting price IDs as Vercel env vars.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/utilities/create-stripe-products.js
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/utilities/create-stripe-products.js --live
 *
 * After running, set in Vercel (use printf to avoid trailing newline):
 *   printf '%s' 'price_...' | vercel env add STRIPE_PRICE_STARTER_MONTHLY production
 *   printf '%s' 'price_...' | vercel env add STRIPE_PRICE_PRO_MONTHLY production
 *   printf '%s' 'price_...' | vercel env add STRIPE_PRICE_TEAM_MONTHLY production
 *   printf '%s' 'price_...' | vercel env add STRIPE_PRICE_STARTER_ANNUAL production
 *   printf '%s' 'price_...' | vercel env add STRIPE_PRICE_PRO_ANNUAL production
 *   printf '%s' 'price_...' | vercel env add STRIPE_PRICE_TEAM_ANNUAL production
 *
 * Env vars required for create-checkout/route.ts to work:
 *   STRIPE_SECRET_KEY             - Stripe secret key (sk_live_... or sk_test_...)
 *   STRIPE_PRICE_STARTER_MONTHLY  - price_... from this script
 *   STRIPE_PRICE_PRO_MONTHLY
 *   STRIPE_PRICE_TEAM_MONTHLY
 *   STRIPE_PRICE_STARTER_ANNUAL   - (optional, required for annual billing)
 *   STRIPE_PRICE_PRO_ANNUAL
 *   STRIPE_PRICE_TEAM_ANNUAL
 */

'use strict'

const path = require('path')
const fs   = require('fs')

// Load .env.local if STRIPE_SECRET_KEY is not already in environment
if (!process.env.STRIPE_SECRET_KEY) {
  const envFile = path.join(__dirname, '../../.env.local')
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf8').split('\n')
    for (const line of lines) {
      if (!line.trim() || line.startsWith('#')) continue
      const [key, ...rest] = line.split('=')
      if (key && rest.length && !process.env[key.trim()]) {
        process.env[key.trim()] = rest.join('=').trim()
      }
    }
  }
}

const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey || stripeKey.includes('your_') || stripeKey.includes('_here')) {
  console.error('❌ STRIPE_SECRET_KEY is not set or is a placeholder.')
  console.error('   Set it: STRIPE_SECRET_KEY=sk_test_... node scripts/utilities/create-stripe-products.js')
  process.exit(1)
}

const isLiveMode = stripeKey.startsWith('sk_live_')
const isTestMode = stripeKey.startsWith('sk_test_')
const cliLive    = process.argv.includes('--live')

if (isLiveMode && !cliLive) {
  console.error('❌ You are using a LIVE key but did not pass --live flag.')
  console.error('   This prevents accidental live-mode charges.')
  console.error('   If you intend to create LIVE products, run:')
  console.error('   STRIPE_SECRET_KEY=sk_live_... node scripts/utilities/create-stripe-products.js --live')
  process.exit(1)
}

if (!isLiveMode && !isTestMode) {
  console.error('❌ STRIPE_SECRET_KEY does not look like a valid Stripe key (must start with sk_test_ or sk_live_).')
  process.exit(1)
}

const Stripe = require('stripe')
const stripe = new Stripe(stripeKey)

const MODE = isLiveMode ? 'LIVE' : 'TEST'

// Canonical plan names — MUST match PRICE_ID_ENV_MAP in create-checkout/route.ts
// Product names in Stripe: 'Starter', 'Pro', 'Team' (short form, not 'LeadFlow AI - Starter')
const PLANS = [
  {
    envMonthly:  'STRIPE_PRICE_STARTER_MONTHLY',
    envAnnual:   'STRIPE_PRICE_STARTER_ANNUAL',
    productName: 'Starter',
    description: 'Up to 100 SMS/month. Basic AI responses. For individual agents.',
    monthlyAmt:  4900,   // $49.00/mo
    annualAmt:   49000,  // $490.00/yr
  },
  {
    envMonthly:  'STRIPE_PRICE_PRO_MONTHLY',
    envAnnual:   'STRIPE_PRICE_PRO_ANNUAL',
    productName: 'Pro',
    description: 'Unlimited SMS. Full AI (Claude). Cal.com booking. For working agents.',
    monthlyAmt:  14900,  // $149.00/mo
    annualAmt:   149000, // $1,490.00/yr
  },
  {
    envMonthly:  'STRIPE_PRICE_TEAM_MONTHLY',
    envAnnual:   'STRIPE_PRICE_TEAM_ANNUAL',
    productName: 'Team',
    description: 'Up to 5 agents. Team dashboard. Lead routing & distribution.',
    monthlyAmt:  39900,  // $399.00/mo
    annualAmt:   399000, // $3,990.00/yr
  },
]

async function findOrCreateProduct(name, description) {
  const existing = await stripe.products.search({
    query: `name:'${name}' AND active:'true'`,
  }).catch(() => ({ data: [] }))
  if (existing.data.length > 0) {
    console.log(`  ✓ Product exists: ${existing.data[0].id} (${name})`)
    return existing.data[0]
  }
  const product = await stripe.products.create({ name, description })
  console.log(`  ✓ Product created: ${product.id} (${name})`)
  return product
}

async function findOrCreatePrice(productId, amount, interval, nickname) {
  const prices = await stripe.prices.list({ product: productId, active: true, currency: 'usd' })
  const match = prices.data.find(p =>
    p.unit_amount === amount &&
    p.recurring?.interval === interval &&
    p.recurring?.interval_count === 1
  )
  if (match) {
    console.log(`  ✓ Price exists: ${match.id} ($${(amount / 100).toFixed(2)}/${interval})`)
    return match
  }
  const price = await stripe.prices.create({
    product: productId, unit_amount: amount, currency: 'usd',
    recurring: { interval }, nickname,
  })
  console.log(`  ✓ Price created: ${price.id} ($${(amount / 100).toFixed(2)}/${interval})`)
  return price
}

async function run() {
  console.log(`\n================================================`)
  console.log(`  LeadFlow AI — Stripe Product Setup`)
  console.log(`  Mode: ${MODE}`)
  console.log(`================================================\n`)

  const results = {}

  for (const plan of PLANS) {
    console.log(`\nProcessing: ${plan.productName}`)
    const product = await findOrCreateProduct(plan.productName, plan.description)
    const monthly = await findOrCreatePrice(product.id, plan.monthlyAmt, 'month', `${plan.productName} Monthly`)
    const annual  = await findOrCreatePrice(product.id, plan.annualAmt,  'year',  `${plan.productName} Annual`)
    results[plan.envMonthly] = monthly.id
    results[plan.envAnnual]  = annual.id
  }

  // Output results
  console.log('\n================================================')
  console.log('  Price IDs created successfully!')
  console.log('================================================\n')

  console.log('Set these in Vercel production (use printf to avoid trailing newline):')
  console.log('----------------------------------------------------------------------')
  for (const [envVar, priceId] of Object.entries(results)) {
    console.log(`  printf '%s' '${priceId}' | vercel env add ${envVar} production`)
  }

  console.log('\n⚠️  Also ensure these are set in Vercel:')
  console.log('  STRIPE_SECRET_KEY     (the same key you used to run this script)')
  console.log('  STRIPE_WEBHOOK_SECRET (from Stripe Dashboard → Webhooks)')
  console.log('\nAfter setting env vars, redeploy:')
  console.log('  cd product/lead-response/dashboard && vercel --prod')

  // Also write to a temp file for easy reference
  const outPath = path.join(__dirname, '../../config/stripe-price-ids.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify({ mode: MODE, generatedAt: new Date().toISOString(), priceIds: results }, null, 2))
  console.log(`\nOutput saved to: ${outPath}`)
  console.log('(Do NOT commit this file if using live keys — add it to .gitignore)')
}

run().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
