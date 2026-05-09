'use strict';

/**
 * AdminPaymentLinkService
 *
 * Generates Stripe Checkout Sessions that can be shared via any channel
 * (iMessage, WhatsApp, LinkedIn, etc.) without requiring the agent to log in.
 *
 * The generated link prefills agent email and embeds agent_id in metadata so
 * the checkout.session.completed webhook can upgrade the account even when
 * the agent is not logged in at payment time.
 *
 * UC: feat-shareable-stripe-payment-link
 */

const Stripe = require('stripe');
const { stripe: stripeConfig, app: appConfig } = require('../config');
const { logger } = require('../logger');
const { breakers } = require('../utils/circuit-breaker');
const log = logger.child('AdminPaymentLinkService');

// Plan → Stripe price ID mapping.
// Intentionally aligned with the dashboard upgrade-checkout route:
//   starter → STRIPE_PRICE_STARTER_MONTHLY
//   pro     → STRIPE_PRICE_PROFESSIONAL_MONTHLY
//   team    → STRIPE_PRICE_ENTERPRISE_MONTHLY
const PLAN_PRICE_IDS = {
  starter:  process.env.STRIPE_PRICE_STARTER_MONTHLY      || null,
  pro:      process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY  || null,
  team:     process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY    || null,
};

const VALID_TIERS = Object.keys(PLAN_PRICE_IDS);

// Stripe Checkout sessions expire after 24 hours by default.
// This constant names that intent explicitly (no magic number).
const CHECKOUT_SESSION_EXPIRY_HOURS = 24;
const CHECKOUT_SESSION_EXPIRY_SECONDS = CHECKOUT_SESSION_EXPIRY_HOURS * 60 * 60;

class AdminPaymentLinkService {
  /**
   * @param {Object} [options]
   * @param {Object} [options.stripe] - Stripe SDK instance (injectable for testing)
   * @param {Object} [options.pool]   - pg Pool instance (injectable for testing)
   */
  constructor(options = {}) {
    this.stripe = options.stripe || (stripeConfig.secretKey ? new Stripe(stripeConfig.secretKey) : null);
    this.pool   = options.pool || null;
    this.appUrl = options.appUrl || appConfig.appUrl || 'https://leadflow-ai-five.vercel.app';
  }

  /**
   * Generate a shareable Stripe Checkout URL for a specific agent and tier.
   *
   * @param {Object} params
   * @param {string} params.agentId         - UUID of the real_estate_agent
   * @param {string} params.tier            - 'starter' | 'pro' | 'team'
   * @param {number} [params.discountPercent] - Optional coupon (1-99)
   * @returns {Promise<{ url: string, sessionId: string, expiresAt: string }>}
   */
  async generatePaymentLink({ agentId, tier, discountPercent }) {
    if (!this.stripe) {
      throw new Error('Stripe not configured — STRIPE_SECRET_KEY missing');
    }

    if (!VALID_TIERS.includes(tier)) {
      throw new Error(`Invalid tier "${tier}". Must be one of: ${VALID_TIERS.join(', ')}`);
    }

    const priceId = PLAN_PRICE_IDS[tier];
    if (!priceId) {
      throw new Error(`Stripe price ID not configured for tier "${tier}". Set STRIPE_PRICE_${tier.toUpperCase()}_MONTHLY.`);
    }

    // Fetch agent email for prefill
    const agent = await this._fetchAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Optionally create a one-time coupon for the discount
    let discounts = undefined;
    if (discountPercent != null) {
      const coupon = await this._createDiscountCoupon(discountPercent, agentId, tier);
      discounts = [{ coupon: coupon.id }];
    }

    const expiresAt = new Date(Date.now() + CHECKOUT_SESSION_EXPIRY_SECONDS * 1000);

    const sessionParams = {
      customer_email: agent.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        metadata: {
          agent_id: agentId,
          source:   'admin_payment_link',
          tier,
        },
      },
      metadata: {
        agent_id: agentId,
        source:   'admin_payment_link',
        tier,
      },
      success_url: `${this.appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${this.appUrl}/dashboard`,
      expires_at:  Math.floor(expiresAt.getTime() / 1000),
      allow_promotion_codes: discounts == null, // Allow promo codes when no explicit discount
    };

    if (discounts) {
      sessionParams.discounts = discounts;
    }

    const session = await breakers.stripe.execute(() =>
      this.stripe.checkout.sessions.create(sessionParams)
    );

    log.info({ agentId, tier, sessionId: session.id, discountPercent }, 'Admin payment link generated');

    return {
      url:       session.url,
      sessionId: session.id,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * List all agents that are in a trial or pilot state (candidates for upgrade).
   *
   * @returns {Promise<Array>}
   */
  async listUpgradeCandidates() {
    const pool = this._requirePool();
    const result = await pool.query(`
      SELECT
        id,
        email,
        first_name,
        last_name,
        plan_tier,
        subscription_status,
        stripe_customer_id,
        created_at
      FROM real_estate_agents
      WHERE plan_tier IN ('pilot', 'trial', 'free')
         OR subscription_status IN ('trial', 'trialing', 'inactive', NULL)
      ORDER BY created_at DESC
      LIMIT 100
    `);
    return result.rows;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  async _fetchAgent(agentId) {
    const pool = this._requirePool();
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, stripe_customer_id FROM real_estate_agents WHERE id = $1',
      [agentId]
    );
    return result.rows[0] || null;
  }

  async _createDiscountCoupon(discountPercent, agentId, tier) {
    return breakers.stripe.execute(() =>
      this.stripe.coupons.create({
        percent_off: discountPercent,
        duration: 'once',
        metadata: { agent_id: agentId, tier, source: 'admin_payment_link' },
      })
    );
  }

  _requirePool() {
    if (!this.pool) {
      const { getPool } = require('../db');
      this.pool = getPool();
    }
    return this.pool;
  }
}

module.exports = AdminPaymentLinkService;
module.exports.VALID_TIERS = VALID_TIERS;
module.exports.CHECKOUT_SESSION_EXPIRY_HOURS = CHECKOUT_SESSION_EXPIRY_HOURS;
