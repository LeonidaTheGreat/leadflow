/**
 * Activation Outreach — Personal outreach to verified but unactivated signups
 *
 * GET  /api/admin/activation-list          — list eligible agents (JSON or CSV)
 * POST /api/admin/send-activation-email    — send personalized email to single agent
 *
 * Auth: LEADFLOW_API_KEY bearer token (admin-only)
 *
 * UC: feat-personal-outreach-to-250-verified-signups
 */

'use strict';

const express = require('express');
const router = express.Router();
const { getPool } = require('../../lib/db');
const ActivationService = require('../../lib/services/ActivationService');
const requireApiKey = require('../../lib/middleware/require-api-key');
const { logger } = require('../../lib/logger');
const log = logger.child('activation-outreach');

function getService() {
  return new ActivationService({ pool: getPool() });
}

// ─── GET /api/admin/activation-list ───────────────────────────────────────────
router.get('/api/admin/activation-list', requireApiKey, async (req, res) => {
  const service = getService();
  try {
    const rows = await service.getActivationList();
    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="activation-list.csv"');
      return res.send(service.formatListAsCsv(rows));
    }
    return res.json(service.formatListAsJson(rows));
  } catch (err) {
    log.error('List activation error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/admin/send-activation-email ────────────────────────────────────
router.post('/api/admin/send-activation-email', requireApiKey, async (req, res) => {
  const service = getService();
  const { agent_id } = req.body || {};
  if (!agent_id) {
    return res.status(400).json({ error: 'agent_id is required' });
  }
  try {
    const result = await service.sendActivationEmail(agent_id);
    if (!result.success) {
      if (result.error === 'Agent not found') return res.status(404).json({ error: result.error });
      if (result.error === 'Agent email is not verified' || result.error === 'Agent has already completed onboarding') {
        return res.status(400).json({ error: result.error });
      }
      return res.status(502).json({ error: 'Email send failed', detail: result.detail });
    }
    return res.json({ success: true, agent_id: result.agent_id, email: result.email, resend_id: result.resend_id });
  } catch (err) {
    log.error('Send activation email error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
