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

function getService() {
  return new ActivationService({ pool: getPool() });
}

// ─── GET /api/admin/activation-list ───────────────────────────────────────────
router.get('/api/admin/activation-list', async (req, res) => {
  const service = getService();
  if (!service.verifyAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const rows = await service.getActivationList();
    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="activation-list.csv"');
      return res.send(service.formatListAsCsv(rows));
    }
    return res.json(service.formatListAsJson(rows));
  } catch (err) {
    console.error('[activation-outreach] list error:', err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// ─── POST /api/admin/send-activation-email ────────────────────────────────────
router.post('/api/admin/send-activation-email', async (req, res) => {
  const service = getService();
  if (!service.verifyAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
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
    console.error('[activation-outreach] send error:', err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

module.exports = router;
