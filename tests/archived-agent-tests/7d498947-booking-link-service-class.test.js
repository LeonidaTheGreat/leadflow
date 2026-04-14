/**
 * E2E test: BookingLinkService class refactor (task 7d498947)
 * Verifies:
 * - BookingLinkService class is importable and well-formed
 * - Backward-compat shim (lib/booking-link-service.js) re-exports all methods correctly
 * - DB injection works (constructor accepts options.db)
 * - Methods are bound correctly (no `this` loss through shim)
 * - SCENARIOS constant is accessible on both class and shim
 * - generateAgentBookingLink rejects when DB is not configured
 * - getQuickBookingLink maps scenario shorthand to full slug
 */

'use strict';

const assert = require('assert');
const path = require('path');

const SERVICE_PATH = path.join(__dirname, '..', 'lib', 'services', 'BookingLinkService.js');
const SHIM_PATH = path.join(__dirname, '..', 'lib', 'booking-link-service.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (err) {
        console.log(`  ❌ ${name}: ${err.message}`);
        failed++;
    }
}

async function testAsync(name, fn) {
    try {
        await fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (err) {
        console.log(`  ❌ ${name}: ${err.message}`);
        failed++;
    }
}

console.log('\n🧪 BookingLinkService class refactor — E2E tests\n');

// --- 1. Module existence ---
console.log('1. Module existence');
test('BookingLinkService.js exists at lib/services/', () => {
    const fs = require('fs');
    assert(fs.existsSync(SERVICE_PATH), `Not found: ${SERVICE_PATH}`);
});
test('Backward-compat shim exists at lib/booking-link-service.js', () => {
    const fs = require('fs');
    assert(fs.existsSync(SHIM_PATH), `Not found: ${SHIM_PATH}`);
});

// --- 2. Class structure ---
console.log('\n2. Class structure');
const BookingLinkService = require(SERVICE_PATH);

test('BookingLinkService is a constructor', () => {
    assert.strictEqual(typeof BookingLinkService, 'function');
});
test('BookingLinkService can be instantiated without args', () => {
    const svc = new BookingLinkService();
    assert(svc instanceof BookingLinkService);
});
const EXPECTED_METHODS = [
    'generateAgentBookingLink',
    'getAgentBookingLinks',
    'createPersonalizedBookingLink',
    'deactivateBookingLink',
    'updateBookingConfig',
    'getQuickBookingLink',
];
EXPECTED_METHODS.forEach(method => {
    test(`instance has method: ${method}`, () => {
        const svc = new BookingLinkService();
        assert.strictEqual(typeof svc[method], 'function', `Missing method: ${method}`);
    });
});
test('SCENARIOS is a static property on the class', () => {
    assert(BookingLinkService.SCENARIOS, 'SCENARIOS missing');
    assert.strictEqual(BookingLinkService.SCENARIOS.DISCOVERY, 'discovery-call');
    assert.strictEqual(BookingLinkService.SCENARIOS.PROPERTY_TOUR, 'property-tour');
    assert.strictEqual(BookingLinkService.SCENARIOS.CONSULTATION, 'consultation');
    assert.strictEqual(BookingLinkService.SCENARIOS.PHONE_CALL, 'phone-call');
    assert.strictEqual(BookingLinkService.SCENARIOS.MEETING, 'meeting');
    assert.strictEqual(BookingLinkService.SCENARIOS.SHOWING, 'property-showing');
});

// --- 3. DB injection ---
console.log('\n3. Dependency injection');
test('Constructor accepts options.db', () => {
    const mockDb = { from: () => {} };
    const svc = new BookingLinkService({ db: mockDb });
    assert.strictEqual(svc._getDb(), mockDb);
});
test('_getDb() returns null when no env vars and no injected db', () => {
    const savedUrl = process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    const svc = new BookingLinkService();
    const result = svc._getDb();
    if (savedUrl !== undefined) process.env.NEXT_PUBLIC_API_URL = savedUrl;
    assert.strictEqual(result, null);
});

// --- 4. Behavior tests with injected mock DB ---
console.log('\n4. Behavior with mock DB');

async function runBehaviorTests() {
    // generateAgentBookingLink — throws when DB not configured
    await testAsync('generateAgentBookingLink throws when db not configured', async () => {
        const savedUrl = process.env.NEXT_PUBLIC_API_URL;
        const savedKey = process.env.API_SECRET_KEY;
        delete process.env.NEXT_PUBLIC_API_URL;
        delete process.env.API_SECRET_KEY;
        const svc = new BookingLinkService();
        try {
            await svc.generateAgentBookingLink('agent-1', 'discovery-call');
            assert.fail('Should have thrown');
        } catch (err) {
            assert(err.message.includes('Database not configured'), `Unexpected error: ${err.message}`);
        } finally {
            if (savedUrl !== undefined) process.env.NEXT_PUBLIC_API_URL = savedUrl;
            if (savedKey !== undefined) process.env.API_SECRET_KEY = savedKey;
        }
    });

    // generateAgentBookingLink — throws when agent not found
    await testAsync('generateAgentBookingLink throws when agent not found', async () => {
        const mockDb = {
            from: () => ({
                select: () => ({
                    eq: () => ({
                        single: async () => ({ data: null, error: new Error('not found') })
                    })
                })
            })
        };
        const svc = new BookingLinkService({ db: mockDb });
        try {
            await svc.generateAgentBookingLink('bad-agent', 'discovery-call');
            assert.fail('Should have thrown');
        } catch (err) {
            assert(err.message.includes('Agent not found'), `Unexpected error: ${err.message}`);
        }
    });

    // generateAgentBookingLink — throws when no cal_username
    await testAsync('generateAgentBookingLink throws when no cal_username configured', async () => {
        const savedCal = process.env.CAL_USERNAME;
        delete process.env.CAL_USERNAME;
        const mockDb = {
            from: () => ({
                select: () => ({
                    eq: () => ({
                        single: async () => ({
                            data: { id: 'a1', name: 'Test', email: 'test@test.com', cal_username: null, metadata: {} },
                            error: null
                        })
                    })
                })
            })
        };
        const svc = new BookingLinkService({ db: mockDb });
        try {
            await svc.generateAgentBookingLink('a1', 'discovery-call');
            assert.fail('Should have thrown');
        } catch (err) {
            assert(err.message.includes('No Cal.com username'), `Unexpected error: ${err.message}`);
        } finally {
            if (savedCal !== undefined) process.env.CAL_USERNAME = savedCal;
        }
    });

    // getQuickBookingLink — scenario shorthand mapping
    await testAsync('getQuickBookingLink maps scenario shorthand to event type slug', async () => {
        let capturedSlug = null;
        const mockDb = {
            from: (table) => ({
                select: () => ({
                    eq: () => ({
                        single: async () => ({ data: null, error: new Error('not found') })
                    })
                })
            })
        };
        const svc = new BookingLinkService({ db: mockDb });
        // Wrap generateAgentBookingLink to capture slug
        const origGenerate = svc.generateAgentBookingLink.bind(svc);
        svc.generateAgentBookingLink = async (agentId, slug) => { capturedSlug = slug; throw new Error('stop'); };

        try { await svc.getQuickBookingLink('a1', 'discovery'); } catch (_) {}
        assert.strictEqual(capturedSlug, 'discovery-call', `Expected 'discovery-call', got '${capturedSlug}'`);

        try { await svc.getQuickBookingLink('a1', 'tour'); } catch (_) {}
        assert.strictEqual(capturedSlug, 'property-tour');

        // Unknown scenario falls through as-is
        try { await svc.getQuickBookingLink('a1', 'custom-slug'); } catch (_) {}
        assert.strictEqual(capturedSlug, 'custom-slug');
    });

    // getAgentBookingLinks — returns empty list when no configs
    await testAsync('getAgentBookingLinks returns empty list when no configs', async () => {
        const mockDb = {
            from: () => ({
                select: () => ({
                    eq: () => ({
                        eq: () => ({
                            order: async () => ({ data: [], error: null })
                        })
                    })
                })
            })
        };
        const svc = new BookingLinkService({ db: mockDb });
        const result = await svc.getAgentBookingLinks('a1');
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.count, 0);
        assert.deepStrictEqual(result.links, []);
    });
}

// --- 5. Backward-compat shim ---
console.log('\n5. Backward-compat shim');
const shim = require(SHIM_PATH);

EXPECTED_METHODS.forEach(method => {
    test(`shim exports method: ${method}`, () => {
        assert.strictEqual(typeof shim[method], 'function', `Shim missing: ${method}`);
    });
});
test('shim exports SCENARIOS constant', () => {
    assert(shim.SCENARIOS, 'Shim missing SCENARIOS');
    assert.strictEqual(shim.SCENARIOS.DISCOVERY, 'discovery-call');
});
test('shim methods are bound (no this-context loss)', () => {
    // Destructure and call — would throw "Cannot read property of undefined" if unbound
    const { getQuickBookingLink } = shim;
    assert.strictEqual(typeof getQuickBookingLink, 'function');
    // Just calling it without args should throw a meaningful error (not a binding error)
    // We just need it not to throw "Cannot read properties of undefined (reading '_getDb')"
    getQuickBookingLink('a1', 'discovery').catch(err => {
        assert(!err.message.includes("Cannot read properties of undefined"),
            `Binding error: ${err.message}`);
    });
});

// Run async tests then report
runBehaviorTests().then(() => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));
    if (failed > 0) {
        console.log('\n❌ Some tests failed.');
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed!');
    }
});
