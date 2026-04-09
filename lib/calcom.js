/**
 * Cal.com API Client — thin re-export shim
 *
 * All Cal.com logic now lives in lib/services/CalcomService.js.
 * This file re-exports the same public API for backward compatibility.
 */

'use strict';

const calcomService = require('./services/CalcomService');

module.exports = {
    getEventTypes:      (...a) => calcomService.getEventTypes(...a),
    getEventType:       (...a) => calcomService.getEventType(...a),
    getAvailableSlots:  (...a) => calcomService.getAvailableSlots(...a),
    createBooking:      (...a) => calcomService.createBooking(...a),
    getBooking:         (...a) => calcomService.getBooking(...a),
    cancelBooking:      (...a) => calcomService.cancelBooking(...a),
    rescheduleBooking:  (...a) => calcomService.rescheduleBooking(...a),
    getMe:              (...a) => calcomService.getMe(...a),
    getTeamMembers:     (...a) => calcomService.getTeamMembers(...a),
    isConfigured:       () => calcomService.isConfigured(),
    generateBookingUrl: (...a) => calcomService.generateBookingUrl(...a),
    CAL_API_BASE_URL:   require('./services/CalcomService').CAL_API_BASE_URL
};
