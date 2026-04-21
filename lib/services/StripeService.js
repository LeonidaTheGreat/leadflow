'use strict';

const Stripe = require('stripe');
const { stripe: stripeConfig } = require('../config');
const { logger } = require('../logger');
const log = logger.child('StripeService');

class StripeService {
  constructor(options = {}) {
    this.stripe = options.stripe || (stripeConfig.secretKey ? new Stripe(stripeConfig.secretKey) : null);
  }

  /**
   * Creates a Stripe coupon + promo code for a personal upgrade offer.
   * Returns { code, percent_off, stripe_promo_code_id, stripe_coupon_id, expiry_at }
   */
  async createPromoCode({ code, discountPercent, expiryDays, tier, metadata = {} }) {
    if (!this.stripe) throw new Error('Stripe not configured — STRIPE_SECRET_KEY missing');

    const expiresAt = Math.floor((Date.now() + expiryDays * 24 * 60 * 60 * 1000) / 1000);

    const coupon = await this.stripe.coupons.create({
      percent_off: discountPercent,
      duration: 'once',
      redeem_by: expiresAt,
      metadata: { tier, ...metadata },
    });

    const promoCode = await this.stripe.promotionCodes.create({
      coupon: coupon.id,
      code,
      expires_at: expiresAt,
      max_redemptions: 1,
      metadata: { tier, ...metadata },
    });

    log.info({ code, tier, discountPercent }, 'Created promo code');

    return {
      code: promoCode.code,
      percent_off: coupon.percent_off,
      stripe_promo_code_id: promoCode.id,
      stripe_coupon_id: coupon.id,
      expiry_at: new Date(expiresAt * 1000).toISOString(),
    };
  }
}

module.exports = StripeService;
