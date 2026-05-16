#!/usr/bin/env node
'use strict'

/*
TASK SPEC
What:
- Create scripts/tasks/revenue-snapshot.js (main) and scripts/tasks/revenue-snapshot-lib.js (helpers) to compute and persist daily revenue_metrics, plus Telegram threshold alerts.
- Create product/lead-response/dashboard/app/api/admin/revenue/route.ts and product/lead-response/dashboard/app/admin/revenue/page.tsx to display funnel steps, 7-day trends, and today-vs-yesterday deltas from DB.
- Add tests/unit/revenue-snapshot.test.js to verify conversion math, plan price mapping, and threshold breach logic.
Verify:
- node tests/unit/revenue-snapshot.test.js passes.
- node scripts/tasks/revenue-snapshot.js writes/updates today's revenue_metrics row.
- source ~/.env >/dev/null 2>&1; psql "$LOCAL_PG_URL" -c "SELECT date, active_subscribers, trial_users, new_subscribers, conversion_rate, data FROM revenue_metrics WHERE date=CURRENT_DATE;" returns one row.
- npm test passes and npm run build passes.
Boundaries:
- Do not modify Stripe webhooks or subscription flow.
- Do not modify migrations or schema docs.
- Do not modify existing metrics table usage; only revenue_metrics.
*/

const https = require('https')
const { execFileSync } = require('child_process')
const {
  toRate,
  toPriceCents,
  computeConversionRate,
  computeAlertBreaches,
} = require('./revenue-snapshot-lib')

const DATABASE_URL = process.env.LOCAL_PG_URL || process.env.DATABASE_URL
const BOT_TOKEN = process.env.ORCHESTRATOR_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID
const TOPIC_ID = process.env.TELEGRAM_TOPIC_ID

if (!DATABASE_URL) {
  console.error('LOCAL_PG_URL or DATABASE_URL is required')
  process.exit(1)
}

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  return `'${String(value).replace(/'/g, "''")}'`
}

function runSQL(query) {
  return execFileSync('psql', [DATABASE_URL, '-t', '-A', '-c', query], { encoding: 'utf8' }).trim()
}

function queryCount(query) {
  const output = runSQL(query)
  return Number(output.split('\n').filter(Boolean)[0] || 0)
}

function sendTelegram(text) {
  if (!BOT_TOKEN || !CHAT_ID) return Promise.resolve(false)
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML',
      ...(TOPIC_ID ? { message_thread_id: Number(TOPIC_ID) } : {}),
    })
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      res.on('data', () => {})
      res.on('end', () => resolve(res.statusCode === 200))
    })
    req.on('error', () => resolve(false))
    req.setTimeout(10000, () => {
      req.destroy()
      resolve(false)
    })
    req.write(payload)
    req.end()
  })
}

async function main() {
  const today = runSQL('SELECT CURRENT_DATE')

  const activeSubscribers = queryCount("SELECT COUNT(*) FROM subscriptions WHERE status='active'")
  const trialUsers = queryCount("SELECT COUNT(*) FROM real_estate_agents WHERE subscription_status='inactive' AND trial_ends_at > NOW()")

  const tierRows = runSQL("SELECT tier FROM subscriptions WHERE status='active'")
    .split('\n')
    .filter(Boolean)
  const mrrCents = tierRows.reduce((sum, tier) => sum + toPriceCents(tier), 0)

  const newSubscribers = queryCount("SELECT COUNT(*) FROM subscriptions WHERE status='active' AND created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE")

  const totalAgents = queryCount('SELECT COUNT(*) FROM real_estate_agents')
  const fubConnected = queryCount("SELECT COUNT(DISTINCT agent_id) FROM agent_integrations WHERE follow_up_boss_api_key IS NOT NULL AND follow_up_boss_api_key != ''")
  const ahaCompleted = queryCount('SELECT COUNT(*) FROM real_estate_agents WHERE aha_completed=true')
  const pilotIdentified = queryCount('SELECT COUNT(*) FROM pilot_recruitment_targets')
  const pilotContacted = queryCount("SELECT COUNT(*) FROM pilot_recruitment_targets WHERE status IN ('contacted','responded','scheduled','signed_up')")

  const conversionRate = computeConversionRate(activeSubscribers, trialUsers)
  const fubActivationRate = toRate(fubConnected, totalAgents)
  const ahaCompletionRate = toRate(ahaCompleted, totalAgents)
  const pilotContactedRate = toRate(pilotContacted, pilotIdentified)

  const data = {
    fub_activation_rate: fubActivationRate,
    aha_completion_rate: ahaCompletionRate,
    pilot_contacted_rate: pilotContactedRate,
    funnel: {
      signups: totalAgents,
      fub_connected: fubConnected,
      aha_moment: ahaCompleted,
      paid: activeSubscribers,
    },
  }

  const existingId = runSQL(`SELECT id FROM revenue_metrics WHERE date=${sqlValue(today)} LIMIT 1`)
  if (existingId) {
    runSQL(
      `UPDATE revenue_metrics SET
         active_subscribers=${sqlValue(activeSubscribers)},
         trial_users=${sqlValue(trialUsers)},
         mrr_cents=${sqlValue(mrrCents)},
         new_subscribers=${sqlValue(newSubscribers)},
         conversion_rate=${sqlValue(conversionRate)},
         data=${sqlValue(JSON.stringify(data))}::jsonb,
         created_at=NOW()
       WHERE id=${sqlValue(Number(existingId))}`
    )
  } else {
    runSQL(
      `INSERT INTO revenue_metrics (project_id,date,active_subscribers,trial_users,mrr_cents,new_subscribers,conversion_rate,data,created_at)
       VALUES (${sqlValue('leadflow')},${sqlValue(today)},${sqlValue(activeSubscribers)},${sqlValue(trialUsers)},${sqlValue(mrrCents)},${sqlValue(newSubscribers)},${sqlValue(conversionRate)},${sqlValue(JSON.stringify(data))}::jsonb,NOW())`
    )
  }

  const breaches = computeAlertBreaches({ fubActivationRate, ahaCompletionRate })
  if (breaches.length > 0) {
    const lines = breaches.map((b) => `${b.metric}: ${(b.actual * 100).toFixed(1)}% < ${(b.threshold * 100).toFixed(1)}%`).join('\n')
    await sendTelegram(`⚠️ <b>Revenue Funnel Alert</b>\n\n${lines}\n\nDate: ${today}`)
  }

  console.log(JSON.stringify({
    date: today,
    activeSubscribers,
    trialUsers,
    mrrCents,
    newSubscribers,
    conversionRate,
    data,
    alertBreaches: breaches,
  }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
