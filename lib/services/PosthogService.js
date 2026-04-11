'use strict';

/**
 * PosthogService — Server-side PostHog analytics tracking
 */

const { PostHog } = require('posthog-node');

class PosthogService {
  /**
   * @param {Object} [options]
   * @param {string} [options.apiKey]       - PostHog API key
   * @param {string} [options.host]         - PostHog host URL
   * @param {number} [options.flushAt]      - Flush after N events
   * @param {number} [options.flushInterval] - Flush interval in ms
   * @param {Object} [options.client]       - Pre-constructed PostHog client (for testing)
   */
  constructor(options = {}) {
    const apiKey = options.apiKey || process.env.POSTHOG_API_KEY || '';
    const host = options.host || process.env.POSTHOG_HOST || 'https://app.posthog.com';

    this._client = options.client || new PostHog(apiKey, {
      host,
      flushAt: options.flushAt || 20,
      flushInterval: options.flushInterval || 10000,
    });

    if (process.env.NODE_ENV === 'development') {
      this._client.debug(true);
    }
  }

  /**
   * Track a server-side event
   * @param {string} distinctId
   * @param {string} event
   * @param {Object} properties
   */
  trackServerEvent(distinctId, event, properties = {}) {
    try {
      this._client.capture({
        distinctId,
        event,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          source: 'server'
        }
      });
    } catch (error) {
      console.error('PostHog tracking error:', error);
    }
  }

  /**
   * Track a conversion event
   * @param {string} distinctId
   * @param {string} conversionType
   * @param {number} value
   * @param {Object} properties
   */
  trackConversion(distinctId, conversionType, value = 0, properties = {}) {
    this.trackServerEvent(distinctId, 'conversion', {
      conversion_type: conversionType,
      conversion_value: value,
      ...properties
    });
  }

  /**
   * Track lead capture
   * @param {string} distinctId
   * @param {string} email
   * @param {string|null} variant
   * @param {Object} properties
   */
  trackLeadCapture(distinctId, email, variant = null, properties = {}) {
    this.trackConversion(distinctId, 'lead_capture', 0, {
      email,
      email_domain: email ? email.split('@')[1] : null,
      variant,
      ...properties
    });
  }

  /**
   * Track form submission
   * @param {string} distinctId
   * @param {string} formName
   * @param {Object} properties
   */
  trackFormSubmission(distinctId, formName, properties = {}) {
    this.trackServerEvent(distinctId, 'form_submitted', {
      form_name: formName,
      ...properties
    });
  }

  /**
   * Identify a user with traits
   * @param {string} distinctId
   * @param {Object} properties
   */
  identifyUser(distinctId, properties = {}) {
    try {
      this._client.identify({ distinctId, properties });
    } catch (error) {
      console.error('PostHog identify error:', error);
    }
  }

  /**
   * Check if a feature flag is enabled for a user
   * @param {string} distinctId
   * @param {string} flagKey
   * @returns {Promise<boolean|string>}
   */
  async getFeatureFlag(distinctId, flagKey) {
    try {
      return await this._client.getFeatureFlag(distinctId, flagKey);
    } catch (error) {
      console.error('PostHog feature flag error:', error);
      return false;
    }
  }

  /**
   * Shutdown PostHog client (call before app exits)
   */
  async shutdown() {
    await this._client.shutdown();
  }
}

module.exports = PosthogService;
