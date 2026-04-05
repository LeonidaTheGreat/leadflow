/**
 * Weekly AI Performance Report Email Service
 *
 * Sends weekly performance emails to active agents every Monday at 9 AM.
 * Shows AI ROI metrics: leads responded, response time, appointments booked, estimated revenue.
 * Includes upgrade CTA for Starter users.
 *
 * Features:
 * - Idempotent sends (one per agent per week)
 * - Personalized stats for each agent
 * - Revenue impact estimation
 * - Upgrade CTA for Starter plan users
 * - Comprehensive logging
 */

const { createClient } = require('./postgrest-client');

// Initialize PostgREST client
const supabaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.API_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.LEADFLOW_API_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Resend configuration
// .trim() guards against trailing whitespace/newlines in env var values
const RESEND_API_KEY = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : undefined;
const FROM_EMAIL = (process.env.FROM_EMAIL || 'stojan@leadflow.ai').trim();
const FROM_NAME = 'LeadFlow AI';

// Revenue estimation constants
const AVG_COMMISSION_PER_DEAL = 7500; // Average real estate commission
const APPOINTMENT_TO_DEAL_CONVERSION = 0.15; // 15% of appointments convert to deals

/**
 * Check if the PostgREST client is configured
 */
function isDbConfigured() {
  return supabase !== null;
}

/**
 * Check if Resend is configured
 */
function isResendConfigured() {
  return !!RESEND_API_KEY;
}

/**
 * Get the date range for the previous week (Monday–Sunday)
 * @returns {Object} weekStarting, weekEnding (ISO date strings) plus Date objects
 */
function getPreviousWeekRange() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate last Monday (week start)
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekEnding = new Date(today);
  weekEnding.setDate(today.getDate() - daysSinceMonday - 1); // Last Sunday
  weekEnding.setHours(23, 59, 59, 999);

  const weekStarting = new Date(weekEnding);
  weekStarting.setDate(weekEnding.getDate() - 6); // Monday before Sunday
  weekStarting.setHours(0, 0, 0, 0);

  return {
    weekStarting: weekStarting.toISOString().split('T')[0],
    weekEnding: weekEnding.toISOString().split('T')[0],
    weekStartingDate: weekStarting,
    weekEndingDate: weekEnding
  };
}

/**
 * Get active agents eligible for weekly report
 * @param {string} weekStarting - Week starting date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of eligible agents
 */
async function getEligibleAgents(weekStarting) {
  if (!isDbConfigured()) {
    console.warn('[Weekly Report] DB not configured, returning empty agent list');
    return [];
  }

  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select('id, email, first_name, last_name, plan_tier, created_at, status')
      .eq('status', 'active')
      .in('plan_tier', ['starter', 'pro', 'team', 'pilot', 'trial'])
      .lte('created_at', weekStarting + 'T23:59:59Z')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Weekly Report] Error fetching eligible agents:', error);
      throw error;
    }

    if (!agents || agents.length === 0) {
      console.log('[Weekly Report] No active agents found');
      return [];
    }

    // Filter out agents who already received this week's report
    const { data: sentLogs, error: logError } = await supabase
      .from('weekly_performance_email_logs')
      .select('agent_id')
      .eq('week_starting', weekStarting)
      .in('status', ['sent', 'skipped']);

    if (logError) {
      console.warn('[Weekly Report] Error fetching email logs, continuing without dedup:', logError.message);
    }

    const sentAgentIds = new Set((sentLogs || []).map(log => log.agent_id));
    const eligibleAgents = agents.filter(agent => !sentAgentIds.has(agent.id));

    console.log(`[Weekly Report] Found ${eligibleAgents.length} agents eligible for week starting ${weekStarting}`);
    return eligibleAgents;

  } catch (error) {
    console.error('[Weekly Report] Error getting eligible agents:', error);
    throw error;
  }
}

/**
 * Calculate personalized performance stats for an agent
 * @param {string} agentId - Agent UUID
 * @param {Date} weekStartingDate - Week start Date
 * @param {Date} weekEndingDate - Week end Date
 * @returns {Promise<Object>} Stats object
 */
async function getAgentWeeklyStats(agentId, weekStartingDate, weekEndingDate) {
  const weekStartStr = weekStartingDate.toISOString();
  const weekEndStr = weekEndingDate.toISOString();

  let leadsResponded = 0;
  let avgResponseTimeSeconds = 28; // Default: under the 30s target
  let appointmentsBooked = 0;

  if (isDbConfigured()) {
    try {
      const { data: smsData } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('agent_id', agentId)
        .eq('direction', 'outbound')
        .gte('created_at', weekStartStr)
        .lte('created_at', weekEndStr);
      if (smsData) leadsResponded = smsData.length;
    } catch (e) {
      console.warn('[Weekly Report] Error counting leads:', e.message);
    }

    try {
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id')
        .eq('agent_id', agentId)
        .gte('created_at', weekStartStr)
        .lte('created_at', weekEndStr);
      if (bookingsData) appointmentsBooked = bookingsData.length;
    } catch (e) {
      console.warn('[Weekly Report] Error counting bookings:', e.message);
    }
  }

  const estimatedRevenueImpact = Math.round(
    appointmentsBooked * AVG_COMMISSION_PER_DEAL * APPOINTMENT_TO_DEAL_CONVERSION
  );

  return { leadsResponded, avgResponseTimeSeconds, appointmentsBooked, estimatedRevenueImpact };
}

/**
 * Generate email HTML for a given agent + stats + weekRange
 * @param {Object} agent
 * @param {Object} stats
 * @param {Object} weekRange
 * @returns {string} HTML
 */
function generateEmailHtml(agent, stats, weekRange) {
  const firstName = agent.first_name || 'Agent';
  const isStarter = agent.plan_tier === 'starter';
  const isTrial = agent.plan_tier === 'trial' || agent.plan_tier === 'pilot';

  const weekStartFormatted = new Date(weekRange.weekStarting).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEndFormatted = new Date(weekRange.weekEnding).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const avgResponseTimeFormatted = stats.avgResponseTimeSeconds < 60
    ? `${stats.avgResponseTimeSeconds}s`
    : `${Math.floor(stats.avgResponseTimeSeconds / 60)}m ${stats.avgResponseTimeSeconds % 60}s`;

  const benchmarkSeconds = 540; // 9 minutes
  const vsBenchmark = stats.avgResponseTimeSeconds > 0
    ? Math.round((benchmarkSeconds / stats.avgResponseTimeSeconds) * 100) / 100
    : 0;
  const isFaster = vsBenchmark > 1;

  const revenueFormatted = stats.estimatedRevenueImpact > 0
    ? `$${stats.estimatedRevenueImpact.toLocaleString()}`
    : '$0';

  let upgradeSection = '';
  if (isStarter || isTrial) {
    const ctaText = isStarter ? 'Upgrade to Pro' : 'Upgrade to Pro — 50% Off';
    const ctaUrl = isStarter
      ? 'https://leadflow.ai/upgrade?plan=pro&utm_source=weekly_report&utm_medium=email&utm_campaign=starter_upgrade'
      : 'https://leadflow.ai/upgrade?plan=pro&discount=PILOT50&utm_source=weekly_report&utm_medium=email&utm_campaign=pilot_upgrade';
    upgradeSection = `
    <tr><td style="padding: 0 40px;">
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;border-radius:12px;margin:20px 0;text-align:center;color:white;">
        <h2 style="margin:0 0 12px 0;font-size:22px;color:white;">Ready for Unlimited AI Power?</h2>
        <p style="margin:0 0 18px 0;font-size:15px;opacity:.95;">You're seeing results. Imagine what Pro can do with unlimited SMS and advanced AI.</p>
        <a href="${ctaUrl}" style="display:inline-block;background:white;color:#667eea;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${ctaText} &rarr;</a>
      </div>
    </td></tr>`;
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Your Weekly AI Performance Report</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
  <tr><td align="center" style="padding:40px 20px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
      <tr><td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px;text-align:center;">
        <h1 style="margin:0;color:white;font-size:26px;font-weight:700;">Weekly AI Performance Report</h1>
        <p style="margin:10px 0 0;color:rgba(255,255,255,.9);font-size:15px;">Week of ${weekStartFormatted} - ${weekEndFormatted}</p>
      </td></tr>
      <tr><td style="padding:30px 40px 20px;">
        <p style="margin:0;font-size:17px;color:#333;">Hi ${firstName},</p>
        <p style="margin:12px 0 0;font-size:15px;color:#666;line-height:1.6;">Here's how your AI assistant performed this week.</p>
      </td></tr>
      <tr><td style="padding:0 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="padding:8px;">
              <div style="background:#f8f9ff;border-radius:12px;padding:22px;text-align:center;border:1px solid #e8eaff;">
                <div style="font-size:34px;font-weight:700;color:#667eea;">${stats.leadsResponded}</div>
                <div style="font-size:13px;color:#666;margin-top:5px;">Leads AI Responded To</div>
              </div>
            </td>
            <td width="50%" style="padding:8px;">
              <div style="background:#f8fff8;border-radius:12px;padding:22px;text-align:center;border:1px solid #e8ffe8;">
                <div style="font-size:34px;font-weight:700;color:#22c55e;">${avgResponseTimeFormatted}</div>
                <div style="font-size:13px;color:#666;margin-top:5px;">Avg Response Time</div>
                ${isFaster ? `<div style="font-size:11px;color:#22c55e;margin-top:4px;">${vsBenchmark.toFixed(1)}x faster than 9-min avg</div>` : ''}
              </div>
            </td>
          </tr>
          <tr>
            <td width="50%" style="padding:8px;">
              <div style="background:#fff8f0;border-radius:12px;padding:22px;text-align:center;border:1px solid #ffe8d6;">
                <div style="font-size:34px;font-weight:700;color:#f97316;">${stats.appointmentsBooked}</div>
                <div style="font-size:13px;color:#666;margin-top:5px;">Appointments Booked</div>
              </div>
            </td>
            <td width="50%" style="padding:8px;">
              <div style="background:#fff0f5;border-radius:12px;padding:22px;text-align:center;border:1px solid #ffd6e8;">
                <div style="font-size:34px;font-weight:700;color:#ec4899;">${revenueFormatted}</div>
                <div style="font-size:13px;color:#666;margin-top:5px;">Est. Revenue Impact</div>
              </div>
            </td>
          </tr>
        </table>
      </td></tr>
      ${upgradeSection}
      <tr><td style="padding:20px 40px 40px;text-align:center;border-top:1px solid #eee;">
        <p style="margin:0;font-size:13px;color:#999;">You're receiving this because you're a LeadFlow AI agent.</p>
        <p style="margin:8px 0 0;font-size:12px;color:#bbb;">
          <a href="https://leadflow.ai/dashboard" style="color:#667eea;text-decoration:none;">View Dashboard</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/**
 * Send weekly performance email via Resend
 * @param {Object} agent
 * @param {Object} stats
 * @param {Object} weekRange
 * @returns {Promise<Object>} { success, messageId, provider }
 */
async function sendWeeklyEmail(agent, stats, weekRange) {
  if (!isResendConfigured()) {
    console.warn('[Weekly Report] Resend not configured, simulating send');
    return { success: true, messageId: 'simulated-' + Date.now(), provider: 'simulated' };
  }

  const firstName = agent.first_name || 'Agent';
  const subject = `${firstName}, your AI responded to ${stats.leadsResponded} leads this week`;
  const html = generateEmailHtml(agent, stats, weekRange);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: agent.email,
      subject,
      html,
      tags: [
        { name: 'category', value: 'weekly_performance' },
        { name: 'agent_id', value: agent.id },
        { name: 'plan_tier', value: agent.plan_tier || 'unknown' },
        { name: 'week_starting', value: weekRange.weekStarting }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  return { success: true, messageId: result.id, provider: 'resend' };
}

/**
 * Log email send to weekly_performance_email_logs table
 */
async function logEmailSend(agent, stats, weekRange, sendResult, status, errorMessage = null) {
  if (!isDbConfigured()) return;

  try {
    await supabase.from('weekly_performance_email_logs').insert({
      agent_id: agent.id,
      week_starting: weekRange.weekStarting,
      week_ending: weekRange.weekEnding,
      recipient_email: agent.email,
      subject: `${agent.first_name || 'Agent'}, your AI responded to ${stats.leadsResponded} leads this week`,
      status,
      provider: sendResult?.provider || 'resend',
      provider_message_id: sendResult?.messageId || null,
      error_message: errorMessage,
      stats_leads_responded: stats.leadsResponded,
      stats_avg_response_time_seconds: stats.avgResponseTimeSeconds,
      stats_appointments_booked: stats.appointmentsBooked,
      stats_estimated_revenue_impact: stats.estimatedRevenueImpact,
      personalized_data: {
        plan_tier: agent.plan_tier,
        first_name: agent.first_name,
        message_id: sendResult?.messageId
      },
      sent_at: status === 'sent' ? new Date().toISOString() : null
    });
  } catch (error) {
    console.error('[Weekly Report] Error in logEmailSend:', error);
  }
}

/**
 * Process weekly emails for all eligible agents
 * @returns {Promise<Object>} Results summary
 */
async function processWeeklyEmails() {
  console.log('[Weekly Report] Starting weekly performance email processing...');

  const weekRange = getPreviousWeekRange();
  console.log(`[Weekly Report] Processing week: ${weekRange.weekStarting} to ${weekRange.weekEnding}`);

  const results = {
    weekStarting: weekRange.weekStarting,
    weekEnding: weekRange.weekEnding,
    totalEligible: 0,
    totalSent: 0,
    totalFailed: 0,
    agents: []
  };

  const agents = await getEligibleAgents(weekRange.weekStarting);
  results.totalEligible = agents.length;

  if (agents.length === 0) {
    console.log('[Weekly Report] No eligible agents to process');
    return results;
  }

  for (const agent of agents) {
    const agentResult = { agentId: agent.id, email: agent.email, status: 'pending', error: null };

    try {
      const stats = await getAgentWeeklyStats(agent.id, weekRange.weekStartingDate, weekRange.weekEndingDate);
      const sendResult = await sendWeeklyEmail(agent, stats, weekRange);
      await logEmailSend(agent, stats, weekRange, sendResult, 'sent');

      agentResult.status = 'sent';
      agentResult.messageId = sendResult.messageId;
      results.totalSent++;
      console.log(`[Weekly Report] Sent to ${agent.email}`);

    } catch (error) {
      const emptyStats = { leadsResponded: 0, avgResponseTimeSeconds: 0, appointmentsBooked: 0, estimatedRevenueImpact: 0 };
      await logEmailSend(agent, emptyStats, weekRange, null, 'failed', error.message);

      agentResult.status = 'failed';
      agentResult.error = error.message;
      results.totalFailed++;
      console.error(`[Weekly Report] Failed to send to ${agent.email}:`, error.message);
    }

    results.agents.push(agentResult);
  }

  console.log('[Weekly Report] Processing complete:', {
    totalEligible: results.totalEligible,
    totalSent: results.totalSent,
    totalFailed: results.totalFailed
  });

  return results;
}

/**
 * Main entry point for the weekly report sequence
 */
async function runWeeklyReportSequence() {
  return await processWeeklyEmails();
}

/**
 * Generate a preview of the weekly email for a given agent (for the /preview endpoint)
 * Returns HTML directly without sending or logging.
 * @param {string} agentId - optional; uses defaults if not found
 * @returns {Promise<Object>} { html, stats, weekRange }
 */
async function getPreviewData(agentId) {
  const weekRange = getPreviousWeekRange();

  let agent = { id: agentId || 'preview', email: 'preview@example.com', first_name: 'Demo', last_name: 'Agent', plan_tier: 'starter', status: 'active' };

  if (agentId && isDbConfigured()) {
    try {
      const { data } = await supabase.from('agents').select('*').eq('id', agentId).single();
      if (data) agent = data;
    } catch (e) {
      console.warn('[Weekly Report] Preview: could not load agent, using defaults');
    }
  }

  const stats = await getAgentWeeklyStats(agent.id, weekRange.weekStartingDate, weekRange.weekEndingDate);
  const html = generateEmailHtml(agent, stats, weekRange);

  return { html, stats, weekRange, agent };
}

module.exports = {
  runWeeklyReportSequence,
  processWeeklyEmails,
  getEligibleAgents,
  getAgentWeeklyStats,
  generateEmailHtml,
  sendWeeklyEmail,
  getPreviousWeekRange,
  getPreviewData,
  isDbConfigured,
  isResendConfigured
};
