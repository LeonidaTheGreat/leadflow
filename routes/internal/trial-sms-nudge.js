'use strict';

/**
 * Trial SMS Nudge Routes
 *
 * Sends automated Twilio SMS nudges to agents in active trials who haven't upgraded.
 *   - Cron trigger: GET /api/cron/trial-sms-nudge
 *   - Preview:      GET /api/admin/trial-sms-nudge/preview
 *
 * UC: uc-leadflow-trial-sms-nudge-sequence
 */

const express = require('express');
const router = express.Router();
const requireCronSecret = require('../../lib/middleware/require-cron-secret');
const requireApiKey = require('../../lib/middleware/require-api-key');
const TrialSmsNudgeService = require('../../lib/services/TrialSmsNudgeService');
const { getPool } = require('../../lib/db');
const { logger } = require('../../lib/logger');

const log = logger.child('trial-sms-nudge');

/**
 * GET /api/cron/trial-sms-nudge
 *
 * Vercel cron: fires daily, sends any overdue nudges to eligible trial agents.
 * Pass ?dry_run=true to preview without sending.
 */
router.get('/api/cron/trial-sms-nudge', requireCronSecret, async (req, res) => {
  const dryRun = req.query.dry_run === 'true';

  try {
    log.info('Cron triggered', { dryRun });
    const service = new TrialSmsNudgeService({ pool: getPool() });
    const results = await service.runNudgeSequence({ dryRun });

    log.info('Sequence completed', results);

    return res.status(200).json({
      success: true,
      message: 'Trial SMS nudge sequence executed',
      timestamp: new Date().toISOString(),
      dryRun,
      results,
    });
  } catch (error) {
    log.error('Cron error', error);
    return res.status(500).json({
      success: false,
      message: 'Trial SMS nudge sequence failed',
      error: 'Internal error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/admin/trial-sms-nudge/preview
 *
 * Shows which agents would receive nudges on the next cron run.
 * Phone numbers are masked (last 4 digits only).
 */
router.get('/api/admin/trial-sms-nudge/preview', requireApiKey, async (req, res) => {
  try {
    const service = new TrialSmsNudgeService({ pool: getPool() });
    const agents = await service.getEligibleAgents();

    return res.status(200).json({
      success: true,
      count: agents.length,
      agents: agents.map(a => ({
        id: a.id,
        first_name: a.first_name,
        phone_suffix: a.phone_number ? `***${String(a.phone_number).slice(-4)}` : null,
        trial_ends_at: a.trial_ends_at,
        nudge_step: a.nudgeStep,
      })),
    });
  } catch (error) {
    log.error('Preview error', error);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

module.exports = router;
