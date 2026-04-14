/**
 * FUB Webhook Server (Vercel Serverless)
 * Receives real-time lead events from Follow Up Boss
 */

require('dotenv').config();
const express = require('express');
const createLogger = require('./lib/utils/logger');
const log = createLogger('server');
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
  log.error('Unhandled error', { method: req.method, path: req.path, error: err.message })
  res.status(err.statusCode || err.status || 500).json({ error: err.message || 'Internal server error', code: err.code || 'INTERNAL_ERROR' })
})

// Local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    log.info(`Local server started`, { url: `http://localhost:${PORT}` });
  });
}

// Export for Vercel serverless
module.exports = app;

// Catch unhandled promise rejections — log but don't crash
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled promise rejection', { reason: String(reason) })
})
