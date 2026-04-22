/**
 * Funnel Diagnostics — Trial Activation Segmentation
 *
 * GET /api/admin/funnel/trial-activation
 *
 * Segments trial agents by activation state:
 *   active          — FUB connected + recent lead + recent outbound SMS within window_days
 *   onboarded       — FUB connected, no recent activity
 *   never_activated — No FUB connection
 *
 * Auth: Authorization: Bearer <LEADFLOW_API_KEY>
 * PRD: docs/prd/PRD-FUNNEL-DIAGNOSTICS-TRIAL-ACTIVATION.md
 */

'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getPool } = require('../../lib/db');
const { logger } = require('../../lib/logger');
const log = logger.child('funnel-diagnostics');

function verifyBearerAuth(req) {
  const apiKey = process.env.LEADFLOW_API_KEY;
  if (!apiKey) return false;

  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) return false;

  const provided = authHeader.slice(7).trim();
  if (provided.length !== apiKey.length) return false;

  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(apiKey));
}

const SEGMENT_SQL = `
  WITH trial_agents AS (
    SELECT
      ra.id              AS agent_id,
      ra.email,
      ra.first_name,
      ra.last_name,
      ra.trial_ends_at,
      ra.created_at      AS trial_started_at,
      EXTRACT(DAY FROM (ra.trial_ends_at - NOW()))::integer AS days_remaining
    FROM real_estate_agents ra
    WHERE ra.trial_ends_at IS NOT NULL
      AND (ra.subscription_status IS NULL OR ra.subscription_status NOT IN ('active', 'canceled'))
  ),
  fub_status AS (
    SELECT
      agent_id,
      (follow_up_boss_api_key IS NOT NULL AND follow_up_boss_api_key != '') AS fub_connected,
      updated_at AS fub_connected_at
    FROM agent_integrations
  ),
  lead_activity AS (
    SELECT
      agent_id,
      COUNT(*) FILTER (WHERE created_at >= NOW() - ($1 || ' days')::interval) AS leads_last_nd,
      MAX(created_at) AS last_lead_at
    FROM leads
    GROUP BY agent_id
  ),
  sms_activity AS (
    SELECT
      l.agent_id,
      COUNT(*) FILTER (
        WHERE sm.created_at >= NOW() - ($1 || ' days')::interval
          AND sm.direction = 'outbound'
      ) AS sms_sent_last_nd,
      MAX(sm.created_at) AS last_sms_at
    FROM sms_messages sm
    JOIN leads l ON sm.lead_id = l.id
    WHERE sm.direction = 'outbound'
    GROUP BY l.agent_id
  )
  SELECT
    ta.agent_id,
    ta.email,
    ta.first_name,
    ta.last_name,
    ta.trial_ends_at,
    ta.days_remaining,
    COALESCE(fs.fub_connected, false)         AS fub_connected,
    fs.fub_connected_at,
    COALESCE(la.leads_last_nd, 0)             AS leads_last_nd,
    COALESCE(sa.sms_sent_last_nd, 0)          AS sms_sent_last_nd,
    GREATEST(la.last_lead_at, sa.last_sms_at) AS last_activity_at,
    CASE
      WHEN COALESCE(fs.fub_connected, false)
           AND COALESCE(la.leads_last_nd, 0) > 0
           AND COALESCE(sa.sms_sent_last_nd, 0) > 0
      THEN 'active'
      WHEN COALESCE(fs.fub_connected, false)
      THEN 'onboarded'
      ELSE 'never_activated'
    END AS activation_segment
  FROM trial_agents ta
  LEFT JOIN fub_status fs    ON fs.agent_id = ta.agent_id
  LEFT JOIN lead_activity la ON la.agent_id = ta.agent_id
  LEFT JOIN sms_activity sa  ON sa.agent_id = ta.agent_id
  ORDER BY ta.trial_ends_at ASC
`;

router.get('/api/admin/funnel/trial-activation', async (req, res) => {
  if (!verifyBearerAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const rawWindowDays = parseInt(req.query.window_days, 10);
  const window_days = (Number.isFinite(rawWindowDays) && rawWindowDays >= 1)
    ? rawWindowDays
    : 7;

  const pool = getPool();
  const now = new Date();

  try {
    const { rows } = await pool.query(SEGMENT_SQL, [String(window_days)]);

    const segments = { active: [], onboarded: [], never_activated: [] };

    for (const row of rows) {
      const segment = row.activation_segment;
      const agentRow = {
        agent_id: row.agent_id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        trial_ends_at: row.trial_ends_at,
        days_remaining: Number(row.days_remaining),
        fub_connected_at: row.fub_connected_at || null,
        leads_last_7d: Number(row.leads_last_nd),
        sms_sent_last_7d: Number(row.sms_sent_last_nd),
        last_activity_at: row.last_activity_at || null,
      };
      segments[segment].push(agentRow);
    }

    return res.json({
      summary: {
        total_trial_agents: rows.length,
        active: segments.active.length,
        onboarded: segments.onboarded.length,
        never_activated: segments.never_activated.length,
        as_of: now.toISOString(),
        window_days,
      },
      segments,
    });
  } catch (err) {
    log.error('Trial activation query error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
