'use strict';

const Stripe = require('stripe');
const { stripe: stripeConfig } = require('../config');

class StripeService {
  constructor(options = {}) {
    this.stripe = options.stripe || (stripeConfig.secretKey ? new Stripe(stripeConfig.secretKey) : null);
  }

  /**
   * Creates a Stripe coupon + promotion code for a personal upgrade offer.
   * Returns { code, percent_off, stripe_promo_code_id, stripe_coupon_id, expiry_at }
   */
  async createPromoCode({ code, discountPercent, expiryDays, tier, metadata = {} }) {
    if (!this.stripe) {
      throw new Error('Stripe not configured — STRIPE_SECRET_KEY missing');
    }

    const expiryAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const coupon = await this.stripe.coupons.create({
      percent_off: discountPercent,
      duration: 'once',
      redeem_by: Math.floor(expiryAt.getTime() / 1000),
      metadata: { tier, ...metadata }
    });

    const promoCode = await this.stripe.promotionCodes.create({
      coupon: coupon.id,
      code,
      max_redemptions: 1,
      expires_at: Math.floor(expiryAt.getTime() / 1000),
      metadata: { tier, ...metadata }
    });

    return {
      code: promoCode.code,
      percent_off: coupon.percent_off,
      stripe_promo_code_id: promoCode.id,
      stripe_coupon_id: coupon.id,
      expiry_at: expiryAt.toISOString()
    };
  }
}

module.exports = StripeService;
