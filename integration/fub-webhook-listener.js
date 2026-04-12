'use strict';

const crypto = require('crypto');
const express = require('express');
const FUBService = require('../lib/services/FUBService');

const router = express.Router();
const fubService = new FUBService();

router.post('/webhook/fub', (req, res) => {
  // ─── Signature verification ────────────────────────────────────────────────
  if (process.env.FUB_WEBHOOK_SECRET) {
    const signature = req.headers['x-followupboss-signature'] ||
                      req.headers['fub-signature'] ||
                      req.headers['x-signature'];

    const rawBody = typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);

    const expected = crypto
      .createHmac('sha256', process.env.FUB_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const provided = Buffer.from(signature || '', 'utf8');
    const computed = Buffer.from(expected, 'utf8');

    if (
      provided.length !== computed.length ||
      !crypto.timingSafeEqual(provided, computed)
    ) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  } else {
    console.warn('[fub-webhook] FUB_WEBHOOK_SECRET not set — skipping signature verification');
  }

  // ─── Payload processing ────────────────────────────────────────────────────
  try {
    const result = fubService.handleWebhookPayload(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Failed to process FUB webhook:', error.message);
    return res.status(500).json({
      received: false,
      error: 'Failed to process webhook payload'
    });
  }
});

module.exports = {
  router,
  fubService,
  fubEventBus: fubService.eventBus,
  verifyFubWebhookSignature: (req) => fubService.verifyWebhookSignature(req)
};
