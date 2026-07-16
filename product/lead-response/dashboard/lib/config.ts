/**
 * Dashboard config — env resolution for the Next.js dashboard.
 *
 * Rules:
 *   - All env var reads belong here, NOT scattered in routes/services.
 *   - Critical vars throw at import time in production (fail-fast).
 *   - This file is dashboard-only (Next.js / Vercel). The Node.js API
 *     backend uses lib/config/index.js at the repo root.
 */

// ---------------------------------------------------------------------------
// Fail-fast validation in production
// ---------------------------------------------------------------------------
const CRITICAL = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY']

if (process.env.NODE_ENV === 'production') {
  const missing = CRITICAL.filter((k) => !process.env[k])
  if (missing.length) {
    throw new Error(`[dashboard/config] Missing critical env vars: ${missing.join(', ')}`)
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export const app = {
  url: (process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app').trim(),
  nodeEnv: process.env.NODE_ENV || 'development',
  cronSecret: process.env.CRON_SECRET || null,
  resendApiKey: process.env.RESEND_API_KEY || null,
}

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------
export const stripe = {
  secretKey: process.env.STRIPE_SECRET_KEY || null,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
  portalReturnUrl: (process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app').trim(),
  prices: {
    starter:      process.env.STRIPE_PRICE_STARTER_MONTHLY      || null,
    pro:          process.env.STRIPE_PRICE_PRO_MONTHLY          || null,
    team:         process.env.STRIPE_PRICE_TEAM_MONTHLY         || null,
  },
}

// ---------------------------------------------------------------------------
// Twilio
// ---------------------------------------------------------------------------
export const twilio = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || null,
  authToken: process.env.TWILIO_AUTH_TOKEN || null,
  phoneNumberUs: (process.env.TWILIO_PHONE_NUMBER_US || '').trim(),
}

// ---------------------------------------------------------------------------
// Follow Up Boss (FUB)
// ---------------------------------------------------------------------------
export const fub = {
  apiKey: (process.env.FUB_API_KEY || '').trim(),
  webhookSecret: process.env.FUB_WEBHOOK_SECRET || null,
  systemKey: (process.env.FUB_SYSTEM_KEY || '').trim(),
  systemName: (process.env.FUB_SYSTEM_NAME || 'LeadFlow-Properties').trim(),
}

// ---------------------------------------------------------------------------
// Cal.com
// ---------------------------------------------------------------------------
export const calcom = {
  apiKey: process.env.CAL_API_KEY || null,
  username: process.env.CAL_USERNAME || null,
  webhookSecret: process.env.CAL_WEBHOOK_SECRET || null,
}
