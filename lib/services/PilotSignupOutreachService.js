'use strict';

/*
TASK SPEC (818e382b-fd05-4e61-8634-c78b02dd7c4c)
What:
- Update lib/services/PilotSignupOutreachService.js:
  - Replace legacy follow_up_sent/email_events-only gating with stage-based progression using pilot_signups.follow_up_stage and pilot_signups.last_follow_up_at.
  - Add conversion gate against real_estate_agents; converted signups are marked terminal (stage=3).
  - Log outreach attempts in pilot_email_log (follow_up_1/2/3) and only advance stage on successful send.
  - Keep all business logic in this service class and expose runSequence() summary for cron usage.
- Update scripts/tasks/pilot-signup-outreach.js to print the new runSequence summary shape.
- Update scripts/db/migrate-pilot-signup-follow-up.js to create/align required columns and pilot_email_log table.
- Update tests/unit/pilot-signup-outreach-service.test.js to verify staged timing gates, conversion gate, idempotency, and logging.

Verify:
- node tests/unit/pilot-signup-outreach-service.test.js exits 0.
- npm test exits 0.
- npm run build exits 0.
- psql "$LOCAL_PG_URL" -c "\d pilot_signups" includes follow_up_stage + last_follow_up_at.
- psql "$LOCAL_PG_URL" -c "\d pilot_email_log" succeeds.

Boundaries:
- Do not modify routes/ handlers.
- Do not modify PilotConversionService milestone logic/templates.
- Do not alter billing/Stripe logic or unrelated outreach systems.
*/

const EmailService = require('./EmailService');

const STAGE_0 = 0;
const STAGE_1 = 1;
const STAGE_2 = 2;
const STAGE_3 = 3;

const EMAIL_TYPE = 'pilot_signup_outreach';

const DEFAULT_BOOKING_URL = 'https://cal.com/stojan-leadflow/15min';
const DEFAULT_SIGNUP_URL = 'https://leadflow-ai-five.vercel.app/signup';

const DEFAULT_EMAIL_1_DELAY_HOURS = 24;
const DEFAULT_EMAIL_2_DELAY_DAYS = 3;
const DEFAULT_EMAIL_3_DELAY_DAYS = 4;

class PilotSignupOutreachService {
  constructor(options = {}) {
    this.pool = options.pool || null;
    this.emailService = options.emailService || new EmailService();
    this.bookingUrl = options.bookingUrl || process.env.CAL_BOOKING_URL || DEFAULT_BOOKING_URL;
    this.signupUrl = options.signupUrl || process.env.SIGNUP_URL || DEFAULT_SIGNUP_URL;

    this.email1DelayHours = Number(options.email1DelayHours || process.env.PILOT_FOLLOW_UP_EMAIL_1_DELAY_HOURS || DEFAULT_EMAIL_1_DELAY_HOURS);
    this.email2DelayDays = Number(options.email2DelayDays || process.env.PILOT_FOLLOW_UP_EMAIL_2_DELAY_DAYS || DEFAULT_EMAIL_2_DELAY_DAYS);
    this.email3DelayDays = Number(options.email3DelayDays || process.env.PILOT_FOLLOW_UP_EMAIL_3_DELAY_DAYS || DEFAULT_EMAIL_3_DELAY_DAYS);
  }

  async getPendingSignups() {
    if (!this.pool) throw new Error('DB pool not configured');

    const { rows } = await this.pool.query(
      `SELECT id, name, email, created_at, follow_up_stage, last_follow_up_at
       FROM pilot_signups
       WHERE COALESCE(follow_up_stage, 0) < $1
       ORDER BY created_at ASC`,
      [STAGE_3]
    );

    return rows;
  }

  async isConverted(email) {
    const { rows } = await this.pool.query(
      'SELECT 1 FROM real_estate_agents WHERE email = $1 LIMIT 1',
      [email]
    );
    return rows.length > 0;
  }

  getNextEligibleStep(signup, now = new Date()) {
    const stage = Number(signup.follow_up_stage || STAGE_0);
    const createdAt = signup.created_at ? new Date(signup.created_at) : null;
    const lastFollowUpAt = signup.last_follow_up_at ? new Date(signup.last_follow_up_at) : null;

    if (stage === STAGE_0) {
      if (!createdAt) return null;
      const dueAt = new Date(createdAt.getTime() + this.email1DelayHours * 60 * 60 * 1000);
      return now >= dueAt ? STAGE_1 : null;
    }

    if (!lastFollowUpAt) return null;

    if (stage === STAGE_1) {
      const dueAt = new Date(lastFollowUpAt.getTime() + this.email2DelayDays * 24 * 60 * 60 * 1000);
      return now >= dueAt ? STAGE_2 : null;
    }

    if (stage === STAGE_2) {
      const dueAt = new Date(lastFollowUpAt.getTime() + this.email3DelayDays * 24 * 60 * 60 * 1000);
      return now >= dueAt ? STAGE_3 : null;
    }

    return null;
  }

  async markAsCompleted(signupId) {
    await this.pool.query(
      'UPDATE pilot_signups SET follow_up_stage = $1 WHERE id = $2',
      [STAGE_3, signupId]
    );
  }

  async advanceStage(signupId, nextStage, nowIso) {
    await this.pool.query(
      'UPDATE pilot_signups SET follow_up_stage = $1, last_follow_up_at = $2 WHERE id = $3',
      [nextStage, nowIso, signupId]
    );
  }

  async sendStepEmail(signup, step) {
    const firstName = this._extractFirstName(signup.name);
    const { subject, html } = this._buildEmail(step, firstName);

    const result = await this.emailService.send({
      to: signup.email,
      subject,
      html,
      from: `Stojan <${this.emailService.fromEmail}>`,
      tags: [{ name: 'campaign', value: 'pilot-signup-outreach' }],
      failIfUnconfigured: false,
    });

    await this.logPilotEmail(signup, step, result);
    return result;
  }

  async runSequence(now = new Date()) {
    if (!this.pool) throw new Error('DB pool not configured');

    const results = {
      timestamp: now.toISOString(),
      processed: 0,
      sent: 0,
      skipped: 0,
      converted: 0,
      errors: 0,
      errorDetails: [],
    };

    const signups = await this.getPendingSignups();

    for (const signup of signups) {
      results.processed++;

      const converted = await this.isConverted(signup.email);
      if (converted) {
        await this.markAsCompleted(signup.id);
        results.converted++;
        continue;
      }

      const nextStep = this.getNextEligibleStep(signup, now);
      if (!nextStep) {
        results.skipped++;
        continue;
      }

      const sendResult = await this.sendStepEmail(signup, nextStep);
      if (sendResult.success) {
        await this.advanceStage(signup.id, nextStep, now.toISOString());
        results.sent++;
      } else {
        results.errors++;
        results.errorDetails.push({ email: signup.email, step: nextStep, error: sendResult.error || 'unknown_error' });
      }
    }

    return results;
  }

  async logPilotEmail(signup, step, result) {
    if (!this.pool) return;

    const emailType = step === STAGE_1 ? 'follow_up_1' : step === STAGE_2 ? 'follow_up_2' : 'follow_up_3';
    const subject = this._buildEmail(step, this._extractFirstName(signup.name)).subject;

    await this.pool.query(
      `INSERT INTO pilot_email_log (pilot_signup_id, email_type, recipient, subject, status, resend_id, error_message, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        signup.id,
        emailType,
        signup.email,
        subject,
        result.success ? 'sent' : 'failed',
        result.id || null,
        result.success ? null : (result.error || null),
        new Date().toISOString(),
      ]
    );
  }

  _extractFirstName(name) {
    if (!name) return 'there';
    return name.split(' ')[0] || 'there';
  }

  _buildEmail(step, firstName) {
    switch (step) {
      case STAGE_1:
        return {
          subject: 'Your LeadFlow pilot is ready — let us show you how',
          html: this._buildWelcomeHtml(firstName),
        };
      case STAGE_2:
        return {
          subject: 'Quick question about your LeadFlow pilot',
          html: this._buildDay3Html(firstName),
        };
      case STAGE_3:
        return {
          subject: 'Last chance — pilot spots filling up',
          html: this._buildDay7Html(firstName),
        };
      default:
        throw new Error(`Unknown step: ${step}`);
    }
  }

  _buildWelcomeHtml(firstName) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: #ffffff; border-radius: 8px; padding: 40px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <p style="font-size: 17px; color: #1f2937; margin: 0 0 16px;">Hi ${firstName},</p>
    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">I'm Stojan, the founder of LeadFlow AI. Thanks for signing up — I'm excited to show you what we've built.</p>
    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;"><strong>Here's what your pilot includes:</strong></p>
    <ul style="font-size: 15px; color: #4b5563; margin: 0 0 16px; padding-left: 20px;">
      <li>AI-powered lead responses in under 30 seconds, 24/7</li><li>Follow Up Boss CRM integration</li><li>Automated appointment booking via Cal.com</li><li>Full dashboard to track every conversation</li>
    </ul>
    <div style="text-align: center; margin: 24px 0;"><a href="${this.bookingUrl}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Book a 15-Min Setup Call</a></div>
    <p style="font-size: 14px; color: #6b7280; margin: 16px 0 8px; text-align: center;">Prefer to get started on your own? <a href="${this.signupUrl}" style="color: #10b981; text-decoration: underline;">Create your account here</a></p>
  </div>
</body>
</html>`;
  }

  _buildDay3Html(firstName) {
    return `<!DOCTYPE html>
<html><body><p>Hi ${firstName},</p><p>Quick question: how many leads came in over the past few days that you couldn't respond to within 5 minutes?</p><p>Your pilot spot is still open. It takes 2 minutes to create your account:</p><p><a href="${this.signupUrl}">Start Your Free Pilot</a></p></body></html>`;
  }

  _buildDay7Html(firstName) {
    return `<!DOCTYPE html>
<html><body><p>Hi ${firstName},</p><p>This is my last email. Pilot spots are filling quickly.</p><p>Claim 50% off your first month if you sign up this week:</p><p><a href="${this.signupUrl}">Claim 50% Off — Sign Up Now</a></p></body></html>`;
  }
}

PilotSignupOutreachService.STAGE_0 = STAGE_0;
PilotSignupOutreachService.STAGE_1 = STAGE_1;
PilotSignupOutreachService.STAGE_2 = STAGE_2;
PilotSignupOutreachService.STAGE_3 = STAGE_3;
PilotSignupOutreachService.EMAIL_TYPE = EMAIL_TYPE;

module.exports = PilotSignupOutreachService;
