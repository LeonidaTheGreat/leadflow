/**
 * Admin SMS Cold Outreach
 *
 * POST /api/admin/sms-outreach      — send Twilio SMS with magic trial link to a prospect
 * GET  /api/admin/sms-outreach/log  — list sent history (timestamp, recipient, reply status)
 *
 * Auth: LEADFLOW_API_KEY via x-api-key header
 *
 * UC: uc-leadflow-admin-sms-outreach
 */

'use strict';

const express = require('express');
const router = express.Router();
const { getPool } = require('../../lib/db');
const AdminSmsOutreachService = require('../../lib/services/AdminSmsOutreachService');
const requireApiKey = require('../../lib/middleware/require-api-key');
const { logger } = require('../../lib/logger');

const log = logger.child('admin-sms-outreach');

function getService() {
  return new AdminSmsOutreachService({ pool: getPool() });
}

// ─── POST /api/admin/sms-outreach ─────────────────────────────────────────────
router.post('/api/admin/sms-outreach', requireApiKey, async (req, res) => {
  const { firstName, phone, market, email } = req.body || {};
  const service = getService();

  try {
    const result = await service.sendOutreach({ firstName, phone, market, email });
    return res.status(200).json({
      success: true,
      id: result.id,
      loginUrl: result.loginUrl,
      twilio_sid: result.twilio_sid,
      sms_status: result.sms_status,
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    if (statusCode >= 500) {
      log.error('SMS outreach send failed', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    return res.status(statusCode).json({ error: err.message });
  }
});

// ─── GET /api/admin/sms-outreach/log ──────────────────────────────────────────
router.get('/api/admin/sms-outreach/log', requireApiKey, async (req, res) => {
  const service = getService();
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

  try {
    const rows = await service.getOutreachLog(limit);
    return res.status(200).json({ log: rows });
  } catch (err) {
    log.error('Failed to fetch SMS outreach log', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
