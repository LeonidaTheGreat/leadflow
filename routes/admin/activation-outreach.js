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

/**
 * Verify admin bearer token.
 * Accepts the LEADFLOW_API_KEY.
 */
function verifyAdminAuth(req) {
  const apiKey = process.env.LEADFLOW_API_KEY;
  if (!apiKey) return false;

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return false;

  const provided = authHeader.slice(7).trim();
  return provided === apiKey;
}

/**
 * Send email via Resend REST API (no SDK dependency needed).
 * Returns { success, resend_id?, error? }
 */
async function sendViaResend({ to, subject, html, from }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  // Dynamic import for node-fetch (ESM)
  const fetch = (await import('node-fetch')).default;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  const body = await res.json();

  if (!res.ok) {
    return { success: false, error: body.message || `Resend API ${res.status}` };
  }

  return { success: true, resend_id: body.id };
}

/**
 * Build the personalized activation email HTML.
 * Short, personal, from Stojan. Links to /dashboard/onboarding.
 */
function buildActivationEmailHtml(firstName) {
  const name = firstName || 'there';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app';
  const onboardingUrl = `${appUrl}/dashboard/onboarding`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: #ffffff; border-radius: 8px; padding: 40px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <p style="font-size: 17px; color: #1f2937; margin: 0 0 16px;">Hi ${name},</p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      I'm Stojan, the founder of LeadFlow AI. I noticed you signed up but haven't had a chance to see your first AI lead response yet.
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      It takes about 2 minutes to connect your CRM — and then LeadFlow responds to every new lead in under 30 seconds, 24/7.
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 24px;">
      I'd love to help you get set up. Click below to pick up where you left off:
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${onboardingUrl}"
         style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Complete Setup (2 min) &rarr;
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">
      If you have any questions, just reply to this email — it comes straight to me.
    </p>

    <p style="font-size: 14px; color: #4b5563; margin: 16px 0 0;">
      — Stojan<br>
      <span style="color: #6b7280;">Founder, LeadFlow AI</span>
    </p>
  </div>
</body>
</html>`;
}

// ─── GET /api/admin/activation-list ───────────────────────────────────────────
// Returns verified, non-onboarded agents. ?format=csv for CSV export.
router.get('/api/admin/activation-list', async (req, res) => {
  if (!verifyAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sql = `
    SELECT
      id,
      email,
      first_name,
      last_name,
      created_at,
      utm_source,
      EXTRACT(DAY FROM (NOW() - created_at))::integer AS days_since_signup,
      activation_email_sent
    FROM real_estate_agents
    WHERE email_verified = true
      AND onboarding_completed = false
    ORDER BY created_at ASC
  `;

  try {
    const pool = getPool();
    const { rows } = await pool.query(sql);

    // CSV export
    if (req.query.format === 'csv') {
      const header = 'id,email,first_name,last_name,created_at,utm_source,days_since_signup,activation_email_sent';
      const csvRows = rows.map(r => {
        const createdAt = r.created_at ? new Date(r.created_at).toISOString() : '';
        return [
          r.id,
          `"${(r.email || '').replace(/"/g, '""')}"`,
          `"${(r.first_name || '').replace(/"/g, '""')}"`,
          `"${(r.last_name || '').replace(/"/g, '""')}"`,
          createdAt,
          r.utm_source || '',
          r.days_since_signup,
          r.activation_email_sent,
        ].join(',');
      });

      const csv = [header, ...csvRows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="activation-list.csv"');
      return res.send(csv);
    }

    // JSON response
    return res.json({
      total: rows.length,
      not_yet_emailed: rows.filter(r => !r.activation_email_sent).length,
      already_emailed: rows.filter(r => r.activation_email_sent).length,
      as_of: new Date().toISOString(),
      agents: rows.map(r => ({
        id: r.id,
        email: r.email,
        first_name: r.first_name,
        last_name: r.last_name,
        created_at: r.created_at,
        utm_source: r.utm_source,
        days_since_signup: r.days_since_signup,
        activation_email_sent: r.activation_email_sent,
      })),
    });
  } catch (err) {
    console.error('[activation-outreach] list error:', err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// ─── POST /api/admin/send-activation-email ────────────────────────────────────
// Sends a personalized email to a single agent. Body: { agent_id: "uuid" }
router.post('/api/admin/send-activation-email', async (req, res) => {
  if (!verifyAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { agent_id } = req.body || {};
  if (!agent_id) {
    return res.status(400).json({ error: 'agent_id is required' });
  }

  try {
    const pool = getPool();

    // Fetch the agent
    const { rows } = await pool.query(
      `SELECT id, email, first_name, email_verified, onboarding_completed, activation_email_sent
       FROM real_estate_agents WHERE id = $1`,
      [agent_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = rows[0];

    if (!agent.email_verified) {
      return res.status(400).json({ error: 'Agent email is not verified' });
    }

    if (agent.onboarding_completed) {
      return res.status(400).json({ error: 'Agent has already completed onboarding' });
    }

    // Send the personalized email
    const fromEmail = process.env.FROM_EMAIL || 'stojan@leadflow.ai';
    const result = await sendViaResend({
      to: agent.email,
      subject: 'Your LeadFlow setup — 2 minutes to first AI response',
      html: buildActivationEmailHtml(agent.first_name),
      from: `Stojan from LeadFlow <${fromEmail}>`,
    });

    if (!result.success) {
      return res.status(502).json({ error: 'Email send failed', detail: result.error });
    }

    // Mark activation_email_sent = true
    await pool.query(
      `UPDATE real_estate_agents SET activation_email_sent = true, updated_at = NOW() WHERE id = $1`,
      [agent_id]
    );

    return res.json({
      success: true,
      agent_id: agent.id,
      email: agent.email,
      resend_id: result.resend_id,
    });
  } catch (err) {
    console.error('[activation-outreach] send error:', err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

module.exports = router;
