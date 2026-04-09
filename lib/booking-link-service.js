/**
 * @deprecated Use lib/services/BookingLinkService instead.
 * This shim exists for backward compatibility with existing imports.
 */

'use strict';

const BookingLinkService = require('./services/BookingLinkService');

const _instance = new BookingLinkService();

module.exports = {
    generateAgentBookingLink: _instance.generateAgentBookingLink.bind(_instance),
    getAgentBookingLinks: _instance.getAgentBookingLinks.bind(_instance),
    createPersonalizedBookingLink: _instance.createPersonalizedBookingLink.bind(_instance),
    deactivateBookingLink: _instance.deactivateBookingLink.bind(_instance),
    updateBookingConfig: _instance.updateBookingConfig.bind(_instance),
    getQuickBookingLink: _instance.getQuickBookingLink.bind(_instance),
    SCENARIOS: BookingLinkService.SCENARIOS
};
