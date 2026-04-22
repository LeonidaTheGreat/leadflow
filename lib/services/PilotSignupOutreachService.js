'use strict';

const EmailService = require('./EmailService');

const STEP_WELCOME = 1;
const STEP_DAY3_REMINDER = 2;
const STEP_DAY7_FINAL = 3;

const DAY3_MS = 3 * 24 * 60 * 60 * 1000;
const DAY7_MS = 7 * 24 * 60 * 60 * 1000;

const EMAIL_TYPE = 'pilot_signup_outreach';

const DEFAULT_BOOKING_URL = 'https://cal.com/stojan-leadflow/15min';
const DEFAULT_SIGNUP_URL = 'https://leadflow-ai-five.vercel.app/signup/trial';

class PilotSignupOutreachService {
  constructor(options = {}) {
    this.pool = options.pool || null;
    this.emailService = options.emailService || new EmailService();
    this.bookingUrl = options.bookingUrl || process.env.CAL_BOOKING_URL || DEFAULT_BOOKING_URL;
    this.signupUrl = options.signupUrl || process.env.SIGNUP_URL || DEFAULT_SIGNUP_URL;
  }

  async getSignupsForStep(step) {
    if (!this.pool) throw new Error('DB pool not configured');

    let query;
    if (step === STEP_WELCOME) {
      query = `
        SELECT ps.id, ps.name, ps.email, ps.created_at
        FROM pilot_signups ps
        WHERE ps.follow_up_sent IS NOT TRUE
          AND NOT EXISTS (
            SELECT 1 FROM email_events ee
            WHERE ee.source_id = ps.id
              AND ee.email_type = $1
              AND ee.status = 'sent'
              AND ee.metadata->>'step' = $2
          )
        ORDER BY ps.created_at ASC
      `;
    } else {
      const ageDays = step === STEP_DAY3_REMINDER ? 3 : 7;
      query = `
        SELECT ps.id, ps.name, ps.email, ps.created_at
        FROM pilot_signups ps
        WHERE ps.created_at <= NOW() - INTERVAL '${ageDays} days'
          AND NOT EXISTS (
            SELECT 1 FROM real_estate_agents rea WHERE rea.email = ps.email
          )
          AND NOT EXISTS (
            SELECT 1 FROM email_events ee
            WHERE ee.source_id = ps.id
              AND ee.email_type = $1
              AND ee.status = 'sent'
              AND ee.metadata->>'step' = $2
          )
        ORDER BY ps.created_at ASC
      `;
    }

    const { rows } = await this.pool.query(query, [EMAIL_TYPE, String(step)]);
    return rows;
  }

  async sendStepEmail(signup, step) {
    const firstName = this._extractFirstName(signup.name);
    const { subject, html } = this._buildEmail(step, firstName);

    const result = await this.emailService.send({
      to: signup.email,
      subject,
      html,
      from: `Stojan from LeadFlow <${this.emailService.fromEmail}>`,
      tags: [{ name: 'campaign', value: 'pilot-signup-outreach' }],
      failIfUnconfigured: false,
    });

    await this._logEmail(signup, step, result);

    if (result.success && step === STEP_WELCOME) {
      await this.pool.query(
        'UPDATE pilot_signups SET follow_up_sent = true WHERE id = $1',
        [signup.id]
      );
    }

    return result;
  }

  async runSequence() {
    const results = {
      timestamp: new Date().toISOString(),
      steps: {},
    };

    for (const step of [STEP_WELCOME, STEP_DAY3_REMINDER, STEP_DAY7_FINAL]) {
      const stepResult = { eligible: 0, sent: 0, failed: 0, errors: [] };

      const signups = await this.getSignupsForStep(step);
      stepResult.eligible = signups.length;

      for (const signup of signups) {
        const sendResult = await this.sendStepEmail(signup, step);
        if (sendResult.success) {
          stepResult.sent++;
        } else {
          stepResult.failed++;
          stepResult.errors.push({ email: signup.email, error: sendResult.error });
        }
      }

      results.steps[step] = stepResult;
    }

    return results;
  }

  async _logEmail(signup, step, result) {
    if (!this.pool) return;

    const stepNames = { [STEP_WELCOME]: 'welcome', [STEP_DAY3_REMINDER]: 'day3_reminder', [STEP_DAY7_FINAL]: 'day7_final' };

    await this.pool.query(
      `INSERT INTO email_events (email_type, recipient, subject, status, sent_at, error_message, source_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        EMAIL_TYPE,
        signup.email,
        this._buildEmail(step, this._extractFirstName(signup.name)).subject,
        result.success ? 'sent' : 'failed',
        result.success ? new Date().toISOString() : null,
        result.success ? null : (result.error || null),
        signup.id,
        JSON.stringify({ step, step_name: stepNames[step] }),
      ]
    );
  }

  _extractFirstName(name) {
    if (!name) return 'there';
    return name.split(' ')[0] || 'there';
  }

  _buildEmail(step, firstName) {
    switch (step) {
      case STEP_WELCOME:
        return {
          subject: 'Your LeadFlow pilot is ready — let us show you how',
          html: this._buildWelcomeHtml(firstName),
        };
      case STEP_DAY3_REMINDER:
        return {
          subject: 'Quick question about your LeadFlow pilot',
          html: this._buildDay3Html(firstName),
        };
      case STEP_DAY7_FINAL:
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

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      I'm Stojan, the founder of LeadFlow AI. Thanks for signing up — I'm excited to show you what we've built.
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      <strong>Here's what your pilot includes:</strong>
    </p>
    <ul style="font-size: 15px; color: #4b5563; margin: 0 0 16px; padding-left: 20px;">
      <li>AI-powered lead responses in under 30 seconds, 24/7</li>
      <li>Follow Up Boss CRM integration</li>
      <li>Automated appointment booking via Cal.com</li>
      <li>Full dashboard to track every conversation</li>
    </ul>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 24px;">
      The fastest way to get started is a quick 15-minute call where I'll walk you through setup personally:
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${this.bookingUrl}"
         style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Book a 15-Min Setup Call
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin: 16px 0 8px; text-align: center;">
      Prefer to get started on your own?
      <a href="${this.signupUrl}" style="color: #10b981; text-decoration: underline;">Create your account here</a>
    </p>

    <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">
      If you have any questions, just reply to this email — it comes straight to me.
    </p>

    <p style="font-size: 14px; color: #4b5563; margin: 16px 0 0;">
      Stojan<br>
      <span style="color: #6b7280;">Founder, LeadFlow AI</span>
    </p>
  </div>
</body>
</html>`;
  }

  _buildDay3Html(firstName) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: #ffffff; border-radius: 8px; padding: 40px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <p style="font-size: 17px; color: #1f2937; margin: 0 0 16px;">Hi ${firstName},</p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      Quick question: how many leads came in over the past few days that you couldn't respond to within 5 minutes?
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      Studies show that responding within 60 seconds makes you <strong>391% more likely</strong> to convert a lead. Most agents take 4+ hours. LeadFlow responds in under 30 seconds — every time, day or night.
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 24px;">
      Your pilot spot is still open. It takes 2 minutes to create your account and see your first AI response:
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${this.signupUrl}"
         style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Start Your Free Pilot
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">
      Reply if you have questions — happy to help.
    </p>

    <p style="font-size: 14px; color: #4b5563; margin: 16px 0 0;">
      Stojan<br>
      <span style="color: #6b7280;">Founder, LeadFlow AI</span>
    </p>
  </div>
</body>
</html>`;
  }

  _buildDay7Html(firstName) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: #ffffff; border-radius: 8px; padding: 40px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <p style="font-size: 17px; color: #1f2937; margin: 0 0 16px;">Hi ${firstName},</p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      I wanted to reach out one last time. We're filling pilot spots quickly and I'd hate for you to miss out.
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 12px;">
      To make it a no-brainer, I'm offering <strong>50% off your first month</strong> if you sign up this week. That's AI-powered lead response for less than the cost of missing a single deal.
    </p>

    <p style="font-size: 15px; color: #4b5563; margin: 0 0 24px;">
      Once you're set up, LeadFlow handles every new lead instantly — so you never lose another opportunity to slow response times.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${this.signupUrl}"
         style="display: inline-block; background: #dc2626; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Claim 50% Off — Sign Up Now
      </a>
    </div>

    <p style="font-size: 13px; color: #9ca3af; margin: 16px 0 0; text-align: center;">
      This offer expires at the end of the week.
    </p>

    <p style="font-size: 14px; color: #4b5563; margin: 24px 0 0;">
      Stojan<br>
      <span style="color: #6b7280;">Founder, LeadFlow AI</span>
    </p>
  </div>
</body>
</html>`;
  }
}

PilotSignupOutreachService.STEP_WELCOME = STEP_WELCOME;
PilotSignupOutreachService.STEP_DAY3_REMINDER = STEP_DAY3_REMINDER;
PilotSignupOutreachService.STEP_DAY7_FINAL = STEP_DAY7_FINAL;
PilotSignupOutreachService.EMAIL_TYPE = EMAIL_TYPE;

module.exports = PilotSignupOutreachService;
