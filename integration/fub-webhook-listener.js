'use strict';

const crypto = require('crypto');
const express = require('express');
const FUBService = require('../lib/services/FUBService');
const { getPool } = require('../lib/db');

const router = express.Router();
const fubService = new FUBService();

/**
 * Write a dead letter record for a failed webhook processing attempt.
 * Best-effort: failures are logged but never thrown.
 */
async function writeDeadLetter(source, eventType, payload, errorMessage) {
  try {
    const pool = getPool();
    await pool.query(
      'INSERT INTO webhook_dead_letters (source, event_type, payload, error_message) VALUES ($1, $2, $3, $4)',
      [source, eventType, JSON.stringify(payload), errorMessage]
    );
  } catch (dbErr) {
    console.error('[fub-webhook] dead_letter DB write failed:', dbErr.message);
  }
}

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
    const body = req.body || {};
    const eventType = body.type || body.event || 'unknown';
    const leadId = body.person && body.person.id ? String(body.person.id) : (body.personId ? String(body.personId) : null);
    console.error(JSON.stringify({
      level: 'error',
      source: 'fub-webhook',
      event_type: eventType,
      lead_id: leadId,
      error: error.message,
      timestamp: new Date().toISOString()
    }));
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
