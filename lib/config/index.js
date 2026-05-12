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
// ---------------------------------------------------------------------------
const CRITICAL = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];

if (process.env.NODE_ENV === 'production') {
  const missing = CRITICAL.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`[config] Missing critical env vars: ${missing.join(', ')}`);
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
// Annual billing constants
// Annual plan = pay 10 months, get 12 (2 months free = ~16.7% discount)
// ---------------------------------------------------------------------------
const ANNUAL_DISCOUNT_MONTHS = 2; // months free when paying annually
const ANNUAL_MONTHS_PAID = 10;    // months you pay for (12 - ANNUAL_DISCOUNT_MONTHS)

// Monthly prices in USD (canonical source of truth for price calculations)
const MONTHLY_PRICES = {
  starter:   49,
  pro:       149,
  team:      399,
  brokerage: 999,
};

// Annual prices in USD (monthly rate x ANNUAL_MONTHS_PAID)
const ANNUAL_PRICES = {
  starter:   490,   // $49  x 10
  pro:       1490,  // $149 x 10
  team:      3990,  // $399 x 10
  brokerage: 9990,  // $999 x 10
};

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------
const stripe = {
  secretKey: process.env.STRIPE_SECRET_KEY || null,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
  portalReturnUrl: process.env.STRIPE_PORTAL_RETURN_URL || 'https://landyourleads.com/dashboard',
  prices: {
    // Legacy tier names kept for backward compat with BillingService internals
    starter:      { month: process.env.STRIPE_PRICE_STARTER_MONTHLY,      year: process.env.STRIPE_PRICE_STARTER_ANNUAL || process.env.STRIPE_PRICE_STARTER_YEARLY },
    professional: { month: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY, year: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY },
    enterprise:   { month: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,   year: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY },
    // Canonical tier names aligned with checkout route and pricing page
    pro:          { month: process.env.STRIPE_PRICE_PRO_MONTHLY,          year: process.env.STRIPE_PRICE_PRO_ANNUAL },
    team:         { month: process.env.STRIPE_PRICE_TEAM_MONTHLY,         year: process.env.STRIPE_PRICE_TEAM_ANNUAL },
    brokerage:    { month: process.env.STRIPE_PRICE_BROKERAGE_MONTHLY,    year: process.env.STRIPE_PRICE_BROKERAGE_ANNUAL },
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
  ANNUAL_DISCOUNT_MONTHS,
  ANNUAL_MONTHS_PAID,
  MONTHLY_PRICES,
  ANNUAL_PRICES,
  // Domain groups
  stripe,
  twilio,
  fub,
  calcom,
  app,
};
