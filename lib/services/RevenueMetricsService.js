/*
TASK SPEC (40007d35-be7a-446d-b26d-606cb81472e7)
What:
- Add lib/services/RevenueMetricsService.js with class RevenueMetricsService methods:
  computeSnapshot(), upsertSnapshot(), maybeSendThresholdAlert(), getFunnelSeries().
- Add scripts/tasks/revenue-snapshot.js to run daily snapshot + alert logic.
- Add product/lead-response/dashboard/app/api/admin/revenue/route.ts and app/admin/revenue/page.tsx for admin funnel dashboard.
- Update scripts/shell/orchestrator-heartbeat-runner.sh to invoke revenue snapshot task.
- Add tests/unit/revenue-metrics-service.test.js for snapshot math and threshold alert triggering.
Verify:
- node tests/unit/revenue-metrics-service.test.js passes.
- node scripts/tasks/revenue-snapshot.js writes/upserts today's row in revenue_metrics.
- psql "$LOCAL_PG_URL" -c "SELECT date,active_subscribers,trial_users,mrr_cents,new_subscribers,conversion_rate FROM revenue_metrics WHERE project_id='leadflow' ORDER BY date DESC LIMIT 1;" shows today.
- npm run lint, npm test, npm run build, npm audit --audit-level=high all pass.
Boundaries:
- Do not modify Stripe webhooks/subscription flow.
- Do not modify existing metrics table logic; use revenue_metrics only.
- Do not change DB schema/migrations in this task.
*/

'use strict';

const https = require('https');
const { REVENUE_FUNNEL_THRESHOLDS, REVENUE_METRICS_PROJECT_ID, SPARKLINE_DAYS } = require('../config/revenue-funnel');

class RevenueMetricsService {
  constructor(dbPool, options = {}) {
    this.dbPool = dbPool;
    this.projectId = options.projectId || REVENUE_METRICS_PROJECT_ID;
    this.botToken = options.botToken || process.env.ORCHESTRATOR_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = options.chatId || process.env.TELEGRAM_CHAT_ID;
    this.topicId = options.topicId || process.env.TELEGRAM_TOPIC_ID;
    this.logger = options.logger || console;
    this.telegramRequest = options.telegramRequest || https.request;
  }

  async computeSnapshot(snapshotDate = new Date()) {
    const activeSubscribers = await this.scalar(`SELECT COUNT(*)::int FROM subscriptions WHERE status = 'active'`);
    const trialUsers = await this.scalar(`SELECT COUNT(*)::int FROM real_estate_agents WHERE subscription_status = 'inactive' AND trial_ends_at > NOW()`);
    const mrrCents = await this.scalar(`SELECT COALESCE(SUM(CASE plan_tier WHEN 'starter' THEN 4900 WHEN 'pro' THEN 14900 WHEN 'team' THEN 39900 WHEN 'brokerage' THEN 99900 ELSE 0 END),0)::int FROM subscriptions WHERE status = 'active'`);

    const newSubscribers = await this.scalar(
      `SELECT COUNT(*)::int FROM subscriptions WHERE status = 'active' AND activated_at >= $1::date AND activated_at < ($1::date + INTERVAL '1 day')`,
      [snapshotDate.toISOString().slice(0, 10)]
    );

    const totalFunnelBase = activeSubscribers + trialUsers;
    const conversionRate = totalFunnelBase > 0 ? Number((activeSubscribers / totalFunnelBase).toFixed(4)) : 0;

    const totalAgents = await this.scalar(`SELECT COUNT(*)::int FROM real_estate_agents`);
    const fubConnectedAgents = await this.scalar(`SELECT COUNT(DISTINCT agent_id)::int FROM agent_integrations`);
    const ahaCompletedAgents = await this.scalar(`SELECT COUNT(*)::int FROM real_estate_agents WHERE aha_completed = true`);
    const pilotIdentified = await this.scalar(`SELECT COUNT(*)::int FROM pilot_recruitment_targets`);
    const pilotContacted = await this.scalar(`SELECT COUNT(*)::int FROM pilot_recruitment_targets WHERE contacted = true`);

    const fubActivationRate = totalAgents > 0 ? Number((fubConnectedAgents / totalAgents).toFixed(4)) : 0;
    const ahaCompletionRate = totalAgents > 0 ? Number((ahaCompletedAgents / totalAgents).toFixed(4)) : 0;
    const pilotContactedRate = pilotIdentified > 0 ? Number((pilotContacted / pilotIdentified).toFixed(4)) : 0;

    const data = {
      fub_activation_rate: fubActivationRate,
      aha_completion_rate: ahaCompletionRate,
      pilot_contacted_rate: pilotContactedRate,
      funnel: {
        signups: { count: totalAgents, rate: 1 },
        fub_connected: { count: fubConnectedAgents, rate: fubActivationRate },
        aha_moment: { count: ahaCompletedAgents, rate: ahaCompletionRate },
        paid: { count: activeSubscribers, rate: totalAgents > 0 ? Number((activeSubscribers / totalAgents).toFixed(4)) : 0 },
      },
    };

    return {
      project_id: this.projectId,
      date: snapshotDate.toISOString().slice(0, 10),
      mrr_cents: mrrCents,
      active_subscribers: activeSubscribers,
      trial_users: trialUsers,
      churned_count: 0,
      new_subscribers: newSubscribers,
      conversion_rate: conversionRate,
      arpu_cents: activeSubscribers > 0 ? Math.round(mrrCents / activeSubscribers) : 0,
      data,
    };
  }

  async upsertSnapshot(snapshot) {
    const query = `
      INSERT INTO revenue_metrics
      (project_id, date, mrr_cents, active_subscribers, trial_users, churned_count, new_subscribers, conversion_rate, arpu_cents, data)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
      ON CONFLICT (project_id, date)
      DO UPDATE SET
        mrr_cents = EXCLUDED.mrr_cents,
        active_subscribers = EXCLUDED.active_subscribers,
        trial_users = EXCLUDED.trial_users,
        churned_count = EXCLUDED.churned_count,
        new_subscribers = EXCLUDED.new_subscribers,
        conversion_rate = EXCLUDED.conversion_rate,
        arpu_cents = EXCLUDED.arpu_cents,
        data = EXCLUDED.data
      RETURNING id, project_id, date
    `;

    const values = [
      snapshot.project_id,
      snapshot.date,
      snapshot.mrr_cents,
      snapshot.active_subscribers,
      snapshot.trial_users,
      snapshot.churned_count,
      snapshot.new_subscribers,
      snapshot.conversion_rate,
      snapshot.arpu_cents,
      JSON.stringify(snapshot.data),
    ];

    const result = await this.dbPool.query(query, values);
    return result.rows[0];
  }

  async maybeSendThresholdAlert(snapshot) {
    const fubRate = snapshot.data?.fub_activation_rate || 0;
    const ahaRate = snapshot.data?.aha_completion_rate || 0;

    if (!this.botToken || !this.chatId) {
      return { alerted: false, skipped: 'telegram_not_configured' };
    }

    const breaches = [];
    if (fubRate < REVENUE_FUNNEL_THRESHOLDS.FUB_ACTIVATION_MIN) breaches.push(`FUB activation ${Math.round(fubRate * 100)}% < ${Math.round(REVENUE_FUNNEL_THRESHOLDS.FUB_ACTIVATION_MIN * 100)}%`);
    if (ahaRate < REVENUE_FUNNEL_THRESHOLDS.AHA_COMPLETION_MIN) breaches.push(`Aha rate ${Math.round(ahaRate * 100)}% < ${Math.round(REVENUE_FUNNEL_THRESHOLDS.AHA_COMPLETION_MIN * 100)}%`);

    if (breaches.length === 0) {
      return { alerted: false };
    }

    const text = `⚠️ Revenue Funnel Alert (${snapshot.date})\n${breaches.join('\n')}\nPaid: ${snapshot.active_subscribers} | Trial: ${snapshot.trial_users}`;
    const sent = await this.sendTelegramMessage(text);
    return { alerted: sent, breaches };
  }

  async getFunnelSeries(days = SPARKLINE_DAYS) {
    const result = await this.dbPool.query(
      `SELECT date, active_subscribers, trial_users, mrr_cents, new_subscribers, conversion_rate, data
       FROM revenue_metrics
       WHERE project_id = $1
       ORDER BY date DESC
       LIMIT $2`,
      [this.projectId, days]
    );

    const rows = result.rows.reverse();
    const today = rows[rows.length - 1] || null;
    const yesterday = rows.length > 1 ? rows[rows.length - 2] : null;

    return { rows, today, yesterday };
  }

  async scalar(query, params = []) {
    const result = await this.dbPool.query(query, params);
    if (!result.rows[0]) return 0;
    return Number(Object.values(result.rows[0])[0] || 0);
  }

  async sendTelegramMessage(text) {
    return new Promise((resolve) => {
      const payload = JSON.stringify({
        chat_id: this.chatId,
        text,
        ...(this.topicId ? { message_thread_id: Number(this.topicId) } : {}),
      });

      const req = this.telegramRequest(
        {
          hostname: 'api.telegram.org',
          path: `/bot${this.botToken}/sendMessage`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            resolve(res.statusCode >= 200 && res.statusCode < 300);
          });
        }
      );

      req.on('error', () => resolve(false));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
      req.write(payload);
      req.end();
    });
  }
}

module.exports = RevenueMetricsService;
module.exports.RevenueMetricsService = RevenueMetricsService;
