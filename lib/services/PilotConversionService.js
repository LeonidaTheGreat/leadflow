'use strict';

const { logger } = require('../logger');
const log = logger.child('PilotConversionService');
const { breakers, withRetry } = require('../utils/circuit-breaker');

/**
 * PilotConversionService — Pilot-to-Paid Conversion Email Service
 *
 * Handles the automated email sequence to convert pilot agents to paid Pro plan:
 * - Day 30: Midpoint value recap + upgrade offer
 * - Day 45: ROI recap + urgency
 * - Day 55: Final warning (5 days left)
 *
 * Features:
 * - Idempotent sends (one per milestone per agent)
 * - Stop-on-upgrade logic
 * - Personalized stats in each email
 */

const MILESTONES = {
  day_30: {
    days: 30,
    subject: "{{firstName}}, you're halfway through your pilot — here's what you've achieved 🚀",
    template: 'day30_midpoint'
  },
  day_45: {
    days: 45,
    subject: "{{firstName}}, only 15 days left — don't lose your AI advantage ⏰",
    template: 'day45_urgent'
  },
  day_55: {
    days: 55,
    subject: '{{firstName}}, 5 days left: Secure your Pro access now ⚠️',
    template: 'day55_final'
  }
};

class PilotConversionService {
  /**
   * @param {Object} [options]
   * @param {Object} [options.db]           - PostgREST client
   * @param {string} [options.resendApiKey] - Resend API key
   * @param {string} [options.fromEmail]    - Sender email
   * @param {string} [options.fromName]     - Sender name
   * @param {string} [options.appUrl]       - Base app URL for checkout links
   */
  constructor(options = {}) {
    this.db = options.db || null;
    this.resendApiKey = options.resendApiKey
      || (process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : undefined);
    this.fromEmail = (options.fromEmail || process.env.FROM_EMAIL || 'stojan@leadflow.ai').trim();
    this.fromName = options.fromName || 'LeadFlow';
    this.appUrl = options.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app';
  }

  isDbConfigured() { return this.db !== null; }
  isResendConfigured() { return !!this.resendApiKey; }

  async getEligibleAgents(milestone) {
    if (!this.isDbConfigured()) { log.warn('DB not configured'); return []; }
    const config = MILESTONES[milestone];
    if (!config) throw new Error(`Invalid milestone: ${milestone}`);

    const { data: agents, error } = await this.db
      .from('real_estate_agents')
      .select('id, email, first_name, last_name, plan_tier, pilot_started_at, stripe_customer_id')
      .eq('plan_tier', 'pilot')
      .not('pilot_started_at', 'is', null)
      .lte('pilot_started_at', new Date(Date.now() - config.days * 24 * 60 * 60 * 1000).toISOString())
      .order('pilot_started_at', { ascending: true });

    if (error) { log.error('Error fetching eligible agents', error instanceof Error ? error : new Error(String(error))); throw error; }
    if (!agents || agents.length === 0) return [];

    const { data: sentLogs, error: logError } = await this.db
      .from('pilot_conversion_email_logs')
      .select('agent_id, milestone')
      .in('agent_id', agents.map(a => a.id))
      .eq('milestone', milestone)
      .in('status', ['sent', 'skipped']);

    if (logError) { log.error('Error fetching email logs', logError instanceof Error ? logError : new Error(String(logError))); throw logError; }
    const sentAgentIds = new Set(sentLogs?.map(entry => entry.agent_id) || []);
    const eligibleAgents = agents.filter(agent => !sentAgentIds.has(agent.id));
    log.info('Found agents eligible for milestone', { count: eligibleAgents.length, milestone });
    return eligibleAgents;
  }

  async getAgentStats(agentId) {
    if (!this.isDbConfigured()) return { leadsResponded: 0, avgResponseTime: 'N/A', appointmentsBooked: 0 };

    try {
      let leadsData = [];
      try {
        const result = await this.db.from('leads').select('id, responded_at, created_at').eq('agent_id', agentId).not('responded_at', 'is', null);
        leadsData = result.data || [];
      } catch (e) { leadsData = []; }

      const leadsResponded = leadsData.length;
      let avgResponseTime = 'N/A';
      if (leadsData.length > 0) {
        const times = leadsData.filter(l => l.responded_at && l.created_at).map(l => (new Date(l.responded_at) - new Date(l.created_at)) / 1000);
        if (times.length > 0) {
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          avgResponseTime = avg < 60 ? `${Math.round(avg)} seconds` : avg < 3600 ? `${Math.round(avg / 60)} minutes` : `${(avg / 3600).toFixed(1)} hours`;
        }
      }

      let appointmentsBooked = 0;
      try {
        const result = await this.db.from('bookings').select('id').eq('agent_id', agentId);
        appointmentsBooked = result.data?.length || 0;
      } catch (e) { appointmentsBooked = 0; }

      return { leadsResponded, avgResponseTime, appointmentsBooked };
    } catch (error) {
      log.error('Error getting stats for agent', error, { agentId });
      return { leadsResponded: 0, avgResponseTime: 'N/A', appointmentsBooked: 0 };
    }
  }

  async hasAgentUpgraded(agentId) {
    if (!this.isDbConfigured()) return false;
    try {
      const { data, error } = await this.db.from('real_estate_agents').select('plan_tier').eq('id', agentId).single();
      if (error) { log.error('Error checking agent plan tier', error, { agentId }); return false; }
      return data && data.plan_tier !== 'pilot';
    } catch (error) { log.error('Error in hasAgentUpgraded', error, { agentId }); return false; }
  }

  generateCheckoutUrl(agent) {
    return `${this.appUrl}/billing/upgrade?agent=${agent.id}&plan=pro&source=pilot_conversion`;
  }

  renderTemplate(template, agent, stats, checkoutUrl) {
    const firstName = agent.name ? agent.name.split(' ')[0] : 'there';
    const templates = {
      day30_midpoint: {
        html: `<html><body><h1>You're Halfway There!</h1><p>Hi ${firstName},</p><p>Leads: ${stats.leadsResponded}, Avg: ${stats.avgResponseTime}, Appointments: ${stats.appointmentsBooked}</p><a href="${checkoutUrl}">Upgrade to Pro</a></body></html>`,
        text: `Hi ${firstName},\nLeads Responded: ${stats.leadsResponded}\nAvg Response: ${stats.avgResponseTime}\nAppointments: ${stats.appointmentsBooked}\nUpgrade: ${checkoutUrl}`
      },
      day45_urgent: {
        html: `<html><body><h1>Only 15 Days Left</h1><p>Hi ${firstName},</p><p>Leads: ${stats.leadsResponded}, Avg: ${stats.avgResponseTime}, Appointments: ${stats.appointmentsBooked}</p><a href="${checkoutUrl}">Upgrade Now</a></body></html>`,
        text: `Hi ${firstName},\nYour pilot expires in 15 days.\nLeads: ${stats.leadsResponded}\nAvg: ${stats.avgResponseTime}\nAppointments: ${stats.appointmentsBooked}\nUpgrade: ${checkoutUrl}`
      },
      day55_final: {
        html: `<html><body><h1>5 Days Left</h1><p>Hi ${firstName},</p><p>Leads: ${stats.leadsResponded}, Avg: ${stats.avgResponseTime}, Appointments: ${stats.appointmentsBooked}</p><a href="${checkoutUrl}">Secure Pro Access</a></body></html>`,
        text: `Hi ${firstName},\nFINAL NOTICE: Your pilot expires in 5 DAYS.\nLeads: ${stats.leadsResponded}\nAvg: ${stats.avgResponseTime}\nAppointments: ${stats.appointmentsBooked}\nUpgrade: ${checkoutUrl}`
      }
    };
    const selected = templates[template];
    if (!selected) throw new Error(`Unknown template: ${template}`);
    return selected;
  }

  async sendEmailViaResend(to, subject, content) {
    if (!this.isResendConfigured()) {
      log.warn('Resend not configured, logging email instead');
      return { success: true, mock: true, id: `mock_${Date.now()}` };
    }
    const response = await withRetry(
      () => breakers.email.execute(() => fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${this.fromName} <${this.fromEmail}>`, to: [to], subject, html: content.html, text: content.text, tags: [{ name: 'campaign', value: 'pilot-conversion' }] })
      })),
      { operationName: 'PilotConversionService.sendEmailViaResend' }
    );
    if (!response.ok) { const err = await response.text(); throw new Error(`Resend API error: ${err}`); }
    const result = await response.json();
    return { success: true, id: result.id };
  }

  async logEmailSend(params) {
    if (!this.isDbConfigured()) { log.info('Email send logged (mock)', params); return; }
    try {
      await this.db.from('pilot_conversion_email_logs').insert({
        agent_id: params.agentId, milestone: params.milestone, template_key: params.templateKey,
        template_version: '1.0', recipient_email: params.recipientEmail, subject: params.subject,
        status: params.status, provider: 'resend', provider_message_id: params.messageId,
        error_message: params.errorMessage, personalized_data: params.personalizedData,
        stats_leads_responded: params.stats?.leadsResponded,
        stats_avg_response_time_seconds: params.stats?.avgResponseTimeSeconds,
        stats_appointments_booked: params.stats?.appointmentsBooked,
        skipped_reason: params.skippedReason,
        sent_at: params.status === 'sent' ? new Date().toISOString() : null
      });
    } catch (error) { log.error('Error in logEmailSend', error); }
  }

  async sendConversionEmail(agent, milestone) {
    const config = MILESTONES[milestone];
    try {
      const upgraded = await this.hasAgentUpgraded(agent.id);
      if (upgraded) {
        await this.logEmailSend({ agentId: agent.id, milestone, templateKey: config.template, recipientEmail: agent.email, subject: config.subject, status: 'skipped', skippedReason: 'already_upgraded' });
        return { success: false, skipped: true, reason: 'already_upgraded' };
      }
      const stats = await this.getAgentStats(agent.id);
      const checkoutUrl = this.generateCheckoutUrl(agent);
      const content = this.renderTemplate(config.template, agent, stats, checkoutUrl);
      const firstName = agent.name ? agent.name.split(' ')[0] : 'there';
      const subject = config.subject.replace('{{firstName}}', firstName);
      const sendResult = await this.sendEmailViaResend(agent.email, subject, content);
      await this.logEmailSend({ agentId: agent.id, milestone, templateKey: config.template, recipientEmail: agent.email, subject, status: 'sent', messageId: sendResult.id, personalizedData: { checkoutUrl, stats }, stats: { leadsResponded: stats.leadsResponded, avgResponseTimeSeconds: stats.avgResponseTime === 'N/A' ? null : parseInt(stats.avgResponseTime), appointmentsBooked: stats.appointmentsBooked } });
      log.info('Sent conversion email', { milestone, email: agent.email });
      return { success: true, messageId: sendResult.id };
    } catch (error) {
      log.error('Failed to send conversion email', error, { milestone, email: agent.email });
      await this.logEmailSend({ agentId: agent.id, milestone, templateKey: config.template, recipientEmail: agent.email, subject: config.subject, status: 'failed', errorMessage: error.message });
      return { success: false, error: error.message };
    }
  }

  async processMilestone(milestone) {
    log.info('Processing milestone', { milestone });
    const results = { milestone, processed: 0, sent: 0, skipped: 0, failed: 0, errors: [] };
    try {
      const agents = await this.getEligibleAgents(milestone);
      results.processed = agents.length;
      for (const agent of agents) {
        const result = await this.sendConversionEmail(agent, milestone);
        if (result.success) results.sent++;
        else if (result.skipped) results.skipped++;
        else { results.failed++; results.errors.push({ agent: agent.email, error: result.error }); }
      }
      return results;
    } catch (error) {
      log.error('Error processing milestone', error, { milestone });
      results.errors.push({ error: error.message });
      return results;
    }
  }

  async runConversionSequence() {
    log.info('Starting conversion sequence check');
    const results = { timestamp: new Date().toISOString(), milestones: {} };
    for (const milestone of ['day_30', 'day_45', 'day_55']) {
      results.milestones[milestone] = await this.processMilestone(milestone);
    }
    log.info('Conversion sequence check complete');
    return results;
  }
}

PilotConversionService.MILESTONES = MILESTONES;

module.exports = PilotConversionService;
