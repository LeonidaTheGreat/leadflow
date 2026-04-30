/**
 * Task Spec — 8f24f202-7f4a-4fa4-ab47-1bf4fedb79ca
 * What:
 * - Add POST /api/admin/reactivation-campaign in routes/admin/reactivation-campaign.js.
 * - Add LapsedTrialReactivationService class in lib/services/LapsedTrialReactivationService.js.
 * - Extend EmailService with sendLapsedTrialReactivation() and template builder.
 * - Wire route in server.js and add unit test tests/unit/lapsed-trial-reactivation-service.test.js.
 * Verify:
 * - npm run lint
 * - npm test
 * - npm run build
 * - npm audit --audit-level=high
 * - Unit test validates eligible query behavior + email payload + sent-flag update.
 * Boundaries:
 * - Do not modify DB schema/migrations.
 * - Do not touch checkout/Stripe route logic.
 * - Do not add unrelated endpoints or product UI changes.
 */
'use strict';

const crypto = require('crypto');
const express = require('express');
const { getPool } = require('../../lib/db');
const LapsedTrialReactivationService = require('../../lib/services/LapsedTrialReactivationService');
const { logger } = require('../../lib/logger');

const router = express.Router();
const log = logger.child('reactivation-campaign');
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function isAuthorized(req) {
  const expected = process.env.LEADFLOW_API_KEY || '';
  const provided = req.headers.leadflow_api_key || req.headers['x-api-key'] || '';

  if (!expected || !provided) return false;

  const providedBuf = Buffer.from(String(provided).trim());
  const expectedBuf = Buffer.from(String(expected).trim());

  return providedBuf.length === expectedBuf.length
    && crypto.timingSafeEqual(providedBuf, expectedBuf);
}

function parseLimit(limitValue) {
  const parsed = Number(limitValue);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return Math.min(parsed, MAX_LIMIT);
}

function validateBody(body) {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  if (typeof body.dryRun !== 'boolean') {
    return { ok: false, error: 'dryRun must be a boolean' };
  }

  const limit = body.limit === undefined ? DEFAULT_LIMIT : parseLimit(body.limit);
  if (limit === null) {
    return { ok: false, error: 'limit must be a positive integer' };
  }

  return { ok: true, limit };
}

router.post('/api/admin/reactivation-campaign', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const validation = validateBody(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const service = new LapsedTrialReactivationService({ pool: getPool() });

  try {
    const result = await service.runCampaign({
      dryRun: req.body.dryRun,
      limit: validation.limit,
    });

    return res.json(result);
  } catch (err) {
    log.error('Reactivation campaign failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
