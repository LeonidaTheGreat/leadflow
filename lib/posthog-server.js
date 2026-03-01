// PostHog Node.js Configuration for Server-Side Tracking
const { PostHog } = require('posthog-node')

// Initialize PostHog client
const posthogClient = new PostHog(
  process.env.POSTHOG_API_KEY || '',
  {
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    flushAt: 20, // Flush after 20 events
    flushInterval: 10000, // Flush every 10 seconds
  }
)

// Enable debug mode in development
if (process.env.NODE_ENV === 'development') {
  posthogClient.debug(true)
}

/**
 * Track a server-side event
 * @param {string} distinctId - Unique user identifier
 * @param {string} event - Event name
 * @param {Object} properties - Event properties
 */
function trackServerEvent(distinctId, event, properties = {}) {
  try {
    posthogClient.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        source: 'server'
      }
    })
  } catch (error) {
    console.error('PostHog tracking error:', error)
  }
}

/**
 * Track a conversion event
 * @param {string} distinctId - Unique user identifier
 * @param {string} conversionType - Type of conversion (lead_capture, signup, purchase, etc.)
 * @param {number} value - Conversion value (optional)
 * @param {Object} properties - Additional properties
 */
function trackConversion(distinctId, conversionType, value = 0, properties = {}) {
  trackServerEvent(distinctId, 'conversion', {
    conversion_type: conversionType,
    conversion_value: value,
    ...properties
  })
}

/**
 * Track lead capture
 * @param {string} distinctId - Unique user identifier
 * @param {string} email - Email address captured
 * @param {string} variant - A/B test variant (if applicable)
 * @param {Object} properties - Additional properties
 */
function trackLeadCapture(distinctId, email, variant = null, properties = {}) {
  trackConversion(distinctId, 'lead_capture', 0, {
    email,
    email_domain: email ? email.split('@')[1] : null,
    variant,
    ...properties
  })
}

/**
 * Track form submission
 * @param {string} distinctId - Unique user identifier
 * @param {string} formName - Name of the form
 * @param {Object} properties - Form properties
 */
function trackFormSubmission(distinctId, formName, properties = {}) {
  trackServerEvent(distinctId, 'form_submitted', {
    form_name: formName,
    ...properties
  })
}

/**
 * Identify a user with traits
 * @param {string} distinctId - Unique user identifier
 * @param {Object} properties - User properties
 */
function identifyUser(distinctId, properties = {}) {
  try {
    posthogClient.identify({
      distinctId,
      properties
    })
  } catch (error) {
    console.error('PostHog identify error:', error)
  }
}

/**
 * Check if a feature flag is enabled for a user
 * @param {string} distinctId - Unique user identifier
 * @param {string} flagKey - Feature flag key
 * @returns {Promise<boolean|string>} - Flag value
 */
async function getFeatureFlag(distinctId, flagKey) {
  try {
    return await posthogClient.getFeatureFlag(distinctId, flagKey)
  } catch (error) {
    console.error('PostHog feature flag error:', error)
    return false
  }
}

/**
 * Shutdown PostHog client (call before app exits)
 */
async function shutdownPostHog() {
  await posthogClient.shutdown()
}

module.exports = {
  posthogClient,
  trackServerEvent,
  trackConversion,
  trackLeadCapture,
  trackFormSubmission,
  identifyUser,
  getFeatureFlag,
  shutdownPostHog
}
