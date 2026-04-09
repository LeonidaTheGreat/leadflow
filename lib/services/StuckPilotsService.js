'use strict';

const https = require('https');

const TELEGRAM_TIMEOUT_MS = 5000;

let defaultPool = null;

function getDefaultPool() {
  if (!defaultPool) {
    const { Pool } = require('pg');
    const connectionString = process.env.LOCAL_PG_URL || process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('LOCAL_PG_URL or DATABASE_URL is not configured');
    }

    defaultPool = new Pool({ connectionString });
  }

  return defaultPool;
}

class StuckPilotsService {
  constructor(dbPool, botToken, options = {}) {
    this.dbPool = dbPool;
    this.botToken = botToken;
    this.chatId = options.chatId || process.env.TELEGRAM_CHAT_ID;
    this.topicId = options.topicId || process.env.TELEGRAM_TOPIC_ID;
    this.dashboardUrl =
      options.dashboardUrl || 'https://stojanadmins-mac-mini.tail3ca16c.ts.net/admin/pilots';
    this.telegramRequest =
      options.telegramRequest || (options.httpsModule && options.httpsModule.request) || https.request;
    this.logger = options.logger || console;
  }

  async sendTelegramMessage(text, chatId, topicId) {
    if (!this.botToken) {
      this.logger.warn('[StuckPilots] Telegram bot token not configured');
      return false;
    }

    return new Promise((resolve) => {
      const payload = JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...(topicId ? { message_thread_id: topicId } : {}),
      });

      const options = {
        hostname: 'api.telegram.org',
        path: `/bot${this.botToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = this.telegramRequest(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            this.logger.log('[StuckPilots] Telegram alert sent');
            resolve(true);
            return;
          }

          this.logger.error(`[StuckPilots] Telegram send failed (${res.statusCode}): ${body}`);
          resolve(false);
        });
      });

      req.on('error', (error) => {
        this.logger.error(`[StuckPilots] Telegram error: ${error.message}`);
        resolve(false);
      });

      req.setTimeout(TELEGRAM_TIMEOUT_MS, () => {
        req.destroy();
        resolve(false);
      });

      req.write(payload);
      req.end();
    });
  }

  async getStuckPilots() {
    const result = await this.dbPool.query(`
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

    return result.rows;
  }

  async markPilotAlerted(pilotId) {
    await this.dbPool.query('UPDATE pilot_progress SET stuck_since = NOW() WHERE id = $1', [pilotId]);
  }

  buildAlertMessage(pilot, dashboardUrl) {
    const agentName = `${pilot.first_name} ${pilot.last_name}`;
    const hoursStuck = Math.round(pilot.hours_in_stage);

    const lastContactInfo =
      pilot.last_contact_at && pilot.last_contact_type
        ? `${new Date(pilot.last_contact_at).toLocaleDateString()} via ${pilot.last_contact_type}`
        : 'No contact yet';

    return (
      `⚠️ <b>Stuck Pilot Alert</b>\n\n` +
      `<b>${agentName}</b> has been in <b>'${pilot.stage}'</b> for <b>${hoursStuck}h</b>\n\n` +
      `Last contact: ${lastContactInfo}\n\n` +
      `<a href="${dashboardUrl}">View Dashboard</a>`
    );
  }

  async checkAndAlertStuckPilots(options = {}) {
    const chatId = options.chatId || this.chatId;
    const topicId = options.topicId || this.topicId;
    const dashboardUrl = options.dashboardUrl || this.dashboardUrl;

    if (!this.botToken || !chatId) {
      this.logger.warn('[StuckPilots] Telegram not configured — skipping alerts');
      return { alerted: 0, skipped: 'telegram_not_configured' };
    }

    const stuckPilots = await this.getStuckPilots();

    if (stuckPilots.length === 0) {
      this.logger.log('[StuckPilots] No stuck pilots');
      return { alerted: 0 };
    }

    this.logger.log(`[StuckPilots] Found ${stuckPilots.length} stuck pilot(s)`);

    let alerted = 0;

    for (const pilot of stuckPilots) {
      const message = this.buildAlertMessage(pilot, dashboardUrl);
      const sent = await this.sendTelegramMessage(message, chatId, topicId);

      if (!sent) {
        continue;
      }

      await this.markPilotAlerted(pilot.id);
      this.logger.log(`[StuckPilots] Marked pilot ${pilot.id} as stuck`);
      alerted++;
    }

    return { alerted };
  }
}

function createDefaultStuckPilotsService() {
  return new StuckPilotsService(
    getDefaultPool(),
    process.env.ORCHESTRATOR_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN
  );
}

module.exports = StuckPilotsService;
module.exports.StuckPilotsService = StuckPilotsService;
module.exports.createDefaultStuckPilotsService = createDefaultStuckPilotsService;
