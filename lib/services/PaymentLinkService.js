'use strict';

const Stripe = require('stripe');
const { stripe: stripeConfig, app: appConfig } = require('../config');
const { logger } = require('../logger');
const log = logger.child('PaymentLinkService');

const CHECKOUT_EXPIRY_SECONDS = 86400;

const TIER_MAP = {
  starter: 'starter',
  pro: 'professional',
  team: 'enterprise',
};

class PaymentLinkService {
  constructor(options = {}) {
    this.stripe = 'stripe' in options ? options.stripe : (stripeConfig.secretKey ? new Stripe(stripeConfig.secretKey) : null);
    this.pool = options.pool || null;
  }

  async generatePaymentLink({ agentId, tier, discountPercent }) {
    if (!this.stripe) throw new Error('Stripe not configured');
    if (!this.pool) throw new Error('Database not configured');

    const internalTier = TIER_MAP[tier] || tier;
    const priceId = stripeConfig.prices[internalTier]?.month;
    if (!priceId) throw new Error(`No price configured for tier: ${tier}`);

    const agent = await this._getAgent(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const sessionParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: agent.email,
      client_reference_id: agentId,
      success_url: `${appConfig.appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appConfig.appUrl}/pricing`,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRY_SECONDS,
      metadata: {
        agent_id: agentId,
        source: 'admin_payment_link',
        tier,
      },
    };

    if (discountPercent && discountPercent > 0) {
      const coupon = await this.stripe.coupons.create({
        percent_off: discountPercent,
        duration: 'once',
        metadata: { agent_id: agentId, source: 'admin_payment_link' },
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    log.info({ agentId, tier, sessionId: session.id }, 'Generated admin payment link');

    return {
      url: session.url,
      sessionId: session.id,
      expiresAt: new Date(session.expires_at * 1000).toISOString(),
    };
  }

  async listTrialPilotAgents() {
    if (!this.pool) throw new Error('Database not configured');
    const result = await this.pool.query(
      `SELECT id, name, email, subscription_status, plan_tier, created_at
       FROM real_estate_agents
       WHERE subscription_status IN ('trial', 'pilot', 'trialing')
       ORDER BY created_at DESC
       LIMIT 200`
    );
    return result.rows;
  }

  async getPaymentLinkStatus(sessionId) {
    if (!this.stripe) throw new Error('Stripe not configured');
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    let status = 'pending';
    if (session.payment_status === 'paid') status = 'paid';
    else if (session.status === 'expired') status = 'expired';
    return { status, session };
  }

  async _getAgent(agentId) {
    const result = await this.pool.query(
      'SELECT id, email, name FROM real_estate_agents WHERE id = $1',
      [agentId]
    );
    return result.rows[0] || null;
  }
}

module.exports = PaymentLinkService;
