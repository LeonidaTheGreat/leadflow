/**
 * Cal.com Webhook Handler — thin re-export shim
 *
 * All webhook handling logic now lives in lib/services/CalcomService.js.
 * This file re-exports the same public API for backward compatibility.
 *
 * sequence-service integration (createLeadSequence) is in CalcomService.
 * Sequences: 'post_viewing' on meeting_ended, 'no_show' on booking_cancelled.
 */

'use strict';

const calcomService = require('./services/CalcomService');
const { RETRY_CONFIG } = require('./services/CalcomService');

module.exports = {
    handleCalWebhook:         (...a) => calcomService.handleCalWebhook(...a),
    calcomWebhookHandler:     calcomService.calcomWebhookHandler,
    verifyWebhookSignature:   (...a) => calcomService.verifyWebhookSignature(...a),
    handleBookingCreated:     (...a) => calcomService.handleBookingCreated(...a),
    handleBookingRescheduled: (...a) => calcomService.handleBookingRescheduled(...a),
    handleBookingCancelled:   (...a) => calcomService.handleBookingCancelled(...a),
    handleMeetingEnded:       (...a) => calcomService.handleMeetingEnded(...a),
    withRetry:                (...a) => calcomService.withRetry(...a),
    sleep:                    (...a) => calcomService.sleep(...a),
    calculateBackoffDelay:    (...a) => calcomService.calculateBackoffDelay(...a),
    RETRY_CONFIG
};
