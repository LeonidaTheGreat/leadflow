'use strict';

/**
 * AdminSmsOutreachService — Direct SMS outreach to real estate agent prospects.
 *
 * Bypasses email delivery by contacting prospects via Twilio SMS with a
 * magic trial-activation link. Tracks all sends in admin_sms_outreach_log.
 *
 * UC: uc-leadflow-admin-sms-outreach
 */

const { getPool } = require('../db');
const TwilioService = require('./TwilioService');
const AdminMagicLinkService = require('./AdminMagicLinkService');
const { logger } = require('../logger');

const log = logger.child('AdminSmsOutreachService');

const SMS_TEMPLATE = (firstName, market, loginUrl) =>
  `Hi ${firstName}, this is Stojan from LeadFlow. We help ${market} agents get AI responses to new leads in 30 seconds — want a free trial? ${loginUrl}`;

const INSERT_LOG_SQL = `
  INSERT INTO admin_sms_outreach_log
    (first_name, phone, market, email, login_url, twilio_sid, sms_status, sent_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, now())
  RETURNING *
`;

const SELECT_LOG_SQL = `
  SELECT id, first_name, phone, market, email, login_url, twilio_sid,
         sms_status, reply_status, sent_at, created_at
  FROM admin_sms_outreach_log
  ORDER BY sent_at DESC
  LIMIT $1
`;

class AdminSmsOutreachService {
  /**
   * @param {Object} options
   * @param {import('pg').Pool} [options.pool]
   * @param {TwilioService} [options.twilioService]
   * @param {AdminMagicLinkService} [options.magicLinkService]
   */
  constructor(options = {}) {
    this.pool = options.pool || getPool();
    this.twilioService = options.twilioService || new TwilioService();
    this.magicLinkService = options.magicLinkService || new AdminMagicLinkService();
  }

  /**
   * Send a cold outreach SMS to a prospect and log the attempt.
   *
   * @param {{ firstName: string, phone: string, market: string, email: string }} input
   * @returns {Promise<{ id: string, loginUrl: string, twilio_sid: string|null, sms_status: string }>}
   */
  async sendOutreach({ firstName, phone, market, email }) {
    this._validateInput({ firstName, phone, market, email });

    // Generate magic link (creates account on click)
    const { loginUrl } = await this.magicLinkService.createMagicLink({
      email,
      firstName,
      lastName: '',
    });

    const message = SMS_TEMPLATE(firstName, market, loginUrl);

    let twilioSid = null;
    let smsStatus = 'sent';

    try {
      const result = await this.twilioService.sendSms(phone, message, { trigger: 'admin-cold-outreach' });
      twilioSid = result.sid || null;
      smsStatus = result.success ? 'sent' : 'failed';
    } catch (err) {
      log.error('Twilio send failed — logging as failed', { phone: phone.slice(-4), err: err.message });
      smsStatus = 'failed';
    }

    const { rows } = await this.pool.query(INSERT_LOG_SQL, [
      firstName, phone, market, email, loginUrl, twilioSid, smsStatus,
    ]);

    return {
      id: rows[0].id,
      loginUrl,
      twilio_sid: twilioSid,
      sms_status: smsStatus,
    };
  }

  /**
   * Return sent history, newest first.
   *
   * @param {number} [limit=50]
   * @returns {Promise<Array>}
   */
  async getOutreachLog(limit = 50) {
    const { rows } = await this.pool.query(SELECT_LOG_SQL, [limit]);
    return rows;
  }

  _validateInput({ firstName, phone, market, email }) {
    const missing = [];
    if (!firstName || !firstName.trim()) missing.push('firstName');
    if (!phone || !phone.trim()) missing.push('phone');
    if (!market || !market.trim()) missing.push('market');
    if (!email || !email.trim()) missing.push('email');
    if (missing.length > 0) {
      const err = new Error(`Missing required fields: ${missing.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
  }
}

module.exports = AdminSmsOutreachService;
