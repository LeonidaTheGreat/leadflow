'use strict';

const { getPool } = require('../db');
const EmailService = require('./EmailService');
const TwilioService = require('./TwilioService');
const { logger: defaultLogger } = require('../logger');

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app';

class FirstResponseNotificationService {
  constructor(options = {}) {
    this.pool = options.pool || getPool();
    this.emailService = options.emailService || new EmailService();
    this.twilioService = options.twilioService || new TwilioService();
    this.logger = options.logger || defaultLogger;
  }

  /**
   * Fire the one-time first-AI-response notification for an agent.
   * No-ops if the agent has already been notified.
   *
   * @param {string} agentId - UUID of the real_estate_agents row
   * @param {object} context - {leadName, responseTimeMs, messageBody}
   */
  async notify(agentId, context = {}) {
    const { leadName = 'a new lead', responseTimeMs = 0, messageBody = '' } = context;

    const client = await this.pool.connect();
    try {
      // Claim the notification slot — only the first concurrent caller wins.
      const { rows } = await client.query(
        `UPDATE real_estate_agents
            SET first_ai_response_notified_at = NOW()
          WHERE id = $1
            AND first_ai_response_notified_at IS NULL
          RETURNING id, first_name, last_name, email, phone_number`,
        [agentId]
      );

      if (!rows.length) {
        // Already notified — skip.
        return { sent: false, reason: 'already_notified' };
      }

      const agent = rows[0];
      const agentFirstName = agent.first_name || 'there';
      const responseTimeSec = Math.round(responseTimeMs / 1000);
      const dashboardLink = `${DASHBOARD_URL}/dashboard`;

      const results = await Promise.allSettled([
        this._sendSms(agent, agentFirstName, leadName, responseTimeSec, dashboardLink),
        this._sendEmail(agent, agentFirstName, leadName, responseTimeSec, messageBody, dashboardLink),
      ]);

      const smsSent = results[0].status === 'fulfilled' && results[0].value?.success !== false;
      const emailSent = results[1].status === 'fulfilled' && results[1].value?.success !== false;

      this.logger.info('First-response notification sent', { agentId, smsSent, emailSent });
      return { sent: true, smsSent, emailSent };
    } finally {
      client.release();
    }
  }

  async _sendSms(agent, agentFirstName, leadName, responseTimeSec, dashboardLink) {
    if (!agent.phone_number) {
      return { success: false, reason: 'no_phone' };
    }

    const message = `Your AI just responded to ${leadName} in ${responseTimeSec}s! See it: ${dashboardLink}`;

    try {
      return await this.twilioService.sendSms(agent.phone_number, message, {
        trigger: 'first_ai_response_notification',
      });
    } catch (err) {
      this.logger.warn('First-response SMS failed', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  async _sendEmail(agent, agentFirstName, leadName, responseTimeSec, messageBody, dashboardLink) {
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563eb">Your AI is working! 🎉</h2>
        <p>Hi ${agentFirstName},</p>
        <p>Your LeadFlow AI just responded to <strong>${leadName}</strong> in <strong>${responseTimeSec} seconds</strong>.</p>
        ${messageBody ? `
        <div style="background:#f3f4f6;border-left:4px solid #2563eb;padding:12px 16px;margin:16px 0;border-radius:4px">
          <p style="margin:0;font-style:italic;color:#374151">"${messageBody}"</p>
        </div>` : ''}
        <p>Your AI is responding to leads while you focus on what matters — closing deals.</p>
        <p>
          <a href="${dashboardLink}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">
            View conversation →
          </a>
        </p>
        <p style="color:#6b7280;font-size:14px">The LeadFlow team</p>
      </div>
    `;

    try {
      return await this.emailService.send({
        to: agent.email,
        subject: 'Your AI is working — first response sent!',
        html,
        failIfUnconfigured: false,
      });
    } catch (err) {
      this.logger.warn('First-response email failed', { error: err.message });
      return { success: false, error: err.message };
    }
  }
}

module.exports = FirstResponseNotificationService;
