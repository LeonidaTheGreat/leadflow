'use strict';

/**
 * E2E backward-compat test for Cal.com class refactor (PR #1156)
 * Verifies all module.exports shims are present and callable.
 */

const assert = require('assert');
let passed = 0;
let failed = 0;

function check(name, fn) {
    try {
        fn();
        passed += 1;
        console.log(`  ✅ ${name}`);
    } catch (err) {
        failed += 1;
        console.error(`  ❌ ${name}: ${err.message}`);
    }
}

console.log('\n🧪 Cal.com class refactor — backward-compat shim coverage\n');

// === CalcomClient ===
console.log('--- CalcomClient ---');
const CalcomClient = require('../../lib/services/CalcomClient');

check('exports class constructor', () => {
    assert.strictEqual(typeof CalcomClient, 'function');
    const c = new CalcomClient();
    assert.strictEqual(typeof c.getEventTypes, 'function');
});
check('module.exports.getEventTypes shim exists', () => assert.strictEqual(typeof CalcomClient.getEventTypes, 'function'));
check('module.exports.getEventType shim exists', () => assert.strictEqual(typeof CalcomClient.getEventType, 'function'));
check('module.exports.getAvailableSlots shim exists', () => assert.strictEqual(typeof CalcomClient.getAvailableSlots, 'function'));
check('module.exports.createBooking shim exists', () => assert.strictEqual(typeof CalcomClient.createBooking, 'function'));
check('module.exports.getBooking shim exists', () => assert.strictEqual(typeof CalcomClient.getBooking, 'function'));
check('module.exports.cancelBooking shim exists', () => assert.strictEqual(typeof CalcomClient.cancelBooking, 'function'));
check('module.exports.rescheduleBooking shim exists', () => assert.strictEqual(typeof CalcomClient.rescheduleBooking, 'function'));
check('module.exports.getMe shim exists', () => assert.strictEqual(typeof CalcomClient.getMe, 'function'));
check('module.exports.getTeamMembers shim exists', () => assert.strictEqual(typeof CalcomClient.getTeamMembers, 'function'));
check('module.exports.isConfigured shim exists', () => assert.strictEqual(typeof CalcomClient.isConfigured, 'function'));
check('module.exports.generateBookingUrl shim exists', () => assert.strictEqual(typeof CalcomClient.generateBookingUrl, 'function'));
check('module.exports.CAL_API_BASE_URL exists', () => assert.strictEqual(typeof CalcomClient.CAL_API_BASE_URL, 'string'));

// === CalcomWebhookHandler ===
console.log('\n--- CalcomWebhookHandler ---');
const CalcomWebhookHandler = require('../../lib/services/CalcomWebhookHandler');

check('exports class constructor', () => {
    assert.strictEqual(typeof CalcomWebhookHandler, 'function');
    const h = new CalcomWebhookHandler();
    assert.strictEqual(typeof h.handleCalWebhook, 'function');
});
check('module.exports.handleCalWebhook shim exists', () => assert.strictEqual(typeof CalcomWebhookHandler.handleCalWebhook, 'function'));
check('module.exports.calcomWebhookHandler shim exists', () => assert.strictEqual(typeof CalcomWebhookHandler.calcomWebhookHandler, 'function'));
check('module.exports.verifyWebhookSignature shim exists', () => assert.strictEqual(typeof CalcomWebhookHandler.verifyWebhookSignature, 'function'));
check('module.exports.handleBookingCreated shim exists', () => assert.strictEqual(typeof CalcomWebhookHandler.handleBookingCreated, 'function'));
check('module.exports.handleBookingRescheduled shim exists', () => assert.strictEqual(typeof CalcomWebhookHandler.handleBookingRescheduled, 'function'));
check('module.exports.handleBookingCancelled shim exists', () => assert.strictEqual(typeof CalcomWebhookHandler.handleBookingCancelled, 'function'));
check('module.exports.handleMeetingEnded shim exists', () => assert.strictEqual(typeof CalcomWebhookHandler.handleMeetingEnded, 'function'));
check('module.exports.withRetry shim exists', () => assert.strictEqual(typeof CalcomWebhookHandler.withRetry, 'function'));
check('module.exports.sleep shim exists', () => assert.strictEqual(typeof CalcomWebhookHandler.sleep, 'function'));
check('module.exports.calculateBackoffDelay shim exists', () => assert.strictEqual(typeof CalcomWebhookHandler.calculateBackoffDelay, 'function'));
check('module.exports.RETRY_CONFIG exists', () => assert.ok(CalcomWebhookHandler.RETRY_CONFIG && typeof CalcomWebhookHandler.RETRY_CONFIG === 'object'));

// === CalcomWebhookManagement ===
console.log('\n--- CalcomWebhookManagement ---');
const CalcomWebhookManagement = require('../../lib/services/CalcomWebhookManagement');

check('exports class constructor', () => {
    assert.strictEqual(typeof CalcomWebhookManagement, 'function');
    const m = new CalcomWebhookManagement();
    assert.strictEqual(typeof m.listWebhooks, 'function');
});
check('module.exports.listWebhooks shim exists', () => assert.strictEqual(typeof CalcomWebhookManagement.listWebhooks, 'function'));
check('module.exports.registerWebhook shim exists', () => assert.strictEqual(typeof CalcomWebhookManagement.registerWebhook, 'function'));
check('module.exports.deleteWebhook shim exists', () => assert.strictEqual(typeof CalcomWebhookManagement.deleteWebhook, 'function'));
check('module.exports.updateWebhook shim exists', () => assert.strictEqual(typeof CalcomWebhookManagement.updateWebhook, 'function'));
check('module.exports.getWebhook shim exists', () => assert.strictEqual(typeof CalcomWebhookManagement.getWebhook, 'function'));
check('module.exports.logWebhookDelivery shim exists', () => assert.strictEqual(typeof CalcomWebhookManagement.logWebhookDelivery, 'function'));
check('module.exports.getWebhookDeliveryLogs shim exists', () => assert.strictEqual(typeof CalcomWebhookManagement.getWebhookDeliveryLogs, 'function'));
check('module.exports.getWebhookStats shim exists', () => assert.strictEqual(typeof CalcomWebhookManagement.getWebhookStats, 'function'));
check('module.exports.testWebhook shim exists', () => assert.strictEqual(typeof CalcomWebhookManagement.testWebhook, 'function'));
// This export existed in the old API and must be preserved for backward compat:
check('module.exports.generateWebhookSecret shim exists (was in old API)', () =>
    assert.strictEqual(typeof CalcomWebhookManagement.generateWebhookSecret, 'function')
);

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
