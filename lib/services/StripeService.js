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
   * Creates a Stripe coupon + promo code pair for upgrade offers.
   * Returns: { code, percent_off, stripe_promo_code_id, stripe_coupon_id, expiry_at }
   */
  async createPromoCode({ code, discountPercent, expiryDays, tier, metadata = {} }) {
    if (!this.stripe) {
      return this._mockPromoCode({ code, discountPercent, expiryDays, tier, metadata });
    }

    const expiryAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const coupon = await breakers.stripe.execute(() =>
      this.stripe.coupons.create({
        percent_off: discountPercent,
        duration: 'once',
        redeem_by: Math.floor(expiryAt.getTime() / 1000),
        metadata: { tier, ...metadata }
      })
    );

    const promoCode = await breakers.stripe.execute(() =>
      this.stripe.promotionCodes.create({
        coupon: coupon.id,
        code,
        expires_at: Math.floor(expiryAt.getTime() / 1000),
        max_redemptions: 1,
        metadata: { tier, ...metadata }
      })
    );

    log.info({ code, discountPercent, tier }, 'Created promo code');

    return {
      code,
      percent_off: discountPercent,
      stripe_promo_code_id: promoCode.id,
      stripe_coupon_id: coupon.id,
      expiry_at: expiryAt.toISOString()
    };
  }

  _mockPromoCode({ code, discountPercent, expiryDays, tier }) {
    const expiryAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    return {
      code,
      percent_off: discountPercent,
      stripe_promo_code_id: `prmo_mock_${Date.now()}`,
      stripe_coupon_id: `co_mock_${Date.now()}`,
      expiry_at: expiryAt.toISOString()
    };
  }
}

module.exports = StripeService;
