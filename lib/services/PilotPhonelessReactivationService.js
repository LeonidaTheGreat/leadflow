'use strict';

const EMAIL_TYPE = 'pilot_phoneless_reactivation';
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const DEFAULT_BOOKING_URL = 'https://cal.com/stojan-leadflow/15min';
const DEFAULT_SIGNUP_URL = 'https://leadflow-ai-five.vercel.app/signup/trial';

const ELIGIBLE_SQL = `
  SELECT ps.id, ps.email, ps.name, ps.created_at
  FROM pilot_signups ps
  WHERE (ps.phone IS NULL OR ps.phone = '')
    AND ps.email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM email_events ee
      WHERE ee.source_id = ps.id::uuid
        AND ee.email_type = $1
        AND ee.status = 'sent'
    )
  ORDER BY ps.created_at ASC
  LIMIT $2
`;

const COUNT_ELIGIBLE_SQL = `
  SELECT COUNT(*)::integer AS count
  FROM pilot_signups ps
  WHERE (ps.phone IS NULL OR ps.phone = '')
    AND ps.email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM email_events ee
      WHERE ee.source_id = ps.id::uuid
        AND ee.email_type = $1
        AND ee.status = 'sent'
    )
`;

const LOG_EMAIL_SQL = `
  INSERT INTO email_events (email_type, recipient, subject, status, sent_at, error_message, source_id, metadata)
  VALUES ($1, $2, $3, $4, $5, $6, $7::uuid, $8)
`;

class PilotPhonelessReactivationService {
  constructor(options = {}) {
    this.pool = options.pool || null;
    this.emailService = options.emailService || null;
    this.bookingUrl = options.bookingUrl || process.env.CAL_BOOKING_URL || DEFAULT_BOOKING_URL;
    this.signupUrl = options.signupUrl || process.env.SIGNUP_URL || DEFAULT_SIGNUP_URL;
  }

  async runCampaign({ dryRun, limit = DEFAULT_LIMIT }) {
    if (!this.pool) throw new Error('DB pool not configured');

    const resolvedLimit = Math.min(Math.max(1, limit), MAX_LIMIT);

    const [{ rows: countRows }, { rows: signupRows }] = await Promise.all([
      this.pool.query(COUNT_ELIGIBLE_SQL, [EMAIL_TYPE]),
      this.pool.query(ELIGIBLE_SQL, [EMAIL_TYPE, resolvedLimit]),
    ]);

    const eligible = (countRows[0] && countRows[0].count) || 0;
    const signups = signupRows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      created_at: row.created_at,
    }));

    if (dryRun) {
      return { eligible, signups };
    }

    const sent = [];
    const failed = [];

    for (const signup of signups) {
      const firstName = this._firstName(signup.name);
      const { subject, html } = this._buildEmail(firstName);

      const result = await this.emailService.send({
        to: signup.email,
        subject,
        html,
        from: `Stojan from LeadFlow <${this.emailService.fromEmail}>`,
        tags: [{ name: 'campaign', value: 'pilot-phoneless-reactivation' }],
        failIfUnconfigured: false,
      });

      await this._logEmail(signup, subject, result);

      if (result.success) {
        sent.push({ id: signup.id, email: signup.email, resend_id: result.resend_id || null });
      } else {
        failed.push({ id: signup.id, email: signup.email, error: result.error || 'Email send failed' });
      }
    }

    return {
      eligible,
      attempted: signups.length,
      sent_count: sent.length,
      failed_count: failed.length,
      sent,
      failed,
    };
  }

  async _logEmail(signup, subject, result) {
    if (!this.pool) return;
    await this.pool.query(LOG_EMAIL_SQL, [
      EMAIL_TYPE,
      signup.email,
      subject,
      result.success ? 'sent' : 'failed',
      result.success ? new Date().toISOString() : null,
      result.success ? null : (result.error || null),
      signup.id,
      JSON.stringify({}),
    ]);
  }

  _firstName(name) {
    if (!name) return 'there';
    return name.split(' ')[0] || 'there';
  }

  _buildEmail(firstName) {
    const subject = 'Your LeadFlow pilot spot is still open — one quick step';
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: #ffffff; border-radius: 8px; padding: 40px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <p style="font-size: 17px; margin: 0 0 16px;">Hi ${firstName},</p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 14px;">
      I noticed you signed up for the LeadFlow pilot but your phone number wasn't included — so our SMS lead response system hasn't been able to reach you yet.
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 14px;">
      LeadFlow responds to every new lead in <strong>under 30 seconds</strong>, 24/7 — so you never lose another deal to a slow response. A phone number is needed to activate the SMS replies.
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 24px;">
      Your pilot spot is still open. Pick the easiest next step:
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${this.signupUrl}"
         style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-bottom: 12px;">
        Create Account (2 min)
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin: 8px 0; text-align: center;">
      Prefer a walkthrough?
      <a href="${this.bookingUrl}" style="color: #10b981; text-decoration: underline;">Book a 15-min setup call</a>
    </p>

    <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">
      Just reply if you have any questions — it comes straight to me.
    </p>

    <p style="font-size: 14px; color: #4b5563; margin: 16px 0 0;">
      Stojan<br>
      <span style="color: #6b7280;">Founder, LeadFlow AI</span>
    </p>
  </div>
</body>
</html>`;
    return { subject, html };
  }
}

PilotPhonelessReactivationService.EMAIL_TYPE = EMAIL_TYPE;
PilotPhonelessReactivationService.DEFAULT_LIMIT = DEFAULT_LIMIT;

module.exports = PilotPhonelessReactivationService;
