'use strict';

/**
 * Shared JSDoc typedefs for LeadFlow domain entities.
 *
 * Import from services with:
 *   @typedef {import('../types').Lead} Lead
 *   @typedef {import('../types').Agent} Agent
 */

/**
 * @typedef {Object} Lead
 * @property {string} id
 * @property {?string} agent_id
 * @property {?string} conversation_id
 * @property {?number} fub_id
 * @property {?string} first_name
 * @property {?string} last_name
 * @property {?string} name
 * @property {?string} email
 * @property {?string} phone
 * @property {?string} source
 * @property {?string} status
 * @property {?string} stage
 * @property {?string} pipeline_stage
 * @property {?boolean} sms_consent
 * @property {?boolean} email_consent
 * @property {?boolean} dnc
 * @property {?string} notes
 * @property {?Object<string, any>} metadata
 * @property {?string} created_at
 * @property {?string} updated_at
 */

/**
 * @typedef {Object} Agent
 * @property {string} id
 * @property {string} email
 * @property {?string} name
 * @property {?string} phone
 * @property {?string} brokerage_name
 * @property {?string} plan_tier
 * @property {?string} subscription_status
 * @property {?string} stripe_customer_id
 * @property {?number} mrr
 * @property {?string} trial_ends_at
 * @property {?string} current_period_end
 * @property {?Object<string, any>} settings
 * @property {?Object<string, any>} metadata
 * @property {?string} created_at
 * @property {?string} updated_at
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {?string} lead_id
 * @property {?string} conversation_id
 * @property {?string} agent_id
 * @property {?string} direction
 * @property {?string} channel
 * @property {?string} body
 * @property {?string} status
 * @property {?string} twilio_sid
 * @property {?string} provider_message_id
 * @property {?boolean} is_ai_generated
 * @property {?string} sent_at
 * @property {?string} delivered_at
 * @property {?string} failed_at
 * @property {?Object<string, any>} metadata
 * @property {?string} created_at
 * @property {?string} updated_at
 */

/**
 * @typedef {Object} Subscription
 * @property {string} id
 * @property {string} user_id
 * @property {?string} agent_id
 * @property {?string} stripe_customer_id
 * @property {?string} stripe_subscription_id
 * @property {?string} stripe_price_id
 * @property {?string} tier
 * @property {?string} interval
 * @property {?string} status
 * @property {?string} current_period_start
 * @property {?string} current_period_end
 * @property {?string} cancel_at
 * @property {?string} canceled_at
 * @property {?string} trial_start
 * @property {?string} trial_end
 * @property {?Object<string, any>} metadata
 * @property {?string} created_at
 * @property {?string} updated_at
 */

/**
 * @typedef {Object} Booking
 * @property {string} id
 * @property {?string} lead_id
 * @property {?string} agent_id
 * @property {?string} booking_link_id
 * @property {?string} external_booking_id
 * @property {?string} title
 * @property {?string} status
 * @property {?string} starts_at
 * @property {?string} ends_at
 * @property {?string} timezone
 * @property {?string} location
 * @property {?string} notes
 * @property {?Object<string, any>} metadata
 * @property {?string} created_at
 * @property {?string} updated_at
 */

module.exports = {};
