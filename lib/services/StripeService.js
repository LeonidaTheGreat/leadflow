'use strict';

const Stripe = require('stripe');
const { stripe: stripeConfig } = require('../config');

class StripeService {
  constructor(options = {}) {
    this.stripe = options.stripe || (stripeConfig.secretKey ? new Stripe(stripeConfig.secretKey) : null);
  }

  async createPromoCode({ code, discountPercent, expiryDays, tier, metadata = {} }) {
    if (!this.stripe) throw new Error('Stripe not configured: STRIPE_SECRET_KEY is missing');

    const expiresAt = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60;

    const coupon = await this.stripe.coupons.create({
      percent_off: discountPercent,
      duration: 'once',
      redeem_by: expiresAt,
      name: `${discountPercent}% off ${tier}`,
      metadata: { tier, ...metadata }
    });

    const promoCode = await this.stripe.promotionCodes.create({
      coupon: coupon.id,
      code,
      expires_at: expiresAt,
      max_redemptions: 1,
      metadata: { tier, ...metadata }
    });

    return {
      code: promoCode.code,
      percent_off: coupon.percent_off,
      discount_percent: coupon.percent_off,
      stripe_promo_code_id: promoCode.id,
      stripe_coupon_id: coupon.id,
      expiry_at: new Date(expiresAt * 1000).toISOString()
    };
  }
}

module.exports = StripeService;
