'use strict';

const express = require('express');
const { getPool } = require('../../lib/db');
const LapsedTrialReactivationService = require('../../lib/services/LapsedTrialReactivationService');
const { ApiKeyAuthService } = require('../../lib/services/api-key-auth-service');
const { logger } = require('../../lib/logger');

const router = express.Router();
const log = logger.child('reactivation-campaign');
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function isAuthorized(req) {
  const expected = process.env.LEADFLOW_API_KEY || '';
  const provided = req.headers.leadflow_api_key
    || req.headers['leadflow-api-key']
    || req.headers['x-api-key']
    || '';
  return ApiKeyAuthService.isAuthorized({ expected, provided });
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

router.get('/api/admin/reactivation-campaign/stats', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const service = new LapsedTrialReactivationService({ pool: getPool() });

  try {
    const stats = await service.getStats();
    return res.json(stats);
  } catch (err) {
    log.error('Reactivation stats failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

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
