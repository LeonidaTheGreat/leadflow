'use strict';

const EmailService = require('./EmailService');

// Agents where email is verified but onboarding never started (no login, no completion)
const COHORT_SQL = `
  SELECT id, email, first_name
  FROM real_estate_agents
  WHERE email_verified = true
    AND onboarding_completed = false
    AND plan_tier = 'pilot'
    AND last_login_at IS NULL
    AND email IS NOT NULL
  ORDER BY created_at ASC
`;

// Get prior sends for the cohort across all 3 reactivation email types
const SENT_LOG_SQL = `
  SELECT agent_id, email_type, sent_at
  FROM pilot_email_log
  WHERE agent_id = ANY($1)
    AND email_type IN ('pilot_reactivation_1', 'pilot_reactivation_2', 'pilot_reactivation_3')
`;

const LOG_SEND_SQL = `
  INSERT INTO pilot_email_log (agent_id, email_type, recipient, subject, status, resend_id, error_message, sent_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
`;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Days after email_1 before sending email_2 / email_3
const DELAY_EMAIL_2_DAYS = 3;
const DELAY_EMAIL_3_DAYS = 7;

class PilotReactivationService {
  constructor(options = {}) {
    this.pool = options.pool || null;
    this.emailService = options.emailService || new EmailService({
      fromEmail: process.env.FROM_EMAIL || 'stojan@landyourleads.com',
    });
    this.appUrl = (options.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app').replace(/\/$/, '');
  }

  async getCohort() {
    if (!this.pool) throw new Error('DB pool not configured');
    const { rows } = await this.pool.query(COHORT_SQL);
    return rows;
  }

  // Returns Map<agentId, Map<emailType, Date>>
  async getSentLog(agentIds) {
    if (!agentIds.length) return new Map();
    const { rows } = await this.pool.query(SENT_LOG_SQL, [agentIds]);
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.agent_id)) map.set(row.agent_id, new Map());
      map.get(row.agent_id).set(row.email_type, new Date(row.sent_at));
    }
    return map;
  }

  async logSend({ agentId, emailType, recipient, subject, status, resendId, errorMessage }) {
    await this.pool.query(LOG_SEND_SQL, [
      agentId, emailType, recipient, subject, status,
      resendId || null, errorMessage || null,
    ]);
  }

  buildLoginUrl(path = '') {
    return `${this.appUrl}/dashboard${path}?utm_source=pilot_reactivation&utm_medium=email`;
  }

  buildEmail1Html(firstName) {
    const name = firstName || 'there';
    const loginUrl = this.buildLoginUrl();
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1f2937;max-width:560px;margin:0 auto;padding:20px;background:#f9fafb;">
  <div style="background:#ffffff;border-radius:8px;padding:32px 28px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <p style="font-size:17px;margin:0 0 16px;">Hi ${name},</p>
    <p style="font-size:15px;color:#4b5563;margin:0 0 14px;">Your LeadFlow pilot account is active and ready — you just need to log in to get started.</p>
    <p style="font-size:15px;color:#4b5563;margin:0 0 8px;"><strong>3-step quick start:</strong></p>
    <ol style="font-size:15px;color:#4b5563;margin:0 0 22px;padding-left:20px;">
      <li style="margin-bottom:8px;"><strong>Log in</strong> to your dashboard</li>
      <li style="margin-bottom:8px;"><strong>Connect your FUB account</strong> (takes ~2 min)</li>
      <li style="margin-bottom:8px;"><strong>Watch AI respond</strong> to your next lead in under 30 seconds</li>
    </ol>
    <div style="text-align:center;margin:24px 0;">
      <a href="${loginUrl}" style="display:inline-block;background:#10b981;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Log In to LeadFlow &#8594;</a>
    </div>
    <p style="font-size:14px;color:#6b7280;margin:24px 0 0;">Questions? Reply to this email — it comes straight to me.</p>
    <p style="font-size:14px;color:#4b5563;margin:16px 0 0;">Stojan<br><span style="color:#6b7280;">Founder, LeadFlow AI</span></p>
  </div>
</body>
</html>`;
  }

  buildEmail2Html(firstName) {
    const name = firstName || 'there';
    const loginUrl = this.buildLoginUrl();
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1f2937;max-width:560px;margin:0 auto;padding:20px;background:#f9fafb;">
  <div style="background:#ffffff;border-radius:8px;padding:32px 28px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <p style="font-size:17px;margin:0 0 16px;">Hi ${name},</p>
    <p style="font-size:15px;color:#4b5563;margin:0 0 14px;">Don't lose your pilot spot — agents using LeadFlow are responding to leads <strong>5x faster</strong> than those who don't.</p>
    <p style="font-size:15px;color:#4b5563;margin:0 0 22px;">Your account is still active. It takes less than 5 minutes to connect your CRM and get your first AI response.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${loginUrl}" style="display:inline-block;background:#10b981;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Activate Your Pilot &#8594;</a>
    </div>
    <p style="font-size:14px;color:#4b5563;margin:16px 0 0;">Stojan<br><span style="color:#6b7280;">Founder, LeadFlow AI</span></p>
  </div>
</body>
</html>`;
  }

  buildEmail3Html(firstName) {
    const name = firstName || 'there';
    const loginUrl = this.buildLoginUrl();
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1f2937;max-width:560px;margin:0 auto;padding:20px;background:#f9fafb;">
  <div style="background:#ffffff;border-radius:8px;padding:32px 28px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <p style="font-size:17px;margin:0 0 16px;">Hi ${name},</p>
    <p style="font-size:15px;color:#4b5563;margin:0 0 14px;">Quick offer — I'll personally jump on a 15-minute call with you and get LeadFlow running from scratch.</p>
    <p style="font-size:15px;color:#4b5563;margin:0 0 14px;">You'll leave the call with AI responding to every new lead in under 30 seconds — zero setup on your end.</p>
    <p style="font-size:15px;color:#4b5563;margin:0 0 22px;">Log in and reply "call" to this email — I'll send you a calendar link.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${loginUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Log In + Claim Setup Call &#8594;</a>
    </div>
    <p style="font-size:14px;color:#4b5563;margin:16px 0 0;">Stojan<br><span style="color:#6b7280;">Founder, LeadFlow AI</span></p>
  </div>
</body>
</html>`;
  }

  // Determine which email(s) to send to each agent in the cohort.
  // Returns an array of { agent, emailType, subject, html } objects.
  resolveEmailsToSend(agents, sentLog, now = new Date()) {
    const toSend = [];

    for (const agent of agents) {
      const sent = sentLog.get(agent.id) || new Map();
      const email1SentAt = sent.get('pilot_reactivation_1');
      const hasEmail2 = sent.has('pilot_reactivation_2');
      const hasEmail3 = sent.has('pilot_reactivation_3');

      if (!email1SentAt) {
        // Email 1: immediate — only if no prior reactivation email in last 24h
        const anyRecentSend = [...sent.values()].some(d => now - d < MS_PER_DAY);
        if (!anyRecentSend) {
          toSend.push({
            agent,
            emailType: 'pilot_reactivation_1',
            subject: 'Your LeadFlow pilot account is ready — log in here',
            html: this.buildEmail1Html(agent.first_name),
          });
        }
      } else if (!hasEmail2 && (now - email1SentAt) >= DELAY_EMAIL_2_DAYS * MS_PER_DAY) {
        // Email 2: +3 days after email 1
        toSend.push({
          agent,
          emailType: 'pilot_reactivation_2',
          subject: "Don't lose your pilot spot — agents using LeadFlow respond 5x faster",
          html: this.buildEmail2Html(agent.first_name),
        });
      } else if (email1SentAt && !hasEmail3 && (now - email1SentAt) >= DELAY_EMAIL_3_DAYS * MS_PER_DAY) {
        // Email 3: +7 days after email 1 (only if email 2 was already sent)
        if (hasEmail2) {
          toSend.push({
            agent,
            emailType: 'pilot_reactivation_3',
            subject: 'Quick offer — 15-min setup call, I\'ll get it running for you',
            html: this.buildEmail3Html(agent.first_name),
          });
        }
      }
    }

    return toSend;
  }

  async processSequence(options = {}) {
    const { dryRun = false } = options;

    const agents = await this.getCohort();
    if (!agents.length) {
      return { total_cohort: 0, emails_sent: 0, emails_failed: 0, emails_skipped: 0, results: [] };
    }

    const agentIds = agents.map(a => a.id);
    const sentLog = await this.getSentLog(agentIds);
    const toSend = this.resolveEmailsToSend(agents, sentLog);

    const results = [];
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const { agent, emailType, subject, html } of toSend) {
      if (dryRun) {
        results.push({ agentId: agent.id, email: agent.email, emailType, status: 'dry_run' });
        continue;
      }

      const sendResult = await this.emailService.send({
        to: agent.email,
        subject,
        html,
        from: `Stojan from LeadFlow <${this.emailService.fromEmail}>`,
        tags: [{ name: 'campaign', value: 'pilot-reactivation' }],
        failIfUnconfigured: false,
      });

      if (sendResult.success) {
        await this.logSend({
          agentId: agent.id,
          emailType,
          recipient: agent.email,
          subject,
          status: 'sent',
          resendId: sendResult.resend_id || sendResult.id || null,
        });
        emailsSent++;
        results.push({ agentId: agent.id, email: agent.email, emailType, status: 'sent', resendId: sendResult.resend_id || sendResult.id });
      } else {
        await this.logSend({
          agentId: agent.id,
          emailType,
          recipient: agent.email,
          subject,
          status: 'failed',
          errorMessage: sendResult.error || 'Unknown error',
        });
        emailsFailed++;
        results.push({ agentId: agent.id, email: agent.email, emailType, status: 'failed', error: sendResult.error });
      }
    }

    return {
      total_cohort: agents.length,
      emails_pending: toSend.length,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      emails_skipped: agents.length - toSend.length,
      dry_run: dryRun,
      results,
    };
  }
}

module.exports = PilotReactivationService;
