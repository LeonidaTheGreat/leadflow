'use strict';
const { CalcomService, RETRY_CONFIG, CAL_API_BASE_URL } = require('../../lib/services/CalcomService');
const calcom = require('../../lib/calcom');
const webhookHandler = require('../../lib/calcom-webhook-handler');
const webhookMgmt = require('../../lib/calcom-webhook-management');

describe('CalcomService class', () => {
    let service;
    beforeEach(() => {
        service = new CalcomService({ apiKey: 'test-key', username: 'test-user', webhookSecret: 'test-secret' });
    });

    test('constructor sets config', () => {
        expect(service.apiKey).toBe('test-key');
        expect(service.username).toBe('test-user');
    });

    test('isConfigured returns true when apiKey set', () => {
        expect(service.isConfigured()).toBe(true);
    });

    test('isConfigured returns false without apiKey', () => {
        const svc = new CalcomService();
        if (!process.env.CAL_API_KEY) expect(svc.isConfigured()).toBe(false);
    });

    test('generateBookingUrl builds correct URL', () => {
        expect(service.generateBookingUrl('discovery-call')).toBe('https://cal.com/test-user/discovery-call');
        expect(service.generateBookingUrl('tour', 'other')).toBe('https://cal.com/other/tour');
    });

    test('getEventTypes returns mock data when unconfigured', async () => {
        const svc = new CalcomService();
        if (!process.env.CAL_API_KEY) {
            const types = await svc.getEventTypes();
            expect(Array.isArray(types)).toBe(true);
            expect(types[0].mock).toBe(true);
        }
    });

    test('sleep resolves after delay', async () => {
        const start = Date.now();
        await service.sleep(50);
        expect(Date.now() - start).toBeGreaterThanOrEqual(40);
    });

    test('withRetry succeeds on first attempt', async () => {
        expect(await service.withRetry(() => Promise.resolve('ok'), {}, 'test')).toBe('ok');
    });

    test('withRetry throws non-retryable errors', async () => {
        const err = new Error('bad'); err.status = 400;
        await expect(service.withRetry(() => { throw err; }, {}, 'test')).rejects.toThrow('bad');
    });

    test('verifyWebhookSignature validates', () => {
        const crypto = require('crypto');
        const payload = '{"test":true}';
        const sig = crypto.createHmac('sha256', 'test-secret').update(payload).digest('hex');
        expect(service.verifyWebhookSignature(payload, sig)).toBe(true);
        expect(service.verifyWebhookSignature(payload, 'bad')).toBe(false);
    });

    test('generateWebhookSecret returns whsec_ prefixed', () => {
        expect(service.generateWebhookSecret().startsWith('whsec_')).toBe(true);
    });

    test('handleCalWebhook dispatches unknown events', async () => {
        const r = await service.handleCalWebhook({ triggerEvent: 'UNKNOWN', payload: {} });
        expect(r.received).toBe(true);
    });
});

describe('Exports', () => {
    test('RETRY_CONFIG', () => { expect(RETRY_CONFIG.maxRetries).toBe(3); });
    test('CAL_API_BASE_URL', () => { expect(CAL_API_BASE_URL).toBe('https://api.cal.com/v2'); });
});

describe('Shim: lib/calcom.js', () => {
    test('exports all functions', () => {
        for (const fn of ['getEventTypes','getEventType','getAvailableSlots','createBooking','getBooking','cancelBooking','rescheduleBooking','getMe','getTeamMembers','isConfigured','generateBookingUrl']) {
            expect(typeof calcom[fn]).toBe('function');
        }
    });
    test('no stack overflow on isConfigured', () => { expect(() => calcom.isConfigured()).not.toThrow(); });
    test('generateBookingUrl delegates', () => { expect(calcom.generateBookingUrl('s', 'u')).toBe('https://cal.com/u/s'); });
});

describe('Shim: lib/calcom-webhook-handler.js', () => {
    test('exports all functions', () => {
        for (const fn of ['handleCalWebhook','calcomWebhookHandler','verifyWebhookSignature','handleBookingCreated','handleBookingRescheduled','handleBookingCancelled','handleMeetingEnded','withRetry','sleep','calculateBackoffDelay']) {
            expect(typeof webhookHandler[fn]).toBe('function');
        }
    });
});

describe('Shim: lib/calcom-webhook-management.js', () => {
    test('exports all functions', () => {
        for (const fn of ['listWebhooks','registerWebhook','deleteWebhook','updateWebhook','getWebhook','logWebhookDelivery','getWebhookDeliveryLogs','getWebhookStats','testWebhook','generateWebhookSecret']) {
            expect(typeof webhookMgmt[fn]).toBe('function');
        }
    });
});
