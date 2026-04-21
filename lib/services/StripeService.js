const Stripe = require('stripe');
const { logger } = require('../logger');
const { breakers } = require('../utils/circuit-breaker');
const { stripe: stripeConfig } = require('../config');

const log = logger.child('StripeService');

class StripeService {
  constructor(options = {}) {
    this.stripe = options.stripe || (stripeConfig.secretKey ? new Stripe(stripeConfig.secretKey) : null);
  }

  /**
   * Create a Stripe promo code for personal upgrade offers
   * @param {Object} params
   * @param {string} params.code - human-readable code (e.g., "UPGRADE50_7DAYS_XYZ")
   * @param {number} params.discountPercent - discount % (1-99)
   * @param {number} params.expiryDays - days until expiry (1-30)
   * @param {string} params.tier - plan tier this applies to (starter/pro/team)
   * @param {Object} params.metadata - optional metadata for audit trail
   * @returns {Promise<Object>} { stripe_promo_code_id, stripe_coupon_id, code, expiry_at }
   */
  async createPromoCode(params) {
    const { code, discountPercent, expiryDays, tier, metadata = {} } = params;

    if (!this.stripe) {
      // Mock mode for development
      const expiryAt = new Date();
      expiryAt.setDate(expiryAt.getDate() + expiryDays);
      return {
        stripe_promo_code_id: `prmo_mock_${Date.now()}`,
        stripe_coupon_id: `co_mock_${Date.now()}`,
        code,
        expiry_at: expiryAt,
        percent_off: discountPercent,
      };
    }

    try {
      // Calculate expiry timestamp (Unix seconds)
      const expiryAt = new Date();
      expiryAt.setDate(expiryAt.getDate() + expiryDays);
      const expiryTimestamp = Math.floor(expiryAt.getTime() / 1000);

      // Create Stripe coupon with percent_off
      const coupon = await breakers.stripe.execute(() =>
        this.stripe.coupons.create({
          percent_off: discountPercent,
          duration: 'repeating',
          duration_in_months: 1,
          metadata: {
            tier,
            tier_scope: tier, // which plan tier this applies to
            source: 'leadflow_upgrade_offer',
            ...metadata,
          },
        })
      );

      log.info('Coupon created', { coupon_id: coupon.id, discount: discountPercent });

      // Create promo code pointing to coupon with expiry
      const promoCode = await breakers.stripe.execute(() =>
        this.stripe.promotionCodes.create({
          coupon: coupon.id,
          code,
          expires_at: expiryTimestamp,
          max_redemptions: 1, // Only allow one redemption per promo code
          metadata: {
            tier,
            source: 'leadflow_upgrade_offer',
            ...metadata,
          },
        })
      );

      log.info('Promo code created', {
        promo_code_id: promoCode.id,
        code: promoCode.code,
        coupon_id: coupon.id,
        expires_at: expiryTimestamp,
      });

      return {
        stripe_promo_code_id: promoCode.id,
        stripe_coupon_id: coupon.id,
        code: promoCode.code,
        expiry_at: expiryAt,
        percent_off: discountPercent,
        max_redemptions: 1,
      };
    } catch (error) {
      log.error('Failed to create promo code', { error: error.message, params });
      throw error;
    }
  }

  /**
   * Retrieve a promo code from Stripe
   */
  async getPromoCode(promoCodeId) {
    if (!this.stripe) return null;

    try {
      return await breakers.stripe.execute(() =>
        this.stripe.promotionCodes.retrieve(promoCodeId)
      );
    } catch (error) {
      log.warn('Failed to retrieve promo code', { promoCodeId, error: error.message });
      return null;
    }
  }

  /**
   * Check if a promo code has been redeemed
   */
  async checkPromoCodeRedemption(promoCodeId) {
    if (!this.stripe) return { redeemed: false };

    try {
      const promoCode = await this.getPromoCode(promoCodeId);
      if (!promoCode) return { redeemed: false };

      return {
        redeemed: promoCode.times_redeemed > 0,
        times_redeemed: promoCode.times_redeemed,
        max_redemptions: promoCode.max_redemptions,
      };
    } catch (error) {
      log.warn('Failed to check promo code redemption', { promoCodeId, error: error.message });
      return { redeemed: false };
    }
  }
}

module.exports = StripeService;
