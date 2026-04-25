'use strict';

const { logger } = require('../logger');
const log = logger.child('PilotConversionService');
const { breakers, withRetry } = require('../utils/circuit-breaker');

/**
 * PilotConversionService — Pilot-to-Paid Conversion Email Service
 *
 * Handles the automated email sequence to convert pilot agents to paid Pro plan
 * (90-day pilot: PILOT_TRIAL_DAYS = 90):
 * - Day 30: 1/3 through — value recap + upgrade offer
 * - Day 45: Halfway — momentum nudge
 * - Day 55: 35 days left — urgency nudge
 * - Day 75: 15 days left — warning
 * - Day 79: 11 days left — critical push (current "Day 79 of 90" scenario)
 * - Day 85: 5 days left — final notice
 *
 * Features:
 * - Idempotent sends (one per milestone per agent)
 * - Stop-on-upgrade logic
 * - Personalized stats in each email
 */

const MILESTONES = {
  day_30: {
    days: 30,
    subject: "{{firstName}}, you're 1/3 through your pilot — here's what you've achieved 🚀",
    template: 'day30_midpoint'
  },
  day_45: {
    days: 45,
    subject: "{{firstName}}, halfway through your pilot — keep your AI advantage ⏰",
    template: 'day45_urgent'
  },
  day_55: {
    days: 55,
    subject: "{{firstName}}, 35 days left — time to lock in your results ⏰",
    template: 'day55_warning'
  },
  day_75: {
    days: 75,
    subject: "{{firstName}}, only 15 days left — your AI lead response is almost gone ⚠️",
    template: 'day75_urgent'
  },
  day_79: {
    days: 79,
    subject: "{{firstName}}, 11 days left — don't let your AI advantage expire 🚨",
    template: 'day79_critical'
  },
  day_85: {
    days: 85,
    subject: "{{firstName}}, FINAL NOTICE: 5 days to keep your Pro access ⛔",
    template: 'day85_final'
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
    const firstName = agent.first_name || 'there';
    const templates = {
      day30_midpoint: {
        html: `<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px"><h1 style="color:#2563eb">You're 1/3 Through Your Pilot! 🚀</h1><p>Hi ${firstName},</p><p>30 days in — here's what you've achieved:</p><ul><li><strong>${stats.leadsResponded}</strong> leads responded to</li><li><strong>${stats.avgResponseTime}</strong> average response time</li><li><strong>${stats.appointmentsBooked}</strong> appointments booked</li></ul><p>60 days left. Ready to lock in Pro access now?</p><a href="${checkoutUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Upgrade to Pro</a><p>Best,<br>Stojan<br>Founder, LeadFlow</p></body></html>`,
        text: `Hi ${firstName},\n\n30 days in — here's what you've achieved:\n- Leads responded: ${stats.leadsResponded}\n- Avg response time: ${stats.avgResponseTime}\n- Appointments booked: ${stats.appointmentsBooked}\n\n60 days left in your pilot. Ready to lock in Pro access now?\n\nUpgrade: ${checkoutUrl}\n\nBest,\nStojan\nFounder, LeadFlow`
      },
      day45_urgent: {
        html: `<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px"><h1 style="color:#d97706">Halfway Through — Keep Your Momentum ⏰</h1><p>Hi ${firstName},</p><p>45 days in, 45 days to go. Your results so far:</p><ul><li><strong>${stats.leadsResponded}</strong> leads responded</li><li><strong>${stats.avgResponseTime}</strong> avg response time</li><li><strong>${stats.appointmentsBooked}</strong> appointments booked</li></ul><p>Lock in Pro access before the countdown ends.</p><a href="${checkoutUrl}" style="background:#d97706;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Upgrade to Pro Now</a><p>Best,<br>Stojan</p></body></html>`,
        text: `Hi ${firstName},\n\n45 days in, 45 days to go. Your results:\n- Leads responded: ${stats.leadsResponded}\n- Avg response time: ${stats.avgResponseTime}\n- Appointments booked: ${stats.appointmentsBooked}\n\nLock in Pro access before the countdown ends.\n\nUpgrade: ${checkoutUrl}\n\nBest, Stojan`
      },
      day55_warning: {
        html: `<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px"><h1 style="color:#d97706">35 Days Left — Lock In Your Results ⏰</h1><p>Hi ${firstName},</p><p>55 days in — only 35 days left. Your pilot stats:</p><ul><li><strong>${stats.leadsResponded}</strong> leads responded</li><li><strong>${stats.avgResponseTime}</strong> avg response time</li><li><strong>${stats.appointmentsBooked}</strong> appointments booked</li></ul><p>Don't let this momentum slip. Upgrade before your pilot ends.</p><a href="${checkoutUrl}" style="background:#d97706;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Upgrade to Pro</a><p>Best,<br>Stojan</p></body></html>`,
        text: `Hi ${firstName},\n\n55 days in, 35 days left. Your pilot stats:\n- Leads responded: ${stats.leadsResponded}\n- Avg response time: ${stats.avgResponseTime}\n- Appointments booked: ${stats.appointmentsBooked}\n\nDon't let this momentum slip. Upgrade before your pilot ends.\n\nUpgrade: ${checkoutUrl}\n\nBest, Stojan`
      },
      day75_urgent: {
        html: `<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;margin-bottom:20px"><strong>⚠️ Only 15 days left in your LeadFlow pilot</strong></div><p>Hi ${firstName},</p><p>75 days in. Only 15 left. Your AI lead response has been working hard for you:</p><ul><li><strong>${stats.leadsResponded}</strong> leads responded to automatically</li><li><strong>${stats.avgResponseTime}</strong> average response time</li><li><strong>${stats.appointmentsBooked}</strong> appointments booked</li></ul><p>After Day 90, your account reverts to free tier. Don't lose this edge.</p><a href="${checkoutUrl}" style="background:#f59e0b;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold">Upgrade Now — Keep Your Lead Advantage</a><p>Best,<br>Stojan<br>Founder, LeadFlow</p></body></html>`,
        text: `Hi ${firstName},\n\n⚠️ Only 15 days left in your LeadFlow pilot.\n\nYour results so far:\n- Leads responded: ${stats.leadsResponded}\n- Avg response time: ${stats.avgResponseTime}\n- Appointments booked: ${stats.appointmentsBooked}\n\nAfter Day 90, your account reverts to free tier. Don't lose this edge.\n\nUpgrade now: ${checkoutUrl}\n\nBest,\nStojan\nFounder, LeadFlow`
      },
      day79_critical: {
        html: `<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#fee2e2;border-left:4px solid #dc2626;padding:16px;margin-bottom:20px"><strong>🚨 11 days left — your pilot expires soon</strong></div><p>Hi ${firstName},</p><p>Your LeadFlow pilot expires in <strong>11 days</strong>. Everything you've built stops working on Day 90.</p><p>Your 79-day results:</p><ul><li><strong>${stats.leadsResponded}</strong> leads responded to instantly — agents who don't upgrade miss every one of these</li><li><strong>${stats.avgResponseTime}</strong> average response time</li><li><strong>${stats.appointmentsBooked}</strong> appointments booked automatically</li></ul><p>This is your critical window. Upgrade now and keep uninterrupted AI-powered lead response.</p><div style="text-align:center;margin:24px 0"><a href="${checkoutUrl}" style="background:#dc2626;color:#fff;padding:16px 32px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;font-size:16px">Upgrade to Pro — Keep Your Edge</a></div><p style="font-size:13px;color:#666">Questions? Reply to this email — I'll personally help you get set up.</p><p>Best,<br>Stojan<br>Founder, LeadFlow</p></body></html>`,
        text: `Hi ${firstName},\n\n🚨 Your LeadFlow pilot expires in 11 DAYS.\n\nYour 79-day results:\n- Leads responded: ${stats.leadsResponded}\n- Avg response time: ${stats.avgResponseTime}\n- Appointments booked: ${stats.appointmentsBooked}\n\nThis is your critical window. After Day 90, your AI lead response pauses and your account reverts to free tier.\n\nUpgrade now to keep everything running: ${checkoutUrl}\n\nQuestions? Reply to this email — I'll personally help.\n\nBest,\nStojan\nFounder, LeadFlow`
      },
      day85_final: {
        html: `<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#dc2626;color:#fff;padding:20px;border-radius:8px;margin-bottom:20px;text-align:center"><h1 style="margin:0;font-size:22px">⛔ FINAL NOTICE: 5 Days Left</h1></div><p>Hi ${firstName},</p><p>Your LeadFlow pilot ends in <strong>5 days</strong>. After that, your AI lead response is paused and every new lead will wait — or go cold.</p><p>What you lose on Day 90:</p><ul><li>Instant AI responses to every new lead</li><li>Automatic appointment booking</li><li>All the speed advantage you've built</li></ul><p>Your pilot stats: ${stats.leadsResponded} leads responded, ${stats.appointmentsBooked} appointments booked.</p><div style="text-align:center;margin:24px 0"><a href="${checkoutUrl}" style="background:#dc2626;color:#fff;padding:16px 32px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;font-size:18px">Secure Pro Access Now</a></div><p style="font-size:13px;color:#666;text-align:center">This is your final reminder. After 5 days, upgrade to avoid any interruption.</p><p>Best,<br>Stojan</p></body></html>`,
        text: `⛔ FINAL NOTICE: 5 DAYS LEFT\n\nHi ${firstName},\n\nYour LeadFlow pilot ends in 5 DAYS. After that:\n- AI lead response PAUSED\n- Every new lead waits (or goes cold)\n- Back to manual follow-up\n\nYour pilot stats: ${stats.leadsResponded} leads responded, ${stats.appointmentsBooked} appointments booked.\n\nSecure Pro Access now: ${checkoutUrl}\n\nThis is your final reminder.\n\nBest,\nStojan`
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
      const firstName = agent.first_name || 'there';
      const subject = config.subject.replace('{{firstName}}', firstName);
      const sendResult = await this.sendEmailViaResend(agent.email, subject, content);
      await this.logEmailSend({ agentId: agent.id, milestone, templateKey: config.template, recipientEmail: agent.email, subject, status: 'sent', messageId: sendResult.id, personalizedData: { checkoutUrl, stats }, stats: { leadsResponded: stats.leadsResponded, avgResponseTimeSeconds: stats.avgResponseTime === 'N/A' ? null : parseInt(stats.avgResponseTime), appointmentsBooked: stats.appointmentsBooked } });
      log.info('Sent conversion email', { milestone, email: agent.email });
      return { success: true, messageId: sendResult.id };
    } catch (error) {
      log.error('Failed to send conversion email', error, { milestone, email: agent.email });
      await this.logEmailSend({ agentId: agent.id, milestone, templateKey: config.template, recipientEmail: agent.email, subject: config.subject, status: 'failed', errorMessage: error.message });
      return { success: false, error: 'Failed to send conversion email' };
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
      results.errors.push({ error: 'Failed to process milestone' });
      return results;
    }
  }

  async runConversionSequence() {
    log.info('Starting conversion sequence check');
    const results = { timestamp: new Date().toISOString(), milestones: {} };
    for (const milestone of ['day_30', 'day_45', 'day_55', 'day_75', 'day_79', 'day_85']) {
      results.milestones[milestone] = await this.processMilestone(milestone);
    }
    log.info('Conversion sequence check complete');
    return results;
  }
}

PilotConversionService.MILESTONES = MILESTONES;

module.exports = PilotConversionService;
