/**
 * Stuck Pilots Service
 *
 * Checks pilot_progress for agents stuck in the same stage for >24h
 * and sends Telegram alerts (once per stage via stuck_since guard).
 */

const https = require('https');
const { getPool } = require('./pg-pool');

/**
 * Send a Telegram message via Bot API.
 * @param {string} text - HTML-formatted message
 * @param {string} botToken
 * @param {string|number} chatId
 * @param {string|number} [topicId]
 */
function sendTelegramMessage(text, botToken, chatId, topicId) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...(topicId ? { message_thread_id: topicId } : {}),
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[StuckPilots] Telegram alert sent');
          resolve(true);
        } else {
          console.error(`[StuckPilots] Telegram send failed (${res.statusCode}): ${body}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[StuckPilots] Telegram error: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(5000, () => { req.destroy(); resolve(false); });
    req.write(payload);
    req.end();
  });
}

/**
 * Check for stuck pilots and send Telegram alerts.
 *
 * A pilot is "stuck" when:
 *   - stage != 'paid'
 *   - stage_entered_at > 24 hours ago
 *   - stuck_since IS NULL  (not yet alerted for this stage)
 *
 * On detection: sets stuck_since = NOW() so the alert fires only once per stage.
 *
 * @returns {{ alerted: number, skipped: string }} summary
 */
async function checkAndAlertStuckPilots() {
  const botToken = process.env.ORCHESTRATOR_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('[StuckPilots] Telegram not configured — skipping alerts');
    return { alerted: 0, skipped: 'telegram_not_configured' };
  }

  const pool = getPool();

  const result = await pool.query(`
    SELECT
      pp.id,
      pp.agent_id,
      pp.stage,
      pp.stage_entered_at,
      pp.last_contact_at,
      pp.last_contact_type,
      ra.first_name,
      ra.last_name,
      EXTRACT(EPOCH FROM (NOW() - pp.stage_entered_at)) / 3600 AS hours_in_stage
    FROM pilot_progress pp
    JOIN real_estate_agents ra ON pp.agent_id = ra.id
    WHERE pp.stage != 'paid'
      AND (NOW() - pp.stage_entered_at) > INTERVAL '24 hours'
      AND pp.stuck_since IS NULL
    ORDER BY pp.stage_entered_at ASC
  `);

  if (result.rows.length === 0) {
    console.log('[StuckPilots] No stuck pilots');
    return { alerted: 0 };
  }

  console.log(`[StuckPilots] Found ${result.rows.length} stuck pilot(s)`);

  let alerted = 0;
  const dashboardUrl = 'https://stojanadmins-mac-mini.tail3ca16c.ts.net/admin/pilots';

  for (const pilot of result.rows) {
    const agentName = `${pilot.first_name} ${pilot.last_name}`;
    const hoursStuck = Math.round(pilot.hours_in_stage);

    const lastContactInfo =
      pilot.last_contact_at && pilot.last_contact_type
        ? `${new Date(pilot.last_contact_at).toLocaleDateString()} via ${pilot.last_contact_type}`
        : 'No contact yet';

    const message =
      `⚠️ <b>Stuck Pilot Alert</b>\n\n` +
      `<b>${agentName}</b> has been in <b>'${pilot.stage}'</b> for <b>${hoursStuck}h</b>\n\n` +
      `Last contact: ${lastContactInfo}\n\n` +
      `<a href="${dashboardUrl}">View Dashboard</a>`;

    await sendTelegramMessage(message, botToken, chatId);

    // Mark as alerted — prevents duplicate alerts for this stage
    await pool.query('UPDATE pilot_progress SET stuck_since = NOW() WHERE id = $1', [pilot.id]);
    console.log(`[StuckPilots] Marked pilot ${pilot.id} (${agentName}) as stuck`);
    alerted++;
  }

  return { alerted };
}

module.exports = { checkAndAlertStuckPilots };
