/**
 * Task Spec — f3b7eea4-1b32-4acb-b051-da53e520201f
 * What:
 * - Update routes/admin/reactivation-campaign.js to delegate API-key auth to a service class.
 * - Add lib/services/api-key-auth-service.js with ApiKeyAuthService.isAuthorized() that performs timing-safe key comparison.
 * - Keep route behavior and response statuses unchanged.
 * Verify:
 * - node ~/.openclaw/genome/scripts/quality-audit.js /Users/clawdbot/projects/leadflow --json shows no `no_direct_db` failure.
 * - npm run lint
 * - npm test
 * - npm run build
 * - npm audit --audit-level=high
 * - rg -n "\\.from\\(" routes/admin/reactivation-campaign.js returns no matches.
 * Boundaries:
 * - Do not change database schema, migrations, or LapsedTrialReactivationService behavior.
 * - Do not modify unrelated routes/services.
 * - Do not alter dashboard API route code.
 */
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
  const provided = req.headers.leadflow_api_key || req.headers['x-api-key'] || '';
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
