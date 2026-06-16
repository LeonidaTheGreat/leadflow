/**
 * FUB Webhook Server (Vercel Serverless)
 * Receives real-time lead events from Follow Up Boss
 */

require('dotenv').config();
const express = require('express');
const { logger, requestLogger } = require('./lib/logger');
const { webhookLimiter, adminLimiter } = require('./lib/middleware/rate-limiter');
const { router: fubRouter } = require('./integration/fub-webhook-listener');
const systemRouter = require('./routes/system');
const weeklyPerformanceRouter = require('./routes/internal/weekly-performance');
const checkStuckPilotsRouter = require('./routes/internal/check-stuck-pilots');
const deadLetterReplayRouter = require('./routes/internal/dead-letter-replay');
const pilotReactivationRouter = require('./routes/internal/pilot-reactivation');
const activationOutreachRouter = require('./routes/admin/activation-outreach');
const reactivationCampaignRouter = require('./routes/admin/reactivation-campaign');
const calcomWebhookRouter = require('./routes/calcom-webhook');
const billingRouter = require('./routes/billing');

const app = express();

// Stripe webhooks require the raw body for signature verification — must be
// registered before express.json() so the raw buffer is preserved on this path.
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(requestLogger);

// Rate limiting — applied after body parsing and request logging
app.use('/webhook', webhookLimiter);
app.use('/api/cron', adminLimiter);
app.use('/api/admin', adminLimiter);

// System routes
app.use('/', systemRouter);

// FUB webhook routes
app.use('/', fubRouter);

// Weekly performance email routes
app.use('/', weeklyPerformanceRouter);

// Stuck pilots cron route (checks pilot_progress, not onboarding_events)
app.use('/', checkStuckPilotsRouter);

// Dead letter replay cron route (retries failed webhook events)
app.use('/', deadLetterReplayRouter);

// Pilot reactivation cron route (3-email sequence for phone-less verified pilots)
app.use('/', pilotReactivationRouter);

// Admin: activation outreach (personal email to verified but unactivated signups)
app.use('/', activationOutreachRouter);

// Admin: lapsed trial reactivation campaign
app.use('/', reactivationCampaignRouter);

// Cal.com webhook and admin endpoints
app.use('/', calcomWebhookRouter);

// Billing (Stripe webhook + subscription/portal API)
app.use('/', billingRouter);

// Global error handler — must be after all route registrations
app.use((err, req, res, next) => {
  logger.error('Unhandled route error', err, 'HTTP', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
  })
  res.status(err.statusCode || err.status || 500).json({ error: 'Internal server error', code: err.code || 'INTERNAL_ERROR' })
})

// Local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Local server started on port ${PORT}`, 'Startup');
  });
}

// Export for Vercel serverless
module.exports = app;

// Catch unhandled promise rejections — log but don't crash
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)), 'Process')
})
