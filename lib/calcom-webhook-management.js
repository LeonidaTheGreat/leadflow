/**
 * Cal.com Webhook Management — thin re-export shim
 *
 * All webhook management logic now lives in lib/services/CalcomService.js.
 * This file re-exports the same public API for backward compatibility.
 */

'use strict';

const calcomService = require('./services/CalcomService');

module.exports = {
    listWebhooks:           (...a) => calcomService.listWebhooks(...a),
    registerWebhook:        (...a) => calcomService.registerWebhook(...a),
    deleteWebhook:          (...a) => calcomService.deleteWebhook(...a),
    updateWebhook:          (...a) => calcomService.updateWebhook(...a),
    getWebhook:             (...a) => calcomService.getWebhook(...a),
    logWebhookDelivery:     (...a) => calcomService.logWebhookDelivery(...a),
    getWebhookDeliveryLogs: (...a) => calcomService.getWebhookDeliveryLogs(...a),
    getWebhookStats:        (...a) => calcomService.getWebhookStats(...a),
    testWebhook:            (...a) => calcomService.testWebhook(...a),
    generateWebhookSecret:  (...a) => calcomService.generateWebhookSecret(...a)
};
