'use strict';

/**
 * AdminPilotsService — Sales cockpit for admin outreach to pilot agents
 *
 * Encapsulates:
 *  - Fetching pilot agent list (email-verified, inactive/pilot status)
 *  - Generating Stripe checkout payment links for Pro plan
 *  - Logging outreach contacts to outreach_log
 *  - Updating outreach status
 *
 * UC: uc-admin-sales-cockpit-admin
 */

const Stripe = require('stripe');
const { stripe: stripeConfig, app: appConfig } = require('../config');
const { logger } = require('../logger');

const log = logger.child('AdminPilotsService');

const PILOTS_LIST_SQL = `
  SELECT
    rea.id,
    rea.first_name,
    rea.last_name,
    rea.email,
    rea.phone_number,
    rea.created_at,
    rea.last_login_at,
    rea.plan_tier,
    rea.onboarding_step,
    rea.status,
    rea.email_verified,
    rea.subscription_status,
    ol.latest_status AS outreach_status
  FROM real_estate_agents rea
  LEFT JOIN LATERAL (
    SELECT status AS latest_status
    FROM outreach_log
    WHERE agent_id = rea.id
    ORDER BY created_at DESC
    LIMIT 1
  ) ol ON true
  WHERE rea.email_verified = true
  ORDER BY rea.created_at DESC
`;

const INSERT_OUTREACH_SQL = `
  INSERT INTO outreach_log (agent_id, contacted_at, channel, notes, status)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING id, agent_id, contacted_at, channel, notes, status, created_at
`;

const UPDATE_OUTREACH_STATUS_SQL = `
  UPDATE outreach_log
  SET status = $1
  WHERE id = $2
  RETURNING id, agent_id, status
`;

const FETCH_OUTREACH_ROW_SQL = `
  SELECT id, agent_id FROM outreach_log WHERE id = $1
`;

const ALLOWED_CHANNELS = ['email', 'phone', 'text', 'linkedin', 'other'];
const ALLOWED_STATUSES = ['contacted', 'interested', 'not_interested', 'converted', 'follow_up', 'no_response'];

class AdminPilotsService {
  /**
   * @param {Object} options
   * @param {Object} options.pool    - pg Pool instance (required)
   * @param {Object} [options.stripe] - Stripe instance (injectable for testing)
   */
  constructor(options = {}) {
    this.pool = options.pool;
    this.stripe = options.stripe || (stripeConfig.secretKey ? new Stripe(stripeConfig.secretKey) : null);
    this.appUrl = options.appUrl || appConfig.appUrl || 'https://leadflow-ai-five.vercel.app';
    // Allow injecting priceId directly for testing; otherwise read from config at call time
    this._proPriceId = options.proPriceId || null;
  }

  /**
   * Returns email-verified pilot agents with their latest outreach status.
   * @returns {Promise<Object[]>}
   */
  async getPilotList() {
    const result = await this.pool.query(PILOTS_LIST_SQL);
    return result.rows.map((row) => ({
      id: row.id,
      name: [row.first_name, row.last_name].filter(Boolean).join(' '),
      email: row.email,
      phone: row.phone_number || null,
      signup_date: row.created_at,
      last_login: row.last_login_at || null,
      plan_tier: row.plan_tier || null,
      onboarding_step: row.onboarding_step || 0,
      status: row.status || null,
      email_verified: row.email_verified,
      subscription_status: row.subscription_status || null,
      outreach_status: row.outreach_status || null,
    }));
  }

  /**
   * Generates a Stripe Checkout Session URL pre-filled for the Pro ($149/mo) plan.
   * Returns { url } on success.
   *
   * @param {string} agentId   - UUID of the agent
   * @param {string} agentEmail - Pre-fill customer email in Stripe
   * @returns {Promise<{url: string}>}
   */
  async generatePaymentLink(agentId, agentEmail) {
    if (!this.stripe) throw new Error('Stripe not configured — STRIPE_SECRET_KEY missing');

    // Read price ID at call time (env may be set after module load in tests)
    const priceId = this._proPriceId
      || stripeConfig.prices.professional?.month
      || process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY
      || null;
    if (!priceId) throw new Error('Pro plan price ID not configured — STRIPE_PRICE_PROFESSIONAL_MONTHLY missing');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: agentEmail || undefined,
      success_url: `${this.appUrl}/dashboard?upgraded=1`,
      cancel_url: `${this.appUrl}/pricing`,
      metadata: {
        agent_id: agentId,
        source: 'admin_payment_link',
      },
    });

    log.info({ agentId, sessionId: session.id }, 'Generated admin payment link');

    return { url: session.url };
  }

  /**
   * Logs a contact event to outreach_log.
   *
   * @param {Object} params
   * @param {string} params.agent_id     - UUID of the agent
   * @param {string} [params.contacted_at] - ISO timestamp (defaults to now)
   * @param {string} params.channel      - Contact channel (email, phone, etc.)
   * @param {string} [params.notes]      - Free-text notes
   * @param {string} [params.status]     - Outreach status (default: 'contacted')
   * @returns {Promise<Object>} The newly created row
   */
  async logContact({ agent_id, contacted_at, channel, notes, status }) {
    if (!agent_id) throw new Error('agent_id is required');
    if (!channel) throw new Error('channel is required');
    if (!ALLOWED_CHANNELS.includes(channel)) {
      throw new Error(`channel must be one of: ${ALLOWED_CHANNELS.join(', ')}`);
    }

    const resolvedStatus = status || 'contacted';
    if (!ALLOWED_STATUSES.includes(resolvedStatus)) {
      throw new Error(`status must be one of: ${ALLOWED_STATUSES.join(', ')}`);
    }

    const contactedAt = contacted_at ? new Date(contacted_at) : new Date();

    const result = await this.pool.query(INSERT_OUTREACH_SQL, [
      agent_id,
      contactedAt,
      channel,
      notes || null,
      resolvedStatus,
    ]);

    return result.rows[0];
  }

  /**
   * Updates the status on an existing outreach_log row.
   *
   * @param {string} outreachId - UUID of the outreach_log row
   * @param {string} status     - New status
   * @returns {Promise<Object>} Updated row
   */
  async updateOutreachStatus(outreachId, status) {
    if (!outreachId) throw new Error('outreachId is required');
    if (!status) throw new Error('status is required');
    if (!ALLOWED_STATUSES.includes(status)) {
      throw new Error(`status must be one of: ${ALLOWED_STATUSES.join(', ')}`);
    }

    // Verify row exists
    const check = await this.pool.query(FETCH_OUTREACH_ROW_SQL, [outreachId]);
    if (check.rows.length === 0) throw new Error('Outreach log entry not found');

    const result = await this.pool.query(UPDATE_OUTREACH_STATUS_SQL, [status, outreachId]);
    return result.rows[0];
  }
}

module.exports = AdminPilotsService;
