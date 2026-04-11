'use strict';

/**
 * ActivationService — Admin outreach to verified-but-unactivated agents
 *
 * Encapsulates:
 *  - Admin bearer token authentication
 *  - Fetching the activation-eligible agent list
 *  - Sending personalized activation emails via EmailService
 *  - Marking activation_email_sent = true after a successful send
 *
 * UC: feat-personal-outreach-to-250-verified-signups
 */

const EmailService = require('./EmailService');

const ACTIVATION_EMAIL_SUBJECT = 'Your LeadFlow setup — 2 minutes to first AI response';
const ACTIVATION_LIST_SQL = `
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
const FETCH_AGENT_SQL = `
  SELECT id, email, first_name, email_verified, onboarding_completed, activation_email_sent
  FROM real_estate_agents WHERE id = $1
`;
const MARK_SENT_SQL = `
  UPDATE real_estate_agents
  SET activation_email_sent = true, updated_at = NOW()
  WHERE id = $1
`;

class ActivationService {
  /**
   * @param {Object} [options]
   * @param {Object} [options.pool]         - pg Pool instance (required for DB ops)
   * @param {string} [options.apiKey]       - LEADFLOW_API_KEY for admin auth
   * @param {string} [options.fromEmail]    - Sender email address
   * @param {string} [options.appUrl]       - Base app URL for onboarding link
   * @param {Object} [options.emailService] - EmailService instance (injectable for testing)
   */
  constructor(options = {}) {
    this.pool = options.pool || null;
    this.apiKey = options.apiKey || process.env.LEADFLOW_API_KEY || null;
    this.fromEmail = options.fromEmail || process.env.FROM_EMAIL || 'stojan@leadflow.ai';
    this.appUrl = options.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app';
    this.emailService = options.emailService || new EmailService({
      fromEmail: this.fromEmail,
    });
  }

  /**
   * Verify an Express request carries a valid admin bearer token.
   * Returns true if auth passes, false otherwise.
   *
   * @param {Object} req - Express request object
   * @returns {boolean}
   */
  verifyAdminAuth(req) {
    if (!this.apiKey) return false;

    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return false;

    const provided = authHeader.slice(7).trim();
    return provided === this.apiKey;
  }

  /**
   * Fetch all agents who are verified but have not completed onboarding.
   * Returns { rows } from the database query.
   *
   * @returns {Promise<Array>}
   */
  async getActivationList() {
    if (!this.pool) throw new Error('DB pool not configured');
    const { rows } = await this.pool.query(ACTIVATION_LIST_SQL);
    return rows;
  }

  /**
   * Format activation list rows as a CSV string.
   * @param {Array} rows
   * @returns {string}
   */
  formatListAsCsv(rows) {
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
    return [header, ...csvRows].join('\n');
  }

  /**
   * Format activation list rows as a JSON summary object.
   * @param {Array} rows
   * @returns {Object}
   */
  formatListAsJson(rows) {
    return {
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
    };
  }

  /**
   * Send a personalized activation email to a single agent, then mark
   * activation_email_sent = true in the DB.
   *
   * Returns:
   *   { success: true,  agent_id, email, resend_id }           — on success
   *   { success: false, error: 'Agent not found' }              — agent_id invalid
   *   { success: false, error: 'Agent email is not verified' }  — guard
   *   { success: false, error: 'Agent has already completed onboarding' } — guard
   *   { success: false, error: 'Email send failed', detail }    — Resend failure
   *
   * @param {string} agentId
   * @returns {Promise<Object>}
   */
  async sendActivationEmail(agentId) {
    if (!this.pool) throw new Error('DB pool not configured');

    const { rows } = await this.pool.query(FETCH_AGENT_SQL, [agentId]);

    if (rows.length === 0) {
      return { success: false, error: 'Agent not found' };
    }

    const agent = rows[0];

    if (!agent.email_verified) {
      return { success: false, error: 'Agent email is not verified' };
    }

    if (agent.onboarding_completed) {
      return { success: false, error: 'Agent has already completed onboarding' };
    }

    const result = await this.emailService.sendActivationOutreach({
      to: agent.email,
      firstName: agent.first_name,
      subject: ACTIVATION_EMAIL_SUBJECT,
      from: `Stojan from LeadFlow <${this.fromEmail}>`,
      appUrl: this.appUrl,
    });

    if (!result.success) {
      return { success: false, error: 'Email send failed', detail: result.error };
    }

    // Mark activation_email_sent = true only AFTER successful send
    await this.pool.query(MARK_SENT_SQL, [agentId]);

    return {
      success: true,
      agent_id: agent.id,
      email: agent.email,
      resend_id: result.resend_id,
    };
  }
}

module.exports = ActivationService;
