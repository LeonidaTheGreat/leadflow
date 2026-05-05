/**
 * Task Spec (23c79465-4c96-495b-8c2b-36f1723df8f6)
 * What:
 * - Change file: server.js (header spec/comment cleanup only).
 * - Remove stale text that mentions a deleted admin payment-links module path.
 * Verify:
 * - node -e "const { CodebaseHealth } = require('/Users/clawdbot/.openclaw/genome/health/codebase-health'); const c = new CodebaseHealth(); console.log(c.checkBrokenImports().ok);" prints true.
 * - npm run build exits 0.
 * - npm run lint exits 0.
 * - npm test exits 0.
 * - npm audit --audit-level=high shows 0 high/critical vulnerabilities.
 * Boundaries:
 * - Do not modify route wiring behavior.
 * - Do not add/remove endpoint handlers.
 * - Do not modify files outside this targeted import-health fix and completion report.
 */
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
