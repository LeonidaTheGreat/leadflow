'use strict';

const crypto = require('crypto');
const express = require('express');
const FUBService = require('../lib/services/FUBService');
const { writeDeadLetter } = require('../lib/utils/dead-letter');
const { logger } = require('../lib/logger');
const log = logger.child('fub-webhook');

const router = express.Router();
const fubService = new FUBService();

router.post('/webhook/fub', (req, res) => {
  // ─── Signature verification ────────────────────────────────────────────────
  const fubSecret = process.env.FUB_WEBHOOK_SECRET;
  if (!fubSecret) {
    log.error('FUB_WEBHOOK_SECRET not configured — rejecting webhook');
    return res.status(503).json({ error: 'Webhook verification not configured' });
  }

  const signature = req.headers['x-followupboss-signature'] ||
                    req.headers['fub-signature'] ||
                    req.headers['x-signature'];

  const rawBody = typeof req.body === 'string'
    ? req.body
    : JSON.stringify(req.body);

  const expected = crypto
    .createHmac('sha256', fubSecret)
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

  // ─── Payload processing ────────────────────────────────────────────────────
  try {
    const result = fubService.handleWebhookPayload(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    const body = req.body || {};
    const eventType = body.type || body.event || 'unknown';
    const leadId = body.person && body.person.id ? String(body.person.id) : (body.personId ? String(body.personId) : null);
    log.error('Failed to process webhook payload', error, {
      event_type: eventType,
      lead_id: leadId,
    });
    writeDeadLetter('fub', eventType, body, error.message);
    return res.status(200).json({
      received: true,
      processed: false,
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
