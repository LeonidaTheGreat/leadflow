'use strict';

const express = require('express');
const { getPool } = require('../../lib/db');
const PilotPhonelessReactivationService = require('../../lib/services/PilotPhonelessReactivationService');
const EmailService = require('../../lib/services/EmailService');
const { ApiKeyAuthService } = require('../../lib/services/api-key-auth-service');
const { logger } = require('../../lib/logger');

const router = express.Router();
const log = logger.child('pilot-phoneless-reactivation');
const MAX_LIMIT = 500;

function isAuthorized(req) {
  const expected = process.env.LEADFLOW_API_KEY || '';
  const provided =
    req.headers.leadflow_api_key ||
    req.headers['leadflow-api-key'] ||
    req.headers['x-api-key'] ||
    '';
  return ApiKeyAuthService.isAuthorized({ expected, provided });
}

function validateBody(body) {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  if (typeof body.dryRun !== 'boolean') {
    return { ok: false, error: 'dryRun must be a boolean' };
  }
  if (body.limit !== undefined) {
    const parsed = Number(body.limit);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { ok: false, error: 'limit must be a positive integer' };
    }
    if (parsed > MAX_LIMIT) {
      return { ok: false, error: `limit must not exceed ${MAX_LIMIT}` };
    }
  }
  return { ok: true };
}

router.post('/api/admin/pilot-phoneless-reactivation', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const validation = validateBody(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const service = new PilotPhonelessReactivationService({
    pool: getPool(),
    emailService: new EmailService(),
  });

  try {
    const result = await service.runCampaign({
      dryRun: req.body.dryRun,
      limit: req.body.limit,
    });
    return res.json(result);
  } catch (err) {
    log.error('Pilot phoneless reactivation campaign failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
