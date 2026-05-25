#!/usr/bin/env node
'use strict';

/**
 * TASK SPEC (40007d35-be7a-446d-b26d-606cb81472e7)
 * What:
 * - Create `scripts/tasks/revenue-snapshot.js` with `computeRevenueSnapshot`, `upsertRevenueSnapshot`, and `sendFunnelDropAlerts`.
 * - Create `product/lead-response/dashboard/app/api/admin/revenue/route.ts` to serve funnel + 7-day sparkline + day-over-day deltas from `revenue_metrics`.
 * - Create `product/lead-response/dashboard/app/admin/revenue/page.tsx` to render Signups -> FUB Connected -> Aha Moment -> Paid funnel with conversion percentages and deltas.
 * - Update `scripts/shell/orchestrator-heartbeat-runner.sh` to run this snapshot task each heartbeat (idempotent daily upsert), including Telegram drop alert checks.
 *
 * Verify:
 * - `node scripts/tasks/revenue-snapshot.js --once` exits 0 and prints today's snapshot payload.
 * - `psql "$LOCAL_PG_URL" -c "SELECT date,active_subscribers,trial_users,mrr_cents,new_subscribers,conversion_rate,data FROM revenue_metrics ORDER BY date DESC LIMIT 1;"` shows today's row.
 * - `npm test` passes.
 * - `npm run build` and `npm run lint` pass.
 * - `cd product/lead-response/dashboard && npx next build` passes.
 *
 * Boundaries:
 * - Do not modify Stripe webhook handlers or subscription flow.
 * - Do not modify non-`revenue_metrics` metrics storage.
 * - Do not alter DB schema/migrations in this task.
 */

const https = require('https');
const { getPool } = require('../../lib/db');

const PROJECT_ID = 'leadflow';
const PLAN_PRICE_CENTS = {
  starter: 4900,
  pro: 14900,
  professional: 14900,
  team: 39900,
  brokerage: 99900,
  enterprise: 99900,
};
const FUB_ACTIVATION_ALERT_THRESHOLD = 0.2;
const AHA_ALERT_THRESHOLD = 0.3;
const CONTACTED_STATUSES = ['contacted', 'responded', 'scheduled', 'signed_up'];

function toRate(numerator, denominator) {
  if (!denominator || denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

function sendTelegramMessage(text) {
  return new Promise((resolve) => {
    const botToken = process.env.ORCHESTRATOR_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return resolve({ sent: false, reason: 'telegram_not_configured' });
    }

    const payload = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });

    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${botToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        resolve({ sent: res.statusCode === 200, statusCode: res.statusCode });
      }
    );

    req.on('error', (error) => resolve({ sent: false, reason: error.message }));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ sent: false, reason: 'timeout' });
    });

    req.write(payload);
    req.end();
  });
}

async function computeRevenueSnapshot(pool) {
  const activeSubscribersResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM subscriptions WHERE status = 'active' AND stripe_subscription_id NOT LIKE 'sub_test_%'`
  );

  const trialUsersResult = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM real_estate_agents
     WHERE COALESCE(subscription_status, 'inactive') = 'inactive'
       AND trial_ends_at > NOW()`
  );

  const mrrResult = await pool.query(
    `SELECT COALESCE(SUM(
      CASE tier
        WHEN 'starter' THEN 4900
        WHEN 'pro' THEN 14900
        WHEN 'professional' THEN 14900
        WHEN 'team' THEN 39900
        WHEN 'brokerage' THEN 99900
        WHEN 'enterprise' THEN 99900
        ELSE 0
      END
    ), 0)::int AS mrr_cents
    FROM subscriptions
    WHERE status = 'active' AND stripe_subscription_id NOT LIKE 'sub_test_%'`
  );

  const newSubscribersResult = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM subscriptions
     WHERE status = 'active'
       AND stripe_subscription_id NOT LIKE 'sub_test_%'
       AND created_at >= (CURRENT_DATE - INTERVAL '1 day')`
  );

  const agentCountResult = await pool.query(`SELECT COUNT(*)::int AS count FROM real_estate_agents`);
  const integrationsCountResult = await pool.query(`SELECT COUNT(*)::int AS count FROM agent_integrations`);
  const ahaCountResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM real_estate_agents WHERE aha_completed = true`
  );

  const pilotIdentifiedResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM pilot_recruitment_targets`
  );
  const pilotContactedResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM pilot_recruitment_targets WHERE status = ANY($1::text[])`,
    [CONTACTED_STATUSES]
  );

  const activeSubscribers = activeSubscribersResult.rows[0].count;
  const trialUsers = trialUsersResult.rows[0].count;
  const mrrCents = mrrResult.rows[0].mrr_cents;
  const newSubscribers = newSubscribersResult.rows[0].count;
  const totalAgents = agentCountResult.rows[0].count;
  const integrationsCount = integrationsCountResult.rows[0].count;
  const ahaCount = ahaCountResult.rows[0].count;
  const pilotIdentified = pilotIdentifiedResult.rows[0].count;
  const pilotContacted = pilotContactedResult.rows[0].count;

  const conversionRate = toRate(activeSubscribers, activeSubscribers + trialUsers);
  const fubActivationRate = toRate(integrationsCount, totalAgents);
  const ahaCompletionRate = toRate(ahaCount, totalAgents);
  const pilotContactedRate = toRate(pilotContacted, pilotIdentified);
  const arpuCents = activeSubscribers > 0 ? Math.round(mrrCents / activeSubscribers) : 0;

  return {
    date: new Date().toISOString().slice(0, 10),
    project_id: PROJECT_ID,
    active_subscribers: activeSubscribers,
    trial_users: trialUsers,
    mrr_cents: mrrCents,
    new_subscribers: newSubscribers,
    conversion_rate: conversionRate,
    arpu_cents: arpuCents,
    churned_count: 0,
    data: {
      fub_activation_rate: fubActivationRate,
      aha_completion_rate: ahaCompletionRate,
      pilot_contacted_rate: pilotContactedRate,
      plan_price_cents: PLAN_PRICE_CENTS,
    },
  };
}

async function upsertRevenueSnapshot(pool, snapshot) {
  const result = await pool.query(
    `INSERT INTO revenue_metrics
      (project_id, date, mrr_cents, active_subscribers, trial_users, churned_count, new_subscribers, conversion_rate, arpu_cents, data)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
     ON CONFLICT (project_id, date)
     DO UPDATE SET
      mrr_cents = EXCLUDED.mrr_cents,
      active_subscribers = EXCLUDED.active_subscribers,
      trial_users = EXCLUDED.trial_users,
      churned_count = EXCLUDED.churned_count,
      new_subscribers = EXCLUDED.new_subscribers,
      conversion_rate = EXCLUDED.conversion_rate,
      arpu_cents = EXCLUDED.arpu_cents,
      data = EXCLUDED.data,
      created_at = NOW()
     RETURNING id, project_id, date`,
    [
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
    ]
  );

  return result.rows[0];
}

async function sendFunnelDropAlerts(snapshot) {
  const messages = [];
  const fubRate = snapshot.data.fub_activation_rate;
  const ahaRate = snapshot.data.aha_completion_rate;

  if (fubRate < FUB_ACTIVATION_ALERT_THRESHOLD) {
    messages.push(
      `⚠️ <b>Revenue Funnel Alert</b>\n\nFUB activation dropped to <b>${(fubRate * 100).toFixed(1)}%</b> (threshold ${(FUB_ACTIVATION_ALERT_THRESHOLD * 100).toFixed(0)}%).\n\nDate: ${snapshot.date}`
    );
  }

  if (ahaRate < AHA_ALERT_THRESHOLD) {
    messages.push(
      `⚠️ <b>Revenue Funnel Alert</b>\n\nAha completion dropped to <b>${(ahaRate * 100).toFixed(1)}%</b> (threshold ${(AHA_ALERT_THRESHOLD * 100).toFixed(0)}%).\n\nDate: ${snapshot.date}`
    );
  }

  for (const message of messages) {
    await sendTelegramMessage(message);
  }

  return { triggered: messages.length };
}

async function run() {
  const pool = getPool();
  try {
    const snapshot = await computeRevenueSnapshot(pool);
    const upserted = await upsertRevenueSnapshot(pool, snapshot);
    const alerts = await sendFunnelDropAlerts(snapshot);

    console.log(
      JSON.stringify({
        ok: true,
        upserted,
        alerts,
        snapshot,
      })
    );
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exit(1);
  });
}

module.exports = {
  computeRevenueSnapshot,
  upsertRevenueSnapshot,
  sendFunnelDropAlerts,
};
