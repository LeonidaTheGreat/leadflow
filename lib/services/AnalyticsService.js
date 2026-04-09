'use strict';

/**
 * AnalyticsService — Server-side analytics queries for LeadFlow
 *
 * Provides aggregated metrics over messages, leads, and bookings tables
 * using the shared PostgreSQL pool (lib/pg-pool.js).
 *
 * Usage:
 *   const AnalyticsService = require('./lib/services/AnalyticsService');
 *   const svc = new AnalyticsService();
 *   const dashboard = await svc.getAnalyticsDashboard(30);
 */

const { getPool } = require('../pg-pool');

const DEFAULT_DAYS_BACK = 30;

class AnalyticsService {
  /**
   * @param {object} [options]
   * @param {function} [options.getPool] - injectable pool factory (for testing)
   */
  constructor(options = {}) {
    this._getPool = options.getPool || getPool;
  }

  /**
   * Returns ISO date string for `daysBack` days ago (UTC).
   * @param {number} daysBack
   * @returns {string}
   */
  _startDate(daysBack) {
    return new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  }

  /**
   * Outbound messages sent per day for the given window.
   * @param {number} [daysBack=30]
   * @returns {Promise<{data: Array<{date:string, count:number}>, error: Error|null}>}
   */
  async getMessagesPerDay(daysBack = DEFAULT_DAYS_BACK) {
    const pool = this._getPool();
    const start = this._startDate(daysBack);
    try {
      const result = await pool.query(
        `SELECT created_at::date AS day, COUNT(*)::int AS count
         FROM messages
         WHERE direction = 'outbound'
           AND created_at >= $1
         GROUP BY day
         ORDER BY day ASC`,
        [start]
      );
      return {
        data: result.rows.map((r) => ({ date: r.day.toISOString().split('T')[0], count: r.count })),
        error: null,
      };
    } catch (err) {
      return { data: [], error: err };
    }
  }

  /**
   * Delivery status breakdown for outbound messages.
   * @param {number} [daysBack=30]
   * @returns {Promise<{sent:number, delivered:number, failed:number, pending:number, error:Error|null}>}
   */
  async getDeliveryStats(daysBack = DEFAULT_DAYS_BACK) {
    const pool = this._getPool();
    const start = this._startDate(daysBack);
    try {
      const result = await pool.query(
        `SELECT COALESCE(status, 'pending') AS status, COUNT(*)::int AS count
         FROM messages
         WHERE direction = 'outbound'
           AND created_at >= $1
         GROUP BY status`,
        [start]
      );
      const stats = { sent: 0, delivered: 0, failed: 0, pending: 0 };
      for (const row of result.rows) {
        if (row.status in stats) {
          stats[row.status] = row.count;
        }
      }
      return { ...stats, error: null };
    } catch (err) {
      return { sent: 0, delivered: 0, failed: 0, pending: 0, error: err };
    }
  }

  /**
   * Fraction of messaged leads that sent at least one inbound reply.
   * @param {number} [daysBack=30]
   * @returns {Promise<{totalSent:number, totalResponded:number, responseRate:number, error:Error|null}>}
   */
  async getResponseRate(daysBack = DEFAULT_DAYS_BACK) {
    const pool = this._getPool();
    const start = this._startDate(daysBack);
    try {
      // Count distinct leads that received an outbound message
      const outResult = await pool.query(
        `SELECT COUNT(DISTINCT lead_id)::int AS total
         FROM messages
         WHERE direction = 'outbound'
           AND created_at >= $1`,
        [start]
      );
      const totalSent = outResult.rows[0].total;

      if (totalSent === 0) {
        return { totalSent: 0, totalResponded: 0, responseRate: 0, error: null };
      }

      // Count distinct leads among those that also sent an inbound message
      const inResult = await pool.query(
        `SELECT COUNT(DISTINCT m.lead_id)::int AS total
         FROM messages m
         WHERE m.direction = 'inbound'
           AND m.created_at >= $1
           AND EXISTS (
             SELECT 1 FROM messages o
             WHERE o.lead_id = m.lead_id
               AND o.direction = 'outbound'
               AND o.created_at >= $1
           )`,
        [start]
      );
      const totalResponded = inResult.rows[0].total;
      const responseRate = Math.round((totalResponded / totalSent) * 1000) / 10;

      return { totalSent, totalResponded, responseRate, error: null };
    } catch (err) {
      return { totalSent: 0, totalResponded: 0, responseRate: 0, error: err };
    }
  }

  /**
   * Lead-to-booking conversion rate.
   * @param {number} [daysBack=30]
   * @returns {Promise<{totalLeads:number, convertedLeads:number, conversionRate:number, error:Error|null}>}
   */
  async getLeadConversion(daysBack = DEFAULT_DAYS_BACK) {
    const pool = this._getPool();
    const start = this._startDate(daysBack);
    try {
      const leadsResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM leads WHERE created_at >= $1`,
        [start]
      );
      const totalLeads = leadsResult.rows[0].total;

      const bookResult = await pool.query(
        `SELECT COUNT(DISTINCT lead_id)::int AS total
         FROM bookings
         WHERE created_at >= $1`,
        [start]
      );
      const convertedLeads = bookResult.rows[0].total;
      const conversionRate = totalLeads > 0
        ? Math.round((convertedLeads / totalLeads) * 1000) / 10
        : 0;

      return { totalLeads, convertedLeads, conversionRate, error: null };
    } catch (err) {
      return { totalLeads: 0, convertedLeads: 0, conversionRate: 0, error: err };
    }
  }

  /**
   * Average and median first-reply response time (in minutes).
   * Measures time from first outbound to first inbound per lead.
   * @param {number} [daysBack=30]
   * @returns {Promise<{avgResponseTime:number, medianResponseTime:number, error:Error|null}>}
   */
  async getAvgResponseTime(daysBack = DEFAULT_DAYS_BACK) {
    const pool = this._getPool();
    const start = this._startDate(daysBack);
    try {
      // For each lead: first outbound time vs first inbound time, only where both exist
      const result = await pool.query(
        `WITH first_out AS (
           SELECT lead_id, MIN(created_at) AS sent_at
           FROM messages
           WHERE direction = 'outbound' AND created_at >= $1
           GROUP BY lead_id
         ),
         first_in AS (
           SELECT lead_id, MIN(created_at) AS replied_at
           FROM messages
           WHERE direction = 'inbound' AND created_at >= $1
           GROUP BY lead_id
         )
         SELECT
           EXTRACT(EPOCH FROM (fi.replied_at - fo.sent_at)) / 60 AS response_minutes
         FROM first_out fo
         JOIN first_in fi ON fi.lead_id = fo.lead_id
         WHERE fi.replied_at > fo.sent_at`,
        [start]
      );

      if (result.rows.length === 0) {
        return { avgResponseTime: 0, medianResponseTime: 0, error: null };
      }

      const times = result.rows.map((r) => parseFloat(r.response_minutes));
      const avg = times.reduce((s, v) => s + v, 0) / times.length;
      const sorted = [...times].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      return {
        avgResponseTime: Math.round(avg),
        medianResponseTime: Math.round(median),
        error: null,
      };
    } catch (err) {
      return { avgResponseTime: 0, medianResponseTime: 0, error: err };
    }
  }

  /**
   * All analytics metrics in one call (parallel queries).
   * @param {number} [daysBack=30]
   * @returns {Promise<object>}
   */
  async getAnalyticsDashboard(daysBack = DEFAULT_DAYS_BACK) {
    const [messagesPerDay, deliveryStats, responseRate, leadConversion, responseTime] =
      await Promise.all([
        this.getMessagesPerDay(daysBack),
        this.getDeliveryStats(daysBack),
        this.getResponseRate(daysBack),
        this.getLeadConversion(daysBack),
        this.getAvgResponseTime(daysBack),
      ]);

    return { messagesPerDay, deliveryStats, responseRate, leadConversion, responseTime };
  }
}

module.exports = AnalyticsService;
