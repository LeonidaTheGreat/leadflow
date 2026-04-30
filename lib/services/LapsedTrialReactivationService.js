'use strict';

const EmailService = require('./EmailService');

const ELIGIBLE_AGENTS_SQL = `
  SELECT id, email, first_name, trial_ends_at
  FROM real_estate_agents
  WHERE trial_ends_at IS NOT NULL
    AND trial_ends_at < NOW()
    AND COALESCE(subscription_status, 'inactive') != 'active'
    AND COALESCE(trial_email_expired_sent, false) = false
    AND email IS NOT NULL
  ORDER BY trial_ends_at ASC
  LIMIT $1
`;

const COUNT_ELIGIBLE_SQL = `
  SELECT COUNT(*)::integer AS count
  FROM real_estate_agents
  WHERE trial_ends_at IS NOT NULL
    AND trial_ends_at < NOW()
    AND COALESCE(subscription_status, 'inactive') != 'active'
    AND COALESCE(trial_email_expired_sent, false) = false
    AND email IS NOT NULL
`;

const MARK_SENT_SQL = `
  UPDATE real_estate_agents
  SET trial_email_expired_sent = true,
      updated_at = NOW()
  WHERE id = $1
`;

class LapsedTrialReactivationService {
  constructor(options = {}) {
    this.pool = options.pool || null;
    this.emailService = options.emailService || new EmailService({
      fromEmail: options.fromEmail || process.env.FROM_EMAIL || 'stojan@leadflow.ai',
    });
    this.appUrl = (options.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app').replace(/\/$/, '');
  }

  async runCampaign({ dryRun, limit }) {
    if (!this.pool) {
      throw new Error('DB pool not configured');
    }

    const [{ rows: countRows }, { rows: eligibleRows }] = await Promise.all([
      this.pool.query(COUNT_ELIGIBLE_SQL),
      this.pool.query(ELIGIBLE_AGENTS_SQL, [limit]),
    ]);

    const eligible = (countRows[0] && countRows[0].count) || 0;
    const agents = eligibleRows.map(agent => ({
      id: agent.id,
      email: agent.email,
      first_name: agent.first_name,
      trial_ends_at: agent.trial_ends_at,
    }));

    if (dryRun) {
      return { eligible, agents };
    }

    const sent = [];
    const failed = [];

    for (const agent of agents) {
      const sendResult = await this.emailService.sendLapsedTrialReactivation({
        to: agent.email,
        firstName: agent.first_name,
        dashboardUrl: `${this.appUrl}/dashboard?utm_source=reactivation_email&utm_medium=email&utm_campaign=lapsed_trial_reactivation`,
      });

      if (!sendResult.success) {
        failed.push({ id: agent.id, email: agent.email, error: sendResult.error || 'Email send failed' });
        continue;
      }

      await this.pool.query(MARK_SENT_SQL, [agent.id]);
      sent.push({ id: agent.id, email: agent.email, resend_id: sendResult.resend_id || null });
    }

    return {
      eligible,
      attempted: agents.length,
      sent_count: sent.length,
      failed_count: failed.length,
      sent,
      failed,
    };
  }
}

module.exports = LapsedTrialReactivationService;
