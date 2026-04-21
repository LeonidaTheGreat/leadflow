'use strict';

const Stripe = require('stripe');
const { stripe: stripeConfig } = require('../config');
const { logger } = require('../logger');
const { breakers } = require('../utils/circuit-breaker');

const log = logger.child('StripeService');

class StripeService {
  constructor(options = {}) {
    this.stripe = options.stripe || (stripeConfig.secretKey ? new Stripe(stripeConfig.secretKey) : null);
  }

  /**
   * Creates a Stripe coupon + promotion code for a personal upgrade offer.
   * Returns normalized result with stripe_promo_code_id, stripe_coupon_id, code, percent_off, expiry_at.
   */
  async createPromoCode({ code, discountPercent, expiryDays, tier, metadata = {} }) {
    if (!this.stripe) {
      return this._mockPromoCode({ code, discountPercent, expiryDays, tier, metadata });
    }

    const redeemBy = Math.floor((Date.now() + expiryDays * 24 * 60 * 60 * 1000) / 1000);

    const coupon = await breakers.stripe.execute(() =>
      this.stripe.coupons.create({
        percent_off: discountPercent,
        duration: 'once',
        redeem_by: redeemBy,
        metadata: { tier, ...metadata },
      })
    );

    const promoCode = await breakers.stripe.execute(() =>
      this.stripe.promotionCodes.create({
        coupon: coupon.id,
        code,
        max_redemptions: 1,
        metadata: { tier, ...metadata },
      })
    );

    return {
      code: promoCode.code,
      percent_off: coupon.percent_off,
      discount_percent: coupon.percent_off,
      stripe_promo_code_id: promoCode.id,
      stripe_coupon_id: coupon.id,
      expiry_at: new Date(redeemBy * 1000).toISOString(),
    };
  }

  _mockPromoCode({ code, discountPercent, expiryDays }) {
    const redeemBy = Date.now() + expiryDays * 24 * 60 * 60 * 1000;
    return {
      code,
      percent_off: discountPercent,
      discount_percent: discountPercent,
      stripe_promo_code_id: 'prmo_mock_' + Date.now(),
      stripe_coupon_id: 'co_mock_' + Date.now(),
      expiry_at: new Date(redeemBy).toISOString(),
    };
  }
}

module.exports = StripeService;
