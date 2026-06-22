'use strict';

const EmailService = require('./EmailService');

const EMAIL_TYPE = 'pilot_phoneless_reactivation';

const DEFAULT_BOOKING_URL = 'https://cal.com/stojan-leadflow/15min';
const DEFAULT_SIGNUP_URL = 'https://leadflow-ai-five.vercel.app/signup/trial';
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

const ELIGIBLE_SQL = `
  SELECT ps.id, ps.email, ps.name, ps.first_name, ps.created_at, ps.status
  FROM pilot_signups ps
  WHERE (ps.phone IS NULL OR ps.phone = '')
    AND ps.status != 'unsubscribed'
    AND NOT EXISTS (
      SELECT 1 FROM pilot_email_log pel
      WHERE pel.pilot_signup_id = ps.id
        AND pel.email_type = $1
        AND pel.status = 'sent'
    )
  ORDER BY ps.created_at ASC
  LIMIT $2
`;

const COUNT_ELIGIBLE_SQL = `
  SELECT COUNT(*)::integer AS count
  FROM pilot_signups ps
  WHERE (ps.phone IS NULL OR ps.phone = '')
    AND ps.status != 'unsubscribed'
    AND NOT EXISTS (
      SELECT 1 FROM pilot_email_log pel
      WHERE pel.pilot_signup_id = ps.id
        AND pel.email_type = $1
        AND pel.status = 'sent'
    )
`;

class PilotPhonelessReactivationService {
  constructor(options = {}) {
    this.pool = options.pool || null;
    this.emailService = options.emailService || new EmailService();
    this.bookingUrl = options.bookingUrl || process.env.CAL_BOOKING_URL || DEFAULT_BOOKING_URL;
    this.signupUrl = options.signupUrl || process.env.SIGNUP_URL || DEFAULT_SIGNUP_URL;
  }

  async countEligible() {
    if (!this.pool) throw new Error('DB pool not configured');
    const { rows } = await this.pool.query(COUNT_ELIGIBLE_SQL, [EMAIL_TYPE]);
    return (rows[0] && rows[0].count) || 0;
  }

  async getEligible(limit = DEFAULT_LIMIT) {
    if (!this.pool) throw new Error('DB pool not configured');
    const safeLimit = Math.min(limit, MAX_LIMIT);
    const { rows } = await this.pool.query(ELIGIBLE_SQL, [EMAIL_TYPE, safeLimit]);
    return rows;
  }

  async sendReactivationEmail(signup) {
    const firstName = this._extractFirstName(signup);
    const { subject, html } = this._buildEmail(firstName);

    const result = await this.emailService.send({
      to: signup.email,
      subject,
      html,
      from: `Stojan from LeadFlow <${this.emailService.fromEmail}>`,
      tags: [{ name: 'campaign', value: 'pilot-phoneless-reactivation' }],
      failIfUnconfigured: false,
    });

    await this._log(signup, result);
    return result;
  }

  async runCampaign({ dryRun = false, limit = DEFAULT_LIMIT } = {}) {
    if (!this.pool) throw new Error('DB pool not configured');

    const eligible = await this.countEligible();
    const signups = await this.getEligible(limit);

    if (dryRun) {
      return {
        dryRun: true,
        eligible,
        signups: signups.map(s => ({ id: s.id, email: s.email, name: s.name })),
      };
    }

    const sent = [];
    const failed = [];

    for (const signup of signups) {
      const result = await this.sendReactivationEmail(signup);
      if (result.success) {
        sent.push({ id: signup.id, email: signup.email });
      } else {
        failed.push({ id: signup.id, email: signup.email, error: result.error });
      }
    }

    return { eligible, sent: sent.length, failed: failed.length, sentList: sent, failedList: failed };
  }

  async _log(signup, result) {
    if (!this.pool) return;
    await this.pool.query(
      `INSERT INTO pilot_email_log (pilot_signup_id, email_type, recipient, subject, status, resend_id, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        signup.id,
        EMAIL_TYPE,
        signup.email,
        this._buildEmail(this._extractFirstName(signup)).subject,
        result.success ? 'sent' : 'failed',
        result.success ? (result.resend_id || result.id || null) : null,
        result.success ? null : (result.error || null),
      ]
    );
  }

  _extractFirstName(signup) {
    const raw = signup.first_name || signup.name || '';
    return raw.split(' ')[0].trim() || 'there';
  }

  _buildEmail(firstName) {
    const subject = `${firstName}, your LeadFlow pilot spot is still waiting for you`;
    return { subject, html: this._buildHtml(firstName, subject) };
  }

  _buildHtml(firstName, subject) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: #ffffff; border-radius: 8px; padding: 40px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <p style="font-size: 17px; color: #1f2937; margin: 0 0 16px;">Hi ${firstName},</p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      I'm Stojan, the founder of LeadFlow AI. You signed up for our pilot a while ago — and I
      want to make sure you don't miss your spot.
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      We couldn't reach you by text (no phone on file), so I'm dropping you this note directly.
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      <strong>LeadFlow responds to every new lead in under 30 seconds — 24/7, fully automated.</strong>
      Agents using it book more appointments without lifting a finger, even on weekends.
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 24px;">
      Your pilot spot is still open. Jump on a quick 15-minute call and I'll set everything up
      for you personally:
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${this.bookingUrl}"
         style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Book a 15-Min Setup Call
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin: 12px 0 0; text-align: center;">
      Rather set up on your own?
      <a href="${this.signupUrl}" style="color: #10b981; text-decoration: underline;">Start your free trial here</a>
    </p>

    <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">
      Reply to this email if you have any questions — I read every response.
    </p>

    <p style="font-size: 14px; color: #4b5563; margin: 16px 0 0;">
      Stojan<br>
      <span style="color: #6b7280;">Founder, LeadFlow AI</span>
    </p>
  </div>
</body>
</html>`;
  }
}

PilotPhonelessReactivationService.EMAIL_TYPE = EMAIL_TYPE;
PilotPhonelessReactivationService.DEFAULT_LIMIT = DEFAULT_LIMIT;
PilotPhonelessReactivationService.MAX_LIMIT = MAX_LIMIT;

module.exports = PilotPhonelessReactivationService;
