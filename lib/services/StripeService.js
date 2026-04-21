'use strict';

const Stripe = require('stripe');
const { stripe: stripeConfig } = require('../config');
const { logger } = require('../logger');

const log = logger.child('StripeService');

class StripeService {
  constructor(options = {}) {
    this.stripe = options.stripe || (stripeConfig.secretKey ? new Stripe(stripeConfig.secretKey) : null);
  }

  async createPromoCode({ code, discountPercent, expiryDays, tier, metadata = {} }) {
    if (!this.stripe) throw new Error('Stripe not configured: STRIPE_SECRET_KEY missing');

    const expiryAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const coupon = await this.stripe.coupons.create({
      percent_off: discountPercent,
      duration: 'once',
      redeem_by: Math.floor(expiryAt.getTime() / 1000),
      metadata: { tier, ...metadata },
    });

    const promoCode = await this.stripe.promotionCodes.create({
      coupon: coupon.id,
      code,
      restrictions: { first_time_transaction: false },
      metadata: { tier, ...metadata },
    });

    log.info({ code, discountPercent, tier }, 'Promo code created');

    return {
      code,
      percent_off: discountPercent,
      discount_percent: discountPercent,
      stripe_promo_code_id: promoCode.id,
      stripe_coupon_id: coupon.id,
      expiry_at: expiryAt.toISOString(),
    };
  }
}

module.exports = StripeService;
