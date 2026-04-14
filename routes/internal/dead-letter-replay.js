'use strict';

// Recommended vercel.json cron: { "path": "/api/cron/dead-letter-replay", "schedule": "0 */6 * * *" }
// (every 6 hours — adjust based on webhook volume)

const express = require('express');
const router = express.Router();
const requireCronSecret = require('../../lib/middleware/require-cron-secret');
const { logger } = require('../../lib/logger');
const log = logger.child('dead-letter-replay');

/**
 * Register replay handlers for each webhook source.
 * Each handler re-processes the original payload through the same
 * code path as the live webhook, but without signature verification
 * (the payload was already verified on first receipt).
 */
function createReplayInstance(pool) {
  const { DeadLetterReplay } = require('../../lib/utils/dead-letter-replay');
  const replay = new DeadLetterReplay(pool);

  // Stripe replay: re-process webhook event through BillingService
  replay.registerHandler('stripe', async (payload, eventType) => {
    const BillingService = require('../../lib/services/BillingService');
    const billing = new BillingService();
    await billing.processWebhookEvent(payload);
  });

  // Cal.com replay: re-process booking event through CalcomWebhookHandler
  replay.registerHandler('calcom', async (payload, eventType) => {
    const CalcomWebhookHandler = require('../../lib/services/CalcomWebhookHandler');
    const handler = new CalcomWebhookHandler();
    await handler.handleCalWebhook(payload);
  });

  // FUB replay: re-process lead event through FUBService
  replay.registerHandler('fub', async (payload, eventType) => {
    const FUBService = require('../../lib/services/FUBService');
    const fubService = new FUBService();
    fubService.handleWebhookPayload(payload);
  });

  return replay;
}

router.get('/api/cron/dead-letter-replay', requireCronSecret, async (req, res) => {
  log.info('Dead letter replay cron triggered');

  try {
    const { getPool } = require('../../lib/db');
    const replay = createReplayInstance(getPool());
    const result = await replay.run();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    log.error('Dead letter replay failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
