'use strict';

const { PostHog } = require('posthog-node');

const FLUSH_AT = 20;
const FLUSH_INTERVAL_MS = 10000;

class PosthogService {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.POSTHOG_API_KEY || '';
    this.host = options.host || process.env.POSTHOG_HOST || 'https://app.posthog.com';

    this.client = new PostHog(this.apiKey, {
      host: this.host,
      flushAt: FLUSH_AT,
      flushInterval: FLUSH_INTERVAL_MS,
    });

    if (process.env.NODE_ENV === 'development') {
      this.client.debug(true);
    }
  }

  isConfigured() {
    return !!this.apiKey;
  }

  trackEvent(distinctId, event, properties = {}) {
    try {
      this.client.capture({
        distinctId,
        event,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          source: 'server',
        },
      });
    } catch (error) {
      console.error('PostHog tracking error:', error);
    }
  }

  trackConversion(distinctId, conversionType, value = 0, properties = {}) {
    this.trackEvent(distinctId, 'conversion', {
      conversion_type: conversionType,
      conversion_value: value,
      ...properties,
    });
  }

  trackLeadCapture(distinctId, email, variant = null, properties = {}) {
    this.trackConversion(distinctId, 'lead_capture', 0, {
      email,
      email_domain: email ? email.split('@')[1] : null,
      variant,
      ...properties,
    });
  }

  trackFormSubmission(distinctId, formName, properties = {}) {
    this.trackEvent(distinctId, 'form_submitted', {
      form_name: formName,
      ...properties,
    });
  }

  identifyUser(distinctId, properties = {}) {
    try {
      this.client.identify({ distinctId, properties });
    } catch (error) {
      console.error('PostHog identify error:', error);
    }
  }

  async getFeatureFlag(distinctId, flagKey) {
    try {
      return await this.client.getFeatureFlag(distinctId, flagKey);
    } catch (error) {
      console.error('PostHog feature flag error:', error);
      return false;
    }
  }

  async shutdown() {
    await this.client.shutdown();
  }
}

module.exports = PosthogService;
