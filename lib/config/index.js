'use strict';

/**
 * LeadFlow config layer — env resolution and named constants.
 *
 * Rules (per ARCHITECTURE.md):
 *   - All env var reads belong here, NOT scattered in services/routes.
 *   - Critical vars throw at import time so startup fails fast rather than
 *     silently degrading at runtime.
 *   - Services adopt this incrementally; existing process.env reads still work.
 */

// ---------------------------------------------------------------------------
// Critical env vars — throw at startup if missing in production
//
// VERCEL NOTE: These must be set in Vercel Dashboard → Project Settings →
// Environment Variables before deploying to production.
//   - STRIPE_SECRET_KEY: from Stripe Dashboard → Developers → API Keys
//   - STRIPE_WEBHOOK_SECRET: from Stripe Dashboard → Webhooks → Signing secret
// ---------------------------------------------------------------------------
const CRITICAL = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];

if (process.env.NODE_ENV === 'production') {
  const missing = CRITICAL.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `[config] Missing critical env vars: ${missing.join(', ')}. ` +
      'Set these in Vercel Dashboard → Project Settings → Environment Variables.'
    );
  }
}

// ---------------------------------------------------------------------------
// Named business-logic constants (no magic numbers in services)
// ---------------------------------------------------------------------------
const TRIAL_PERIOD_DAYS = 14;
const PILOT_TRIAL_DAYS = 90;
const MAX_DEAD_LETTER_RETRIES = 5;
const CIRCUIT_BREAKER_RESET_MS = 30_000;

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------
const stripe = {
  secretKey: process.env.STRIPE_SECRET_KEY || null,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
  portalReturnUrl: process.env.STRIPE_PORTAL_RETURN_URL || 'https://landyourleads.com/dashboard',
  prices: {
    starter:      { month: process.env.STRIPE_PRICE_STARTER_MONTHLY,      year: process.env.STRIPE_PRICE_STARTER_YEARLY },
    professional: { month: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY, year: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY },
    enterprise:   { month: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,   year: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY },
  },
};

// ---------------------------------------------------------------------------
// Twilio
// ---------------------------------------------------------------------------
const twilio = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || null,
  authToken: process.env.TWILIO_AUTH_TOKEN || null,
  phoneNumberUs: process.env.TWILIO_PHONE_NUMBER_US || null,
  phoneNumberCa: process.env.TWILIO_PHONE_NUMBER_CA || null,
  phoneNumberLegacy: process.env.TWILIO_PHONE_NUMBER || null,
  statusCallbackUrl: process.env.TWILIO_STATUS_CALLBACK_URL || null,
};

// ---------------------------------------------------------------------------
// Follow Up Boss (FUB)
// ---------------------------------------------------------------------------
const fub = {
  apiKey: process.env.FUB_API_KEY || null,
  apiBaseUrl: process.env.FUB_API_BASE_URL || null,
  webhookSecret: process.env.FUB_WEBHOOK_SECRET || null,
};

// ---------------------------------------------------------------------------
// Cal.com
// ---------------------------------------------------------------------------
const calcom = {
  apiKey: process.env.CAL_API_KEY || null,
  username: process.env.CAL_USERNAME || null,
  webhookSecret: process.env.CAL_WEBHOOK_SECRET || null,
  apiUrl: process.env.NEXT_PUBLIC_API_URL || null,
};

// ---------------------------------------------------------------------------
// App / database
// ---------------------------------------------------------------------------
const app = {
  pgUrl: process.env.LOCAL_PG_URL || null,
  apiKey: process.env.LEADFLOW_API_KEY || process.env.API_SECRET_KEY || null,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app',
  fromEmail: (process.env.FROM_EMAIL || 'stojan@landyourleads.com').trim(),
  nodeEnv: process.env.NODE_ENV || 'development',
};

module.exports = {
  // Named constants
  TRIAL_PERIOD_DAYS,
  PILOT_TRIAL_DAYS,
  MAX_DEAD_LETTER_RETRIES,
  CIRCUIT_BREAKER_RESET_MS,
  // Domain groups
  stripe,
  twilio,
  fub,
  calcom,
  app,
};
