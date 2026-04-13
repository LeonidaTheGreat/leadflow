/**
 * FUB Webhook Server (Vercel Serverless)
 * Receives real-time lead events from Follow Up Boss
 */

require('dotenv').config();
const express = require('express');

// ─── Stripe startup validation ────────────────────────────────────────────────
// Check required billing env vars at module load. Log clearly in production but
// do not crash — other routes (FUB webhook, cron, Cal.com) must still function.
if (process.env.NODE_ENV === 'production') {
  const REQUIRED_STRIPE_VARS = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PRICE_STARTER_MONTHLY',
    'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    'STRIPE_PRICE_ENTERPRISE_MONTHLY',
  ];
  const missingStripe = REQUIRED_STRIPE_VARS.filter(v => !process.env[v]);
  if (missingStripe.length > 0) {
    console.error('[server] BILLING MISCONFIGURED — missing env vars:', missingStripe.join(', '));
    console.error('[server] Billing routes are disabled until these are set.');
  }
}
const { router: fubRouter } = require('./integration/fub-webhook-listener');
const systemRouter = require('./routes/system');
const weeklyPerformanceRouter = require('./routes/weekly-performance');
const checkStuckPilotsRouter = require('./routes/check-stuck-pilots');
const activationOutreachRouter = require('./routes/admin/activation-outreach');
const calcomWebhookRouter = require('./routes/calcom-webhook');
const billingRouter = require('./routes/billing');

const app = express();

// Stripe webhooks require the raw body for signature verification — must be
// registered before express.json() so the raw buffer is preserved on this path.
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));

app.use(express.json());

// System routes
app.use('/', systemRouter);

// FUB webhook routes
app.use('/', fubRouter);

// Weekly performance email routes
app.use('/', weeklyPerformanceRouter);

// Stuck pilots cron route (checks pilot_progress, not onboarding_events)
app.use('/', checkStuckPilotsRouter);

// Admin: activation outreach (personal email to verified but unactivated signups)
app.use('/', activationOutreachRouter);

// Cal.com webhook and admin endpoints
app.use('/', calcomWebhookRouter);

// Billing (Stripe webhook + subscription/portal API)
app.use('/', billingRouter);

// Global error handler — must be after all route registrations
app.use((err, req, res, next) => {
  console.error(`[${req.method} ${req.path}] Unhandled error:`, err.message)
  res.status(err.statusCode || err.status || 500).json({ error: err.message || 'Internal server error', code: err.code || 'INTERNAL_ERROR' })
})

// Local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Local server: http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;

// Catch unhandled promise rejections — log but don't crash
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})
