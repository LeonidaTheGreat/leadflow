'use strict';

const { getPool } = require('../db');
const { logger: defaultLogger } = require('../logger');

const log = defaultLogger.child('RevenueMetricsService');

// Thresholds for alerting
const THRESHOLDS = {
  fub_activation_rate: 0.2,     // 20%
  aha_completion_rate: 0.3,     // 30%
};

class RevenueMetricsService {
  constructor(options = {}) {
    this.db = options.db || getPool;
    this.logger = options.logger || log;
  }

  async captureSnapshot(projectId = 'leadflow') {
    try {
      const pool = typeof this.db === 'function' ? this.db() : this.db;

      const metrics = await this.calculateFunnelMetrics();

      // Ensure all numeric values are valid
      const mrrCents = metrics.mrr_cents ?? 0;
      const activeSubscribers = metrics.active_subscribers ?? 0;
      const trialUsers = metrics.trial_users ?? 0;
      const newSubscribers = metrics.new_subscribers ?? 0;
      const conversionRate = metrics.conversion_rate ?? 0;

      this.logger.debug('Calculated metrics', {
        mrrCents,
        activeSubscribers,
        trialUsers,
        newSubscribers,
        conversionRate,
      });

      // Check if snapshot already exists for today
      const today = new Date().toISOString().split('T')[0];
      const existingResult = await pool.query(
        'SELECT id FROM revenue_metrics WHERE project_id = $1 AND date = $2::date',
        [projectId, today]
      );

      const data = {
        funnel: metrics.funnel,
        extended: metrics.extended,
      };

      let result;
      if (existingResult.rows.length > 0) {
        // Update existing
        result = await pool.query(
          `UPDATE revenue_metrics
           SET mrr_cents = $1,
               active_subscribers = $2,
               trial_users = $3,
               new_subscribers = $4,
               conversion_rate = $5,
               data = $6,
               created_at = now()
           WHERE project_id = $7 AND date = $8::date
           RETURNING *`,
          [
            mrrCents,
            activeSubscribers,
            trialUsers,
            newSubscribers,
            conversionRate,
            JSON.stringify(data),
            projectId,
            today,
          ]
        );
      } else {
        // Insert new
        result = await pool.query(
          `INSERT INTO revenue_metrics
           (project_id, date, mrr_cents, active_subscribers, trial_users, new_subscribers, conversion_rate, data)
           VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            projectId,
            today,
            mrrCents,
            activeSubscribers,
            trialUsers,
            newSubscribers,
            conversionRate,
            JSON.stringify(data),
          ]
        );
      }

      this.logger.info('Revenue metrics snapshot captured', {
        projectId,
        date: today,
        mrr: metrics.mrr_cents,
        activeSubscribers: metrics.active_subscribers,
        trialUsers: metrics.trial_users,
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to capture revenue metrics snapshot', { error: error.message });
      throw error;
    }
  }

  async calculateFunnelMetrics() {
    try {
      const pool = typeof this.db === 'function' ? this.db() : this.db;

      // Get all signup agents
      const signupsResult = await pool.query(
        'SELECT COUNT(*) as count FROM real_estate_agents'
      );
      const signups = parseInt(signupsResult.rows[0].count);

      // Get FUB connected agents (have follow_up_boss_api_key set)
      const fubConnectedResult = await pool.query(
        'SELECT COUNT(DISTINCT agent_id) as count FROM agent_integrations WHERE follow_up_boss_api_key IS NOT NULL'
      );
      const fubConnected = parseInt(fubConnectedResult.rows[0].count);

      // Get aha moment completed
      const ahaCompletedResult = await pool.query(
        'SELECT COUNT(*) as count FROM real_estate_agents WHERE aha_completed = true'
      );
      const ahaCompleted = parseInt(ahaCompletedResult.rows[0].count);

      // Get active subscribers (paid users)
      const paidResult = await pool.query(
        `SELECT COUNT(*) as count FROM subscriptions
         WHERE status = 'active' AND canceled_at IS NULL`
      );
      const paid = parseInt(paidResult.rows[0].count);

      // Get trial users
      const trialResult = await pool.query(
        `SELECT COUNT(*) as count FROM real_estate_agents
         WHERE subscription_status = 'inactive' AND trial_ends_at > now()`
      );
      const trial_users = parseInt(trialResult.rows[0].count);

      // Calculate MRR from Stripe prices
      // Starter: $49, Pro: $149, Team: $399, Brokerage: $999+
      const tierPrices = {
        starter: 4900,    // cents
        professional: 14900,
        pro: 14900,       // alias
        team: 39900,
        enterprise: 99900,
        brokerage: 99900,
      };

      const mrrResult = await pool.query(
        `SELECT COALESCE(SUM(CASE
           WHEN tier = 'starter' THEN 4900
           WHEN tier = 'professional' THEN 14900
           WHEN tier = 'pro' THEN 14900
           WHEN tier = 'team' THEN 39900
           WHEN tier = 'enterprise' THEN 99900
           WHEN tier = 'brokerage' THEN 99900
           ELSE 0 END), 0) as total
         FROM subscriptions
         WHERE status = 'active' AND canceled_at IS NULL`
      );
      const mrr_cents = parseInt(mrrResult.rows[0].total);

      // Get new subscribers from today
      const today = new Date().toISOString().split('T')[0];
      const newSubsResult = await pool.query(
        `SELECT COUNT(*) as count FROM subscriptions
         WHERE status = 'active' AND canceled_at IS NULL
         AND created_at::date = $1::date`,
        [today]
      );
      const new_subscribers = parseInt(newSubsResult.rows[0]?.count || 0);

      // Calculate conversion rate
      const conversion_rate = signups > 0 ? parseFloat((paid / (paid + trial_users)).toFixed(4)) : 0;

      // Extended metrics
      const fub_activation_rate = signups > 0 ? parseFloat((fubConnected / signups).toFixed(4)) : 0;
      const aha_completion_rate = signups > 0 ? parseFloat((ahaCompleted / signups).toFixed(4)) : 0;

      return {
        signups,
        fubConnected,
        ahaCompleted,
        paid,
        trial_users,
        mrr_cents,
        new_subscribers,
        conversion_rate,
        funnel: {
          signups: { label: 'Signups', count: signups, rate: 1.0 },
          fub_connected: {
            label: 'FUB Connected',
            count: fubConnected,
            rate: signups > 0 ? fubConnected / signups : 0,
          },
          aha_moment: {
            label: 'Aha Moment',
            count: ahaCompleted,
            rate: signups > 0 ? ahaCompleted / signups : 0,
          },
          paid: {
            label: 'Paid',
            count: paid,
            rate: signups > 0 ? paid / signups : 0,
          },
        },
        extended: {
          trial_users,
          fub_activation_rate,
          aha_completion_rate,
        },
      };
    } catch (error) {
      this.logger.error('Failed to calculate funnel metrics', { error: error.message });
      throw error;
    }
  }

  async getMetricsForRange(days = 7) {
    try {
      const pool = typeof this.db === 'function' ? this.db() : this.db;

      const result = await pool.query(
        `SELECT * FROM revenue_metrics
         WHERE project_id = 'leadflow'
         AND date >= (CURRENT_DATE - INTERVAL '1 day' * $1)
         ORDER BY date DESC
         LIMIT $2`,
        [days, days + 1]
      );

      return result.rows.map(row => ({
        ...row,
        data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      }));
    } catch (error) {
      this.logger.error('Failed to get metrics for range', { error: error.message, days });
      throw error;
    }
  }

  async checkThresholds() {
    try {
      const metrics = await this.calculateFunnelMetrics();
      const alerts = [];

      if (metrics.extended.fub_activation_rate < THRESHOLDS.fub_activation_rate) {
        alerts.push({
          type: 'fub_activation',
          message: `FUB activation rate dropped to ${(metrics.extended.fub_activation_rate * 100).toFixed(1)}% (threshold: ${THRESHOLDS.fub_activation_rate * 100}%)`,
          value: metrics.extended.fub_activation_rate,
          threshold: THRESHOLDS.fub_activation_rate,
        });
      }

      if (metrics.extended.aha_completion_rate < THRESHOLDS.aha_completion_rate) {
        alerts.push({
          type: 'aha_completion',
          message: `Aha completion rate dropped to ${(metrics.extended.aha_completion_rate * 100).toFixed(1)}% (threshold: ${THRESHOLDS.aha_completion_rate * 100}%)`,
          value: metrics.extended.aha_completion_rate,
          threshold: THRESHOLDS.aha_completion_rate,
        });
      }

      return alerts;
    } catch (error) {
      this.logger.error('Failed to check thresholds', { error: error.message });
      return [];
    }
  }
}

module.exports = RevenueMetricsService;
