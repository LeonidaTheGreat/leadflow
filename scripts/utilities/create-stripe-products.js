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
 * After running, set these in Vercel:
 *   vercel env add STRIPE_PRICE_STARTER_MONTHLY production
 *   vercel env add STRIPE_PRICE_PROFESSIONAL_MONTHLY production
 *   vercel env add STRIPE_PRICE_ENTERPRISE_MONTHLY production
 *
 * Env vars required for create-checkout/route.ts to work:
 *   STRIPE_SECRET_KEY              - Stripe secret key (sk_live_... or sk_test_...)
 *   STRIPE_PRICE_STARTER_MONTHLY   - price_... from this script
 *   STRIPE_PRICE_PROFESSIONAL_MONTHLY
 *   STRIPE_PRICE_ENTERPRISE_MONTHLY
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

// Plans to create — must match PRICING_TIERS in create-checkout/route.ts
const PLANS = [
  {
    envVar:      'STRIPE_PRICE_STARTER_MONTHLY',
    productName: 'LeadFlow AI - Starter',
    description: 'Up to 100 SMS/month. Basic AI responses. For individual agents.',
    amount:      4900,   // $49.00
    nickname:    'Starter Monthly',
    metadata:    { tier: 'starter', interval: 'monthly' },
  },
  {
    envVar:      'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    productName: 'LeadFlow AI - Professional',
    description: 'Unlimited SMS. Full AI with SMS & email. For power users.',
    amount:      14900,  // $149.00
    nickname:    'Professional Monthly',
    metadata:    { tier: 'professional', interval: 'monthly' },
  },
  {
    envVar:      'STRIPE_PRICE_ENTERPRISE_MONTHLY',
    productName: 'LeadFlow AI - Enterprise',
    description: 'Up to 5 agents. Team dashboard. Lead routing & distribution.',
    amount:      39900,  // $399.00
    nickname:    'Enterprise Monthly',
    metadata:    { tier: 'enterprise', interval: 'monthly' },
  },
]

async function run() {
  console.log(`\n================================================`)
  console.log(`  LeadFlow AI — Stripe Product Setup`)
  console.log(`  Mode: ${MODE}`)
  console.log(`================================================\n`)

  const results = {}

  for (const plan of PLANS) {
    console.log(`\nProcessing: ${plan.productName}`)

    // Check if product already exists
    const existing = await stripe.products.search({
      query: `name:'${plan.productName}' AND active:'true'`,
    }).catch(() => ({ data: [] }))

    let product
    if (existing.data.length > 0) {
      product = existing.data[0]
      console.log(`  ✓ Product exists: ${product.id}`)
    } else {
      product = await stripe.products.create({
        name:        plan.productName,
        description: plan.description,
        metadata:    plan.metadata,
      })
      console.log(`  ✓ Product created: ${product.id}`)
    }

    // Check if active price already exists for this product at this amount
    const prices = await stripe.prices.list({
      product:  product.id,
      active:   true,
      currency: 'usd',
    })
    const matchingPrice = prices.data.find(
      p => p.unit_amount === plan.amount &&
           p.recurring?.interval === 'month' &&
           p.recurring?.interval_count === 1
    )

    let price
    if (matchingPrice) {
      price = matchingPrice
      console.log(`  ✓ Price exists: ${price.id} ($${(price.unit_amount / 100).toFixed(2)}/mo)`)
    } else {
      price = await stripe.prices.create({
        product:    product.id,
        unit_amount: plan.amount,
        currency:   'usd',
        recurring:  { interval: 'month' },
        nickname:   plan.nickname,
        metadata:   plan.metadata,
      })
      console.log(`  ✓ Price created: ${price.id} ($${(price.unit_amount / 100).toFixed(2)}/mo)`)
    }

    results[plan.envVar] = price.id
  }

  // Output results
  console.log('\n================================================')
  console.log('  Price IDs created successfully!')
  console.log('================================================\n')

  console.log('Set these in Vercel production:')
  console.log('--------------------------------')
  for (const [envVar, priceId] of Object.entries(results)) {
    console.log(`  ${envVar}=${priceId}`)
  }

  console.log('\nRun these Vercel CLI commands:')
  console.log('--------------------------------')
  for (const [envVar, priceId] of Object.entries(results)) {
    console.log(`  echo "${priceId}" | vercel env add ${envVar} production`)
  }

  console.log('\n⚠️  Also ensure these are set in Vercel:')
  console.log('  STRIPE_SECRET_KEY     (the same key you used to run this script)')
  console.log('  STRIPE_WEBHOOK_SECRET (from Stripe Dashboard → Webhooks)')
  console.log('\nAfter setting env vars, redeploy:')
  console.log('  vercel --prod')

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
