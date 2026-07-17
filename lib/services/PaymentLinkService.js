'use strict';

const Stripe = require('stripe');
const { stripe: stripeConfig } = require('../config');
const { getPool } = require('../db');
const { logger } = require('../logger');
const log = logger.child('PaymentLinkService');

const PLANS = {
  starter:      { name: 'LeadFlow Starter',      amount: 4900  },
  professional: { name: 'LeadFlow Professional', amount: 14900 },
  enterprise:   { name: 'LeadFlow Enterprise',   amount: 39900 },
};

const COMPLETED_ONBOARDING_SQL = `
  SELECT id, email, first_name, last_name, plan_tier, stripe_customer_id, created_at
  FROM real_estate_agents
  WHERE email_verified = true
    AND onboarding_completed = true
    AND subscription_status = 'inactive'
  ORDER BY created_at DESC
`;

const FETCH_AGENT_SQL = `
  SELECT id, email, first_name, last_name, stripe_customer_id, plan_tier
  FROM real_estate_agents
  WHERE id = $1
`;

class PaymentLinkService {
  constructor(options = {}) {
    this.stripe = options.stripe || (stripeConfig.secretKey ? new Stripe(stripeConfig.secretKey) : null);
    this.pool = options.pool || getPool();
  }

  async listCompletedOnboardingAgents() {
    const { rows } = await this.pool.query(COMPLETED_ONBOARDING_SQL);
    return rows;
  }

  async createPaymentLink(agentId, planTier) {
    if (!this.stripe) throw new Error('Stripe not configured — STRIPE_SECRET_KEY missing');

    const plan = PLANS[planTier];
    if (!plan) throw new Error(`Invalid plan tier: ${planTier}. Must be one of: ${Object.keys(PLANS).join(', ')}`);

    const { rows } = await this.pool.query(FETCH_AGENT_SQL, [agentId]);
    const agent = rows[0];
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const metadata = {
      agent_id: agentId,
      tier: planTier,
      source: 'admin_payment_link',
    };
    if (agent.stripe_customer_id) {
      metadata.stripe_customer_id = agent.stripe_customer_id;
    }

    const link = await this.stripe.paymentLinks.create({
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: plan.name },
          unit_amount: plan.amount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      metadata,
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: 'Thank you! Your LeadFlow subscription is now active. Check your email for next steps.',
        },
      },
    });

    log.info({ agentId, planTier, linkId: link.id, email: agent.email }, 'Payment link created');
    return { url: link.url, linkId: link.id, agent };
  }
}

module.exports = PaymentLinkService;
