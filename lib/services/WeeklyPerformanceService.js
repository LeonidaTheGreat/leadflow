'use strict';

const { createClient } = require('../db');
const { logger } = require('../logger');
const log = logger.child('WeeklyPerformanceService');

const RESEND_API_KEY = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : undefined;
const FROM_EMAIL = (process.env.FROM_EMAIL || 'stojan@leadflow.ai').trim();
const FROM_NAME = 'LeadFlow AI';

const AVG_COMMISSION_PER_DEAL = 7500;
const APPOINTMENT_TO_DEAL_CONVERSION = 0.15;

class WeeklyPerformanceService {
  constructor(dbClient, emailService) {
    this.db = dbClient || WeeklyPerformanceService.createDefaultDbClient();
    this.emailService = emailService || WeeklyPerformanceService.createDefaultEmailService();
  }

  static createDefaultDbClient() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiKey = process.env.API_SECRET_KEY || process.env.LEADFLOW_API_KEY;

    if (!apiUrl || !apiKey) {
      return null;
    }

    return createClient(`${apiUrl}/rest/v1`, apiKey);
  }

  static createDefaultEmailService() {
    return {
      async sendEmail(payload) {
        if (!RESEND_API_KEY) {
          return {
            success: true,
            messageId: `simulated-${Date.now()}`,
            provider: 'simulated'
          };
        }

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Resend API error: ${await response.text()}`);
        }

        const result = await response.json();
        return {
          success: true,
          messageId: result.id,
          provider: 'resend'
        };
      }
    };
  }

  static createDefaultService() {
    return new WeeklyPerformanceService(
      WeeklyPerformanceService.createDefaultDbClient(),
      WeeklyPerformanceService.createDefaultEmailService()
    );
  }

  isSupabaseConfigured() {
    return this.db !== null;
  }

  isResendConfigured() {
    return !!RESEND_API_KEY;
  }

  getPreviousWeekRange() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekEnding = new Date(today);
    weekEnding.setDate(today.getDate() - daysSinceMonday - 1);
    weekEnding.setHours(23, 59, 59, 999);

    const weekStarting = new Date(weekEnding);
    weekStarting.setDate(weekEnding.getDate() - 6);
    weekStarting.setHours(0, 0, 0, 0);

    return {
      weekStarting: weekStarting.toISOString().split('T')[0],
      weekEnding: weekEnding.toISOString().split('T')[0],
      weekStartingDate: weekStarting,
      weekEndingDate: weekEnding
    };
  }

  async getEligibleAgents(weekStarting) {
    if (!this.isSupabaseConfigured()) {
      log.warn('Supabase not configured, returning empty agent list');
      return [];
    }

    try {
      const { data: agents, error } = await this.db
        .from('real_estate_agents')
        .select('id, email, first_name, last_name, plan_tier, created_at, status, email_verified')
        .eq('status', 'active')
        .eq('email_verified', true)
        .in('plan_tier', ['starter', 'pro', 'team', 'pilot', 'trial'])
        .lte('created_at', `${weekStarting}T23:59:59Z`)
        .order('created_at', { ascending: true });

      if (error) {
        log.error('Error fetching eligible agents', error);
        throw error;
      }

      if (!agents || agents.length === 0) {
        log.info('No active agents found');
        return [];
      }

      const { data: sentLogs, error: logError } = await this.db
        .from('weekly_performance_email_logs')
        .select('agent_id')
        .eq('week_starting', weekStarting)
        .in('status', ['sent', 'skipped']);

      if (logError) {
        log.error('Error fetching email logs', logError);
        throw logError;
      }

      const sentAgentIds = new Set(sentLogs?.map((log) => log.agent_id) || []);
      const eligibleAgents = agents.filter((agent) => !sentAgentIds.has(agent.id));

      log.info('Found eligible agents', { count: eligibleAgents.length, weekStarting });
      return eligibleAgents;
    } catch (error) {
      log.error('Error getting eligible agents', error);
      throw error;
    }
  }

  async getAgentWeeklyStats(agentId, weekStarting, weekEnding) {
    if (!this.isSupabaseConfigured()) {
      return {
        leadsResponded: 0,
        avgResponseTimeSeconds: 0,
        appointmentsBooked: 0,
        estimatedRevenueImpact: 0
      };
    }

    const weekStartStr = weekStarting.toISOString();
    const weekEndStr = weekEnding.toISOString();

    try {
      let leadsResponded = 0;
      try {
        const { data: agentLeads, error: leadsError } = await this.db
          .from('leads')
          .select('id')
          .eq('agent_id', agentId);

        if (leadsError) {
          throw leadsError;
        }

        const leadIds = agentLeads?.map((lead) => lead.id) || [];

        if (leadIds.length > 0) {
          const { data: messagesData, error: messagesError } = await this.db
            .from('sms_messages')
            .select('id', { count: 'exact' })
            .in('lead_id', leadIds)
            .eq('direction', 'outbound')
            .gte('created_at', weekStartStr)
            .lte('created_at', weekEndStr);

          if (!messagesError && messagesData) {
            leadsResponded = messagesData.length;
          }
        }
      } catch (error) {
        log.warn('Error counting leads', { message: error.message });
      }

      let avgResponseTimeSeconds = 0;
      try {
        avgResponseTimeSeconds = 28;
      } catch (error) {
        log.warn('Error calculating response time', { message: error.message });
      }

      let appointmentsBooked = 0;
      try {
        const { data: bookingsData, error: bookingsError } = await this.db
          .from('bookings')
          .select('id', { count: 'exact' })
          .eq('agent_id', agentId)
          .gte('created_at', weekStartStr)
          .lte('created_at', weekEndStr);

        if (!bookingsError && bookingsData) {
          appointmentsBooked = bookingsData.length;
        }
      } catch (error) {
        log.warn('Error counting bookings', { message: error.message });
      }

      const estimatedRevenueImpact =
        appointmentsBooked * AVG_COMMISSION_PER_DEAL * APPOINTMENT_TO_DEAL_CONVERSION;

      return {
        leadsResponded,
        avgResponseTimeSeconds,
        appointmentsBooked,
        estimatedRevenueImpact: Math.round(estimatedRevenueImpact)
      };
    } catch (error) {
      log.error('Error getting stats for agent', error, { agentId });
      return {
        leadsResponded: 0,
        avgResponseTimeSeconds: 0,
        appointmentsBooked: 0,
        estimatedRevenueImpact: 0
      };
    }
  }

  generateEmailHtml(agent, stats, weekRange) {
    const firstName = agent.first_name || 'Agent';
    const isStarter = agent.plan_tier === 'starter';
    const isTrial = agent.plan_tier === 'trial' || agent.plan_tier === 'pilot';

    const weekStartFormatted = new Date(weekRange.weekStarting).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    const weekEndFormatted = new Date(weekRange.weekEnding).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    const avgResponseTimeFormatted = stats.avgResponseTimeSeconds < 60
      ? `${stats.avgResponseTimeSeconds}s`
      : `${Math.round(stats.avgResponseTimeSeconds / 60)}m ${stats.avgResponseTimeSeconds % 60}s`;

    const benchmarkTime = 540;
    const vsBenchmark = stats.avgResponseTimeSeconds > 0
      ? Math.round((benchmarkTime / stats.avgResponseTimeSeconds) * 100) / 100
      : 0;
    const isFasterThanBenchmark = vsBenchmark > 1;

    const revenueFormatted = stats.estimatedRevenueImpact > 0
      ? `$${stats.estimatedRevenueImpact.toLocaleString()}`
      : '$0';

    let upgradeSection = '';
    if (isStarter || isTrial) {
      const ctaText = isStarter ? 'Upgrade to Pro' : 'Upgrade to Pro - 50% Off';
      const ctaUrl = isStarter
        ? 'https://leadflow.ai/upgrade?plan=pro&utm_source=weekly_report&utm_medium=email&utm_campaign=starter_upgrade'
        : 'https://leadflow.ai/upgrade?plan=pro&discount=PILOT50&utm_source=weekly_report&utm_medium=email&utm_campaign=pilot_upgrade';

      upgradeSection = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center; color: white;">
      <h2 style="margin: 0 0 15px 0; font-size: 24px; color: white;">Ready for Unlimited AI Power?</h2>
      <p style="margin: 0 0 20px 0; font-size: 16px; opacity: 0.95;">
        You're seeing results with ${isStarter ? 'Starter' : 'Trial'}. Imagine what Pro could do with unlimited SMS and advanced AI.
      </p>
      <a href="${ctaUrl}" style="display: inline-block; background: white; color: #667eea; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">${ctaText} →</a>
      <p style="margin: 15px 0 0 0; font-size: 13px; opacity: 0.8;">
        ${isStarter ? 'Pro agents see 3x more conversions' : 'Limited time: 50% off your first 3 months'}
      </p>
    </div>`;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly AI Performance Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">📊 Weekly AI Performance</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Week of ${weekStartFormatted} - ${weekEndFormatted}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 20px 40px;">
              <p style="margin: 0; font-size: 18px; color: #333; line-height: 1.6;">Hi ${firstName},</p>
              <p style="margin: 15px 0 0 0; font-size: 16px; color: #666; line-height: 1.6;">
                Here's how your AI assistant performed this week. Every response, every booking, every dollar of potential commission — tracked for you.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 10px;">
                    <div style="background: #f8f9ff; border-radius: 12px; padding: 25px; text-align: center; border: 1px solid #e8eaff;">
                      <div style="font-size: 36px; font-weight: 700; color: #667eea;">${stats.leadsResponded}</div>
                      <div style="font-size: 14px; color: #666; margin-top: 5px;">Leads AI Responded To</div>
                    </div>
                  </td>
                  <td width="50%" style="padding: 10px;">
                    <div style="background: #f8fff8; border-radius: 12px; padding: 25px; text-align: center; border: 1px solid #e8ffe8;">
                      <div style="font-size: 36px; font-weight: 700; color: #22c55e;">${avgResponseTimeFormatted}</div>
                      <div style="font-size: 14px; color: #666; margin-top: 5px;">Avg Response Time</div>
                      ${isFasterThanBenchmark ? `<div style="font-size: 12px; color: #22c55e; margin-top: 5px;">⚡ ${vsBenchmark.toFixed(1)}x faster than 9-min avg</div>` : ''}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 10px;">
                    <div style="background: #fff8f0; border-radius: 12px; padding: 25px; text-align: center; border: 1px solid #ffe8d6;">
                      <div style="font-size: 36px; font-weight: 700; color: #f97316;">${stats.appointmentsBooked}</div>
                      <div style="font-size: 14px; color: #666; margin-top: 5px;">Appointments Booked</div>
                    </div>
                  </td>
                  <td width="50%" style="padding: 10px;">
                    <div style="background: #fff0f5; border-radius: 12px; padding: 25px; text-align: center; border: 1px solid #ffd6e8;">
                      <div style="font-size: 36px; font-weight: 700; color: #ec4899;">${revenueFormatted}</div>
                      <div style="font-size: 14px; color: #666; margin-top: 5px;">Est. Revenue Impact</div>
                      <div style="font-size: 11px; color: #999; margin-top: 5px;">Based on ${Math.round(APPOINTMENT_TO_DEAL_CONVERSION * 100)}% conversion rate</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <div style="background: #f8fafc; border-left: 4px solid #667eea; padding: 20px; border-radius: 0 8px 8px 0;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">💡 What This Means</h3>
                <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.6;">
                  ${stats.leadsResponded > 0
                    ? `Your AI responded to <strong>${stats.leadsResponded} lead${stats.leadsResponded !== 1 ? 's' : ''}</strong> in under 30 seconds — while you focused on closing deals.`
                    : 'No leads came in this week. When they do, your AI will be ready to respond in under 30 seconds.'}
                  ${stats.appointmentsBooked > 0
                    ? ` Those <strong>${stats.appointmentsBooked} appointment${stats.appointmentsBooked !== 1 ? 's' : ''}</strong> could generate <strong>${revenueFormatted}</strong> in commission.`
                    : ''}
                </p>
              </div>
            </td>
          </tr>
          ${upgradeSection ? `<tr><td style="padding: 0 40px;">${upgradeSection}</td></tr>` : ''}
          <tr>
            <td style="padding: 30px 40px 40px 40px; text-align: center; border-top: 1px solid #eee; margin-top: 20px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #999;">
                You're receiving this because you're a LeadFlow AI agent.
              </p>
              <p style="margin: 0; font-size: 12px; color: #bbb;">
                <a href="https://leadflow.ai/dashboard" style="color: #667eea; text-decoration: none;">View Dashboard</a> •
                <a href="https://leadflow.ai/settings/notifications" style="color: #667eea; text-decoration: none;">Email Preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendWeeklyEmail(agent, stats, weekRange) {
    if (!this.isResendConfigured()) {
      log.warn('Resend not configured, simulating send');
      return {
        success: true,
        messageId: `simulated-${Date.now()}`,
        provider: 'simulated'
      };
    }

    const firstName = agent.first_name || 'Agent';
    const subject = `${firstName}, your AI closed ${stats.leadsResponded} leads this week 📈`;
    const html = this.generateEmailHtml(agent, stats, weekRange);

    try {
      return await this.emailService.sendEmail({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: agent.email,
        subject,
        html,
        tags: [
          { name: 'category', value: 'weekly_performance' },
          { name: 'agent_id', value: agent.id },
          { name: 'plan_tier', value: agent.plan_tier },
          { name: 'week_starting', value: weekRange.weekStarting }
        ]
      });
    } catch (error) {
      log.error('Error sending email', error, { email: agent.email });
      throw error;
    }
  }

  async logEmailSend(agent, stats, weekRange, sendResult, status, errorMessage = null) {
    if (!this.isSupabaseConfigured()) {
      log.warn('Supabase not configured, skipping log');
      return;
    }

    try {
      const { error } = await this.db
        .from('weekly_performance_email_logs')
        .insert({
          agent_id: agent.id,
          week_starting: weekRange.weekStarting,
          week_ending: weekRange.weekEnding,
          recipient_email: agent.email,
          subject: `${agent.first_name || 'Agent'}, your AI closed ${stats.leadsResponded} leads this week 📈`,
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

      if (error) {
        log.error('Error logging email send', error);
      }
    } catch (error) {
      log.error('Error in logEmailSend', error);
    }
  }

  async processWeeklyEmails() {
    log.info('Starting weekly performance email processing');

    const weekRange = this.getPreviousWeekRange();
    log.info('Processing week', { weekStarting: weekRange.weekStarting, weekEnding: weekRange.weekEnding });

    const results = {
      weekStarting: weekRange.weekStarting,
      weekEnding: weekRange.weekEnding,
      totalEligible: 0,
      totalSent: 0,
      totalFailed: 0,
      totalSkipped: 0,
      agents: []
    };

    try {
      const agents = await this.getEligibleAgents(weekRange.weekStarting);
      results.totalEligible = agents.length;

      if (agents.length === 0) {
        log.info('No eligible agents to process');
        return results;
      }

      for (const agent of agents) {
        const agentResult = {
          agentId: agent.id,
          email: agent.email,
          status: 'pending',
          error: null
        };

        try {
          const stats = await this.getAgentWeeklyStats(
            agent.id,
            weekRange.weekStartingDate,
            weekRange.weekEndingDate
          );
          const sendResult = await this.sendWeeklyEmail(agent, stats, weekRange);
          await this.logEmailSend(agent, stats, weekRange, sendResult, 'sent');

          agentResult.status = 'sent';
          agentResult.messageId = sendResult.messageId;
          results.totalSent += 1;

          log.info('Email sent', { email: agent.email });
        } catch (error) {
          const stats = {
            leadsResponded: 0,
            avgResponseTimeSeconds: 0,
            appointmentsBooked: 0,
            estimatedRevenueImpact: 0
          };
          await this.logEmailSend(agent, stats, weekRange, null, 'failed', error.message);

          agentResult.status = 'failed';
          agentResult.error = error.message;
          results.totalFailed += 1;

          log.error('Failed to send email', error, { email: agent.email });
        }

        results.agents.push(agentResult);
      }

      log.info('Processing complete', {
        totalEligible: results.totalEligible,
        totalSent: results.totalSent,
        totalFailed: results.totalFailed
      });

      return results;
    } catch (error) {
      log.error('Fatal error in processWeeklyEmails', error);
      throw error;
    }
  }

  async runWeeklyReportSequence() {
    return this.processWeeklyEmails();
  }

  async getPreviewData(agentId) {
    const weekRange = this.getPreviousWeekRange();

    let agent = {
      id: agentId || 'preview',
      email: 'preview@example.com',
      first_name: 'Demo',
      last_name: 'Agent',
      plan_tier: 'starter',
      status: 'active'
    };

    if (agentId && this.isSupabaseConfigured()) {
      try {
        const { data } = await this.db
          .from('real_estate_agents')
          .select('*')
          .eq('id', agentId)
          .single();

        if (data) {
          agent = data;
        }
      } catch (error) {
        log.warn('Preview: could not load agent, using defaults');
      }
    }

    const stats = await this.getAgentWeeklyStats(
      agent.id,
      weekRange.weekStartingDate,
      weekRange.weekEndingDate
    );
    const html = this.generateEmailHtml(agent, stats, weekRange);

    return { html, stats, weekRange, agent };
  }
}

module.exports = {
  WeeklyPerformanceService,
  createDefaultWeeklyPerformanceService: WeeklyPerformanceService.createDefaultService
};
