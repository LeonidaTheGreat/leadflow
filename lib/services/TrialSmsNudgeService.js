'use strict';

/**
 * TrialSmsNudgeService — Automated Twilio SMS nudges for active trial agents.
 *
 * UC: uc-leadflow-trial-sms-nudge-sequence
 *
 * Sends three nudge messages to trial agents who haven't upgraded:
 *   Day 3  — 11 days remaining
 *   Day 7  — 7 days remaining (halfway)
 *   Day 12 — 2 days remaining
 *
 * State is tracked via boolean columns on real_estate_agents so sends are
 * idempotent even if the cron fires multiple times per day.
 */

const { getPool } = require('../db');
const TwilioService = require('./TwilioService');
const { logger } = require('../logger');

const log = logger.child('TrialSmsNudgeService');

// Nudge definitions. daysRemainingMin/Max bound a ±1 day window around the
// target so a cron that fires a few hours late still catches the agent.
const NUDGE_STEPS = [
  {
    key: 'day3',
    daysRemainingMin: 10,
    daysRemainingMax: 12,
    column: 'trial_sms_day3_sent',
    buildMessage: (firstName, upgradeUrl) =>
      `Hi ${firstName}, hope LeadFlow is saving you time! Your trial has 11 days left. Upgrade anytime at ${upgradeUrl}`,
  },
  {
    key: 'day7',
    daysRemainingMin: 6,
    daysRemainingMax: 8,
    column: 'trial_sms_day7_sent',
    buildMessage: (firstName, upgradeUrl) =>
      `Hi ${firstName}, your LeadFlow trial is halfway done. Agents using Pro close 3x more appointments. Upgrade for $149/mo: ${upgradeUrl}`,
  },
  {
    key: 'day12',
    daysRemainingMin: 1,
    daysRemainingMax: 3,
    column: 'trial_sms_day12_sent',
    buildMessage: (firstName, upgradeUrl) =>
      `Hi ${firstName}, 2 days left on your LeadFlow trial. Lock in your plan today: ${upgradeUrl}`,
  },
];

// Column names are internal constants — never user input.
/* eslint-disable no-template-curly-in-string */
function buildEligibleQuery(step) {
  return `
    SELECT id, first_name, phone_number, trial_ends_at
    FROM real_estate_agents
    WHERE subscription_status = 'trial'
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at > NOW()
      AND trial_ends_at BETWEEN NOW() + INTERVAL '${step.daysRemainingMin} days'
                              AND NOW() + INTERVAL '${step.daysRemainingMax} days'
      AND COALESCE(${step.column}, false) = false
      AND phone_number IS NOT NULL
      AND phone_number != ''
    ORDER BY trial_ends_at ASC
  `;
}
/* eslint-enable no-template-curly-in-string */

function buildMarkSentSql(column) {
  return `
    UPDATE real_estate_agents
    SET ${column} = true,
        updated_at = NOW()
    WHERE id = $1
  `;
}

class TrialSmsNudgeService {
  /**
   * @param {Object} [options]
   * @param {import('pg').Pool} [options.pool]
   * @param {TwilioService} [options.twilioService]
   * @param {string} [options.appUrl]
   */
  constructor(options = {}) {
    this.pool = options.pool || getPool();
    this.twilioService = options.twilioService || new TwilioService();
    this.appUrl = (
      options.appUrl ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://leadflow-ai-five.vercel.app'
    ).replace(/\/$/, '');
  }

  _buildUpgradeUrl(agentId) {
    return `${this.appUrl}/upgrade?utm_source=trial_sms&utm_medium=sms&utm_campaign=trial_nudge&ref=${agentId}`;
  }

  /**
   * Run the full nudge sequence across all three steps.
   *
   * @param {{ dryRun?: boolean }} [options]
   * @returns {Promise<{stepsProcessed:number, totalEligible:number, totalSent:number, totalFailed:number, byStep:Object}>}
   */
  async runNudgeSequence({ dryRun = false } = {}) {
    if (!this.pool) throw new Error('DB pool not configured');

    const results = {
      stepsProcessed: 0,
      totalEligible: 0,
      totalSent: 0,
      totalFailed: 0,
      byStep: {},
    };

    for (const step of NUDGE_STEPS) {
      const { rows } = await this.pool.query(buildEligibleQuery(step));
      results.byStep[step.key] = { eligible: rows.length, sent: 0, failed: 0, skipped: 0 };
      results.totalEligible += rows.length;
      results.stepsProcessed++;

      if (dryRun) {
        results.byStep[step.key].skipped = rows.length;
        continue;
      }

      for (const agent of rows) {
        const upgradeUrl = this._buildUpgradeUrl(agent.id);
        const message = step.buildMessage(agent.first_name, upgradeUrl);

        try {
          const smsResult = await this.twilioService.sendSms(agent.phone_number, message, {
            trigger: `trial-sms-nudge-${step.key}`,
          });

          if (smsResult && smsResult.success) {
            await this.pool.query(buildMarkSentSql(step.column), [agent.id]);
            results.byStep[step.key].sent++;
            results.totalSent++;
            log.info('Nudge sent', { agentId: agent.id, step: step.key, sid: smsResult.sid });
          } else {
            results.byStep[step.key].failed++;
            results.totalFailed++;
            log.warn('Nudge returned non-success', { agentId: agent.id, step: step.key });
          }
        } catch (err) {
          results.byStep[step.key].failed++;
          results.totalFailed++;
          log.error('Nudge send failed', { agentId: agent.id, step: step.key, error: err.message });
        }
      }
    }

    return results;
  }

  /**
   * Returns all agents currently eligible for any nudge step (for preview / dry-run inspection).
   *
   * @returns {Promise<Array<{id:string, first_name:string, phone_number:string, trial_ends_at:Date, nudgeStep:string}>>}
   */
  async getEligibleAgents() {
    if (!this.pool) throw new Error('DB pool not configured');
    const all = [];
    for (const step of NUDGE_STEPS) {
      const { rows } = await this.pool.query(buildEligibleQuery(step));
      for (const row of rows) all.push({ ...row, nudgeStep: step.key });
    }
    return all;
  }
}

module.exports = TrialSmsNudgeService;
