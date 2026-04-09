'use strict';

const { createClient } = require('../postgrest-client');
const EmailService = require('./EmailService');

const MILESTONES = {
  day_30: {
    days: 30,
    subject: '{{firstName}}, you\'re halfway through your pilot — here\'s what you\'ve achieved 🚀',
    template: 'day30_midpoint'
  },
  day_45: {
    days: 45,
    subject: '{{firstName}}, only 15 days left — don\'t lose your AI advantage ⏰',
    template: 'day45_urgent'
  },
  day_55: {
    days: 55,
    subject: '{{firstName}}, 5 days left: Secure your Pro access now ⚠️',
    template: 'day55_final'
  }
};

class PilotConversionService {
  constructor(dbClient, emailService) {
    this.db = dbClient || PilotConversionService.createDefaultDbClient();
    this.emailService = emailService || PilotConversionService.createDefaultEmailService();
  }

  static get MILESTONES() {
    return MILESTONES;
  }

  static createDefaultDbClient() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiKey = process.env.API_SECRET_KEY || process.env.LEADFLOW_API_KEY;

    if (!apiUrl || !apiKey) {
      return null;
    }

    const baseUrl = apiUrl.includes('/rest/v1')
      ? apiUrl
      : `${apiUrl.replace(/\/$/, '')}/rest/v1`;

    return createClient(baseUrl, apiKey);
  }

  static createDefaultEmailService() {
    return new EmailService({
      apiKey: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : undefined,
      fromEmail: (process.env.FROM_EMAIL || 'stojan@leadflow.ai').trim(),
      fromName: 'LeadFlow'
    });
  }

  static createDefaultService() {
    return new PilotConversionService(
      PilotConversionService.createDefaultDbClient(),
      PilotConversionService.createDefaultEmailService()
    );
  }

  isSupabaseConfigured() {
    return this.db !== null;
  }

  isResendConfigured() {
    return !!(this.emailService && this.emailService.isConfigured && this.emailService.isConfigured());
  }

  resolveFirstName(agent) {
    if (agent.first_name) {
      return agent.first_name;
    }

    if (agent.firstName) {
      return agent.firstName;
    }

    if (agent.name) {
      return agent.name.split(' ')[0];
    }

    const fullName = [agent.first_name, agent.last_name].filter(Boolean).join(' ').trim();
    return fullName ? fullName.split(' ')[0] : 'there';
  }

  resolveAgentName(agent) {
    if (agent.name) {
      return agent.name;
    }

    return [agent.first_name, agent.last_name].filter(Boolean).join(' ').trim();
  }

  getNormalizedAgent(agent) {
    return {
      ...agent,
      name: this.resolveAgentName(agent),
      firstName: this.resolveFirstName(agent)
    };
  }

  async getEligibleAgents(milestone) {
    if (!this.isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning empty agent list');
      return [];
    }

    const config = MILESTONES[milestone];
    if (!config) {
      throw new Error(`Invalid milestone: ${milestone}`);
    }

    try {
      const thresholdDate = new Date(Date.now() - config.days * 24 * 60 * 60 * 1000).toISOString();

      const { data: agents, error } = await this.db
        .from('real_estate_agents')
        .select('id, email, first_name, last_name, plan_tier, pilot_started_at, stripe_customer_id')
        .eq('plan_tier', 'pilot')
        .not('pilot_started_at', 'is', null)
        .lte('pilot_started_at', thresholdDate)
        .order('pilot_started_at', { ascending: true });

      if (error) {
        console.error('Error fetching eligible agents:', error);
        throw error;
      }

      if (!agents || agents.length === 0) {
        console.log(`[Pilot Conversion] No agents found for ${milestone}`);
        return [];
      }

      const { data: sentLogs, error: logError } = await this.db
        .from('pilot_conversion_email_logs')
        .select('agent_id, milestone')
        .in('agent_id', agents.map((agent) => agent.id))
        .eq('milestone', milestone)
        .in('status', ['sent', 'skipped']);

      if (logError) {
        console.error('Error fetching email logs:', logError);
        throw logError;
      }

      const sentAgentIds = new Set(sentLogs?.map((log) => log.agent_id) || []);
      const eligibleAgents = agents
        .filter((agent) => !sentAgentIds.has(agent.id))
        .map((agent) => this.getNormalizedAgent(agent));

      console.log(`[Pilot Conversion] Found ${eligibleAgents.length} agents eligible for ${milestone}`);
      return eligibleAgents;
    } catch (error) {
      console.error(`Error getting eligible agents for ${milestone}:`, error);
      throw error;
    }
  }

  async getAgentStats(agentId) {
    if (!this.isSupabaseConfigured()) {
      return {
        leadsResponded: 0,
        avgResponseTime: 'N/A',
        appointmentsBooked: 0
      };
    }

    try {
      let leadsData = [];

      try {
        const result = await this.db
          .from('leads')
          .select('id, responded_at, created_at')
          .eq('agent_id', agentId)
          .not('responded_at', 'is', null);

        leadsData = result.data || [];

        if (result.error) {
          console.error('Error fetching leads:', result.error);
        }
      } catch (_) {
        leadsData = [];
      }

      const leadsResponded = leadsData.length;

      let avgResponseTime = 'N/A';
      if (leadsData.length > 0) {
        const responseTimes = leadsData
          .filter((lead) => lead.responded_at && lead.created_at)
          .map((lead) => {
            const responseTime = new Date(lead.responded_at) - new Date(lead.created_at);
            return responseTime / 1000;
          });

        if (responseTimes.length > 0) {
          const avgSeconds = responseTimes.reduce((sum, seconds) => sum + seconds, 0) / responseTimes.length;
          if (avgSeconds < 60) {
            avgResponseTime = `${Math.round(avgSeconds)} seconds`;
          } else if (avgSeconds < 3600) {
            avgResponseTime = `${Math.round(avgSeconds / 60)} minutes`;
          } else {
            avgResponseTime = `${(avgSeconds / 3600).toFixed(1)} hours`;
          }
        }
      }

      let bookingsData = [];
      try {
        const result = await this.db
          .from('bookings')
          .select('id')
          .eq('agent_id', agentId);
        bookingsData = result.data || [];
      } catch (_) {
        bookingsData = [];
      }

      return {
        leadsResponded,
        avgResponseTime,
        appointmentsBooked: bookingsData.length
      };
    } catch (error) {
      console.error(`Error getting stats for agent ${agentId}:`, error);
      return {
        leadsResponded: 0,
        avgResponseTime: 'N/A',
        appointmentsBooked: 0
      };
    }
  }

  async getSequenceStatus() {
    if (!this.isSupabaseConfigured()) {
      throw new Error('Database not configured');
    }

    const { data: agents, error } = await this.db
      .from('pilot_conversion_sequence_status')
      .select('*')
      .order('days_since_pilot_start', { ascending: false });

    if (error) {
      throw error;
    }

    const summary = {
      totalPilotAgents: agents?.length || 0,
      day30Sent: agents?.filter((agent) => agent.day_30_status === 'sent').length || 0,
      day45Sent: agents?.filter((agent) => agent.day_45_status === 'sent').length || 0,
      day55Sent: agents?.filter((agent) => agent.day_55_status === 'sent').length || 0,
      upgraded: agents?.filter((agent) => agent.plan_tier !== 'pilot').length || 0
    };

    return {
      summary,
      agents: agents || []
    };
  }

  async getAgentStatus(agentId) {
    if (!this.isSupabaseConfigured()) {
      throw new Error('Database not configured');
    }

    const { data: agent, error: agentError } = await this.db
      .from('real_estate_agents')
      .select('id, email, first_name, last_name, plan_tier, pilot_started_at')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      const error = new Error('Agent not found');
      error.statusCode = 404;
      throw error;
    }

    const { data: logs, error: logsError } = await this.db
      .from('pilot_conversion_email_logs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (logsError) {
      throw logsError;
    }

    const stats = await this.getAgentStats(agentId);
    const daysSinceStart = agent.pilot_started_at
      ? Math.floor((Date.now() - new Date(agent.pilot_started_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      agent: {
        ...this.getNormalizedAgent(agent),
        days_since_start: daysSinceStart
      },
      stats,
      email_logs: logs || []
    };
  }

  generateCheckoutUrl(agent) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app';
    return `${baseUrl}/billing/upgrade?agent=${agent.id}&plan=pro&source=pilot_conversion`;
  }

  renderTemplate(template, agent, stats, checkoutUrl) {
    const firstName = this.resolveFirstName(agent);

    const templates = {
      day30_midpoint: {
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Pilot Progress</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">You're Halfway There! 🎉</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>

    <p>You're 30 days into your LeadFlow pilot, and the results are speaking for themselves:</p>

    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="text-align: center; margin-bottom: 15px;">
        <span style="font-size: 36px; font-weight: bold; color: #667eea;">${stats.leadsResponded}</span>
        <p style="margin: 5px 0; color: #666;">Leads Responded</p>
      </div>
      <div style="text-align: center; margin-bottom: 15px;">
        <span style="font-size: 36px; font-weight: bold; color: #667eea;">${stats.avgResponseTime}</span>
        <p style="margin: 5px 0; color: #666;">Average Response Time</p>
      </div>
      <div style="text-align: center;">
        <span style="font-size: 36px; font-weight: bold; color: #667eea;">${stats.appointmentsBooked}</span>
        <p style="margin: 5px 0; color: #666;">Appointments Booked</p>
      </div>
    </div>

    <p>Your pilot expires in 30 days. Ready to lock in these results?</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${checkoutUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Upgrade to Pro →</a>
    </div>

    <p style="font-size: 14px; color: #666;">Questions? Reply to this email — I'm here to help.</p>

    <p style="margin-top: 30px;">Best,<br>Stojan<br>Founder, LeadFlow</p>
  </div>
</body>
</html>
`,
        text: `Hi ${firstName},

You're 30 days into your LeadFlow pilot, and the results are speaking for themselves:

• Leads Responded: ${stats.leadsResponded}
• Average Response Time: ${stats.avgResponseTime}
• Appointments Booked: ${stats.appointmentsBooked}

Your pilot expires in 30 days. Ready to lock in these results?

Upgrade to Pro: ${checkoutUrl}

Questions? Reply to this email — I'm here to help.

Best,
Stojan
Founder, LeadFlow
`
      },
      day45_urgent: {
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Only 15 Days Left</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #ff6b6b; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Only 15 Days Left</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>

    <p>Your LeadFlow pilot expires in <strong>15 days</strong>. Here's what you've accomplished so far:</p>

    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold;">Your Pilot Results:</p>
      <ul style="margin: 10px 0;">
        <li>${stats.leadsResponded} leads responded to instantly</li>
        <li>${stats.avgResponseTime} average response time</li>
        <li>${stats.appointmentsBooked} appointments booked automatically</li>
      </ul>
    </div>

    <p>Without LeadFlow, you'll go back to:</p>
    <ul style="color: #666;">
      <li>Missing leads while you're with clients</li>
      <li>Leads going cold before you can respond</li>
      <li>Manual scheduling back-and-forth</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${checkoutUrl}" style="background: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Upgrade to Pro Now →</a>
    </div>

    <p style="font-size: 14px; color: #666;">Don't lose your AI advantage. Upgrade now and keep your edge.</p>

    <p style="margin-top: 30px;">Best,<br>Stojan<br>Founder, LeadFlow</p>
  </div>
</body>
</html>
`,
        text: `Hi ${firstName},

Your LeadFlow pilot expires in 15 DAYS. Here's what you've accomplished so far:

Your Pilot Results:
• ${stats.leadsResponded} leads responded to instantly
• ${stats.avgResponseTime} average response time
• ${stats.appointmentsBooked} appointments booked automatically

Without LeadFlow, you'll go back to:
• Missing leads while you're with clients
• Leads going cold before you can respond
• Manual scheduling back-and-forth

Upgrade to Pro Now: ${checkoutUrl}

Don't lose your AI advantage. Upgrade now and keep your edge.

Best,
Stojan
Founder, LeadFlow
`
      },
      day55_final: {
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Final Notice: 5 Days Left</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #dc3545; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Final Notice: 5 Days Left</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>

    <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #721c24;">Your pilot expires in 5 days</p>
      <p style="margin: 10px 0 0 0; color: #721c24;">After that, your AI lead response will be paused.</p>
    </div>

    <p>Your pilot stats:</p>
    <ul>
      <li><strong>${stats.leadsResponded}</strong> leads responded</li>
      <li><strong>${stats.avgResponseTime}</strong> avg response</li>
      <li><strong>${stats.appointmentsBooked}</strong> appointments booked</li>
    </ul>

    <p>Don't let this slip away. Upgrade to Pro in the next 5 days:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${checkoutUrl}" style="background: #dc3545; color: white; padding: 18px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 18px; display: inline-block;">Secure Pro Access →</a>
    </div>

    <p style="font-size: 14px; color: #666; text-align: center;">This is your final reminder. Secure your Pro access now.</p>

    <p style="margin-top: 30px;">Best,<br>Stojan<br>Founder, LeadFlow</p>
  </div>
</body>
</html>
`,
        text: `⚠️ FINAL NOTICE: 5 DAYS LEFT

Hi ${firstName},

Your LeadFlow pilot expires in 5 DAYS.
After that, your AI lead response will be PAUSED.

Your pilot stats:
• ${stats.leadsResponded} leads responded
• ${stats.avgResponseTime} avg response
• ${stats.appointmentsBooked} appointments booked

Don't let this slip away. Upgrade to Pro in the next 5 days:

Secure Pro Access: ${checkoutUrl}

This is your final reminder.

Best,
Stojan
Founder, LeadFlow
`
      }
    };

    const selectedTemplate = templates[template];
    if (!selectedTemplate) {
      throw new Error(`Unknown template: ${template}`);
    }

    return selectedTemplate;
  }

  async sendEmailViaResend(to, subject, content) {
    const result = await this.emailService.sendPilotConversion({
      to,
      subject,
      html: content.html,
      text: content.text
    });

    if (!result.success) {
      throw new Error(result.error || 'Unknown email send error');
    }

    if (result.mock) {
      console.warn('Resend not configured, logging email instead');
      console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);
    }

    return { success: true, mock: !!result.mock, id: result.id || result.resend_id };
  }

  async logEmailSend(params) {
    if (!this.isSupabaseConfigured()) {
      console.log('[MOCK LOG] Email send logged:', params);
      return;
    }

    try {
      const { error } = await this.db
        .from('pilot_conversion_email_logs')
        .insert({
          agent_id: params.agentId,
          milestone: params.milestone,
          template_key: params.templateKey,
          template_version: '1.0',
          recipient_email: params.recipientEmail,
          subject: params.subject,
          status: params.status,
          provider: 'resend',
          provider_message_id: params.messageId,
          error_message: params.errorMessage,
          personalized_data: params.personalizedData,
          stats_leads_responded: params.stats?.leadsResponded,
          stats_avg_response_time_seconds: params.stats?.avgResponseTimeSeconds,
          stats_appointments_booked: params.stats?.appointmentsBooked,
          skipped_reason: params.skippedReason,
          sent_at: params.status === 'sent' ? new Date().toISOString() : null
        });

      if (error) {
        console.error('Error logging email send:', error);
      }
    } catch (error) {
      console.error('Error in logEmailSend:', error);
    }
  }

  async hasAgentUpgraded(agentId) {
    if (!this.isSupabaseConfigured()) {
      return false;
    }

    try {
      const { data, error } = await this.db
        .from('real_estate_agents')
        .select('plan_tier')
        .eq('id', agentId)
        .single();

      if (error) {
        console.error('Error checking agent plan tier:', error);
        return false;
      }

      return !!(data && data.plan_tier !== 'pilot');
    } catch (error) {
      console.error('Error in hasAgentUpgraded:', error);
      return false;
    }
  }

  async sendConversionEmail(agent, milestone) {
    const config = MILESTONES[milestone];
    if (!config) {
      throw new Error(`Invalid milestone: ${milestone}`);
    }

    const normalizedAgent = this.getNormalizedAgent(agent);

    try {
      const upgraded = await this.hasAgentUpgraded(normalizedAgent.id);
      if (upgraded) {
        console.log(`[Pilot Conversion] Skipping ${milestone} for ${normalizedAgent.email} - already upgraded`);
        await this.logEmailSend({
          agentId: normalizedAgent.id,
          milestone,
          templateKey: config.template,
          recipientEmail: normalizedAgent.email,
          subject: config.subject.replace('{{firstName}}', normalizedAgent.firstName),
          status: 'skipped',
          skippedReason: 'already_upgraded'
        });
        return { success: false, skipped: true, reason: 'already_upgraded' };
      }

      const stats = await this.getAgentStats(normalizedAgent.id);
      const checkoutUrl = this.generateCheckoutUrl(normalizedAgent);
      const content = this.renderTemplate(config.template, normalizedAgent, stats, checkoutUrl);
      const subject = config.subject.replace('{{firstName}}', normalizedAgent.firstName);
      const sendResult = await this.sendEmailViaResend(normalizedAgent.email, subject, content);

      await this.logEmailSend({
        agentId: normalizedAgent.id,
        milestone,
        templateKey: config.template,
        recipientEmail: normalizedAgent.email,
        subject,
        status: 'sent',
        messageId: sendResult.id,
        personalizedData: {
          checkoutUrl,
          stats
        },
        stats: {
          leadsResponded: stats.leadsResponded,
          avgResponseTimeSeconds: Number.parseInt(stats.avgResponseTime, 10) || null,
          appointmentsBooked: stats.appointmentsBooked
        }
      });

      console.log(`[Pilot Conversion] Sent ${milestone} email to ${normalizedAgent.email}`);
      return { success: true, messageId: sendResult.id };
    } catch (error) {
      console.error(`[Pilot Conversion] Failed to send ${milestone} to ${normalizedAgent.email}:`, error);

      await this.logEmailSend({
        agentId: normalizedAgent.id,
        milestone,
        templateKey: config.template,
        recipientEmail: normalizedAgent.email,
        subject: config.subject.replace('{{firstName}}', normalizedAgent.firstName),
        status: 'failed',
        errorMessage: error.message
      });

      return { success: false, error: error.message };
    }
  }

  async processMilestone(milestone) {
    console.log(`[Pilot Conversion] Processing ${milestone}...`);

    const results = {
      milestone,
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };

    try {
      const agents = await this.getEligibleAgents(milestone);
      results.processed = agents.length;

      for (const agent of agents) {
        const result = await this.sendConversionEmail(agent, milestone);

        if (result.success) {
          results.sent++;
        } else if (result.skipped) {
          results.skipped++;
        } else {
          results.failed++;
          results.errors.push({ agent: agent.email, error: result.error });
        }
      }

      console.log(`[Pilot Conversion] ${milestone} complete: ${results.sent} sent, ${results.skipped} skipped, ${results.failed} failed`);
      return results;
    } catch (error) {
      console.error(`[Pilot Conversion] Error processing ${milestone}:`, error);
      results.errors.push({ error: error.message });
      return results;
    }
  }

  async runConversionSequence() {
    console.log('[Pilot Conversion] Starting conversion sequence check...');

    const results = {
      timestamp: new Date().toISOString(),
      milestones: {}
    };

    for (const milestone of ['day_30', 'day_45', 'day_55']) {
      results.milestones[milestone] = await this.processMilestone(milestone);
    }

    console.log('[Pilot Conversion] Sequence check complete');
    return results;
  }

  async runDailyConversionSequence() {
    return this.runConversionSequence();
  }
}

module.exports = PilotConversionService;
module.exports.PilotConversionService = PilotConversionService;
module.exports.createDefaultPilotConversionService = PilotConversionService.createDefaultService;
