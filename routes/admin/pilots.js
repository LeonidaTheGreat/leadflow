'use strict';

/**
 * Admin Pilots Sales Cockpit
 *
 * GET  /api/admin/pilots                    — list email-verified pilot agents
 * POST /api/admin/pilots/payment-link       — generate Stripe payment link for Pro plan
 * POST /api/admin/pilots/outreach           — log a contact event
 * PATCH /api/admin/pilots/outreach/:id/status — update outreach status
 *
 * Auth: LEADFLOW_API_KEY via x-api-key header
 *
 * UC: uc-admin-sales-cockpit-admin
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../../lib/db');
const AdminPilotsService = require('../../lib/services/AdminPilotsService');
const requireApiKey = require('../../lib/middleware/require-api-key');
const { logger } = require('../../lib/logger');

const log = logger.child('admin-pilots');

function getService() {
  return new AdminPilotsService({ pool: getPool() });
}

// ─── GET /api/admin/pilots ────────────────────────────────────────────────────
router.get('/api/admin/pilots', requireApiKey, async (req, res) => {
  const service = getService();
  try {
    const pilots = await service.getPilotList();
    return res.json({ pilots });
  } catch (err) {
    log.error('Pilots list error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/admin/pilots/payment-link ──────────────────────────────────────
router.post('/api/admin/pilots/payment-link', requireApiKey, async (req, res) => {
  const service = getService();
  const { agent_id, email } = req.body || {};

  if (!agent_id) {
    return res.status(400).json({ error: 'agent_id is required' });
  }

  try {
    const result = await service.generatePaymentLink(agent_id, email);
    return res.json({ url: result.url });
  } catch (err) {
    log.error('Payment link generation error', { agentId: agent_id, err: err.message });
    if (err.message.includes('not configured')) {
      return res.status(503).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/admin/pilots/outreach ─────────────────────────────────────────
router.post('/api/admin/pilots/outreach', requireApiKey, async (req, res) => {
  const service = getService();
  const { agent_id, contacted_at, channel, notes, status } = req.body || {};

  if (!agent_id) {
    return res.status(400).json({ error: 'agent_id is required' });
  }
  if (!channel) {
    return res.status(400).json({ error: 'channel is required' });
  }

  try {
    const row = await service.logContact({ agent_id, contacted_at, channel, notes, status });
    return res.status(201).json({ outreach: row });
  } catch (err) {
    log.error('Log outreach error', { agentId: agent_id, err: err.message });
    if (err.message.includes('must be one of')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/admin/pilots/outreach/:id/status ─────────────────────────────
router.patch('/api/admin/pilots/outreach/:id/status', requireApiKey, async (req, res) => {
  const service = getService();
  const { id } = req.params;
  const { status } = req.body || {};

  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }

  try {
    const row = await service.updateOutreachStatus(id, status);
    return res.json({ outreach: row });
  } catch (err) {
    log.error('Update outreach status error', { outreachId: id, err: err.message });
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('must be one of')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
