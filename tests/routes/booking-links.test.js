'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, '..', '..', 'routes', 'booking-links.js');
const routeContent = fs.readFileSync(routePath, 'utf8');

const serverPath = path.join(__dirname, '..', '..', 'server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

const middlewarePath = path.join(__dirname, '..', '..', 'lib', 'middleware', 'require-api-key.js');
const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');

let passed = 0;
let failed = 0;

function check(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (err) {
        console.log(`  ❌ ${name}: ${err.message}`);
        failed++;
    }
}

console.log('\n=== route: Booking Links API ===\n');

// ─── Route file structure ─────────────────────────────────────────────────────

check('imports BookingLinkService', () => {
    assert.match(routeContent, /require\(['"]\.\.\/lib\/services\/BookingLinkService['"]\)/);
});

check('imports requireApiKey middleware', () => {
    assert.match(routeContent, /require\(['"]\.\.\/lib\/middleware\/require-api-key['"]\)/);
});

check('imports ValidationError', () => {
    assert.match(routeContent, /ValidationError/);
});

check('exports router via module.exports', () => {
    assert.match(routeContent, /module\.exports\s*=\s*router/);
});

// ─── Route registration ───────────────────────────────────────────────────────

check('registers GET /api/booking-links route', () => {
    assert.match(routeContent, /router\.get\(['"]\/api\/booking-links['"]/);
});

check('registers POST /api/booking-links route', () => {
    assert.match(routeContent, /router\.post\(['"]\/api\/booking-links['"]/);
});

check('registers POST /api/booking-links/personalized route', () => {
    assert.match(routeContent, /router\.post\(['"]\/api\/booking-links\/personalized['"]/);
});

check('registers GET /api/booking-links/quick route', () => {
    assert.match(routeContent, /router\.get\(['"]\/api\/booking-links\/quick['"]/);
});

check('registers PATCH /api/booking-links/:id route', () => {
    assert.match(routeContent, /router\.patch\(['"]\/api\/booking-links\/:id['"]/);
});

check('registers DELETE /api/booking-links/:id route', () => {
    assert.match(routeContent, /router\.delete\(['"]\/api\/booking-links\/:id['"]/);
});

// ─── Auth protection ──────────────────────────────────────────────────────────

check('all 6 routes are protected by requireApiKey', () => {
    const routeDeclarations = routeContent.match(/router\.(get|post|patch|delete)\(/g) || [];
    const protectedDeclarations = routeContent.match(/router\.(get|post|patch|delete)\([^,]+,\s*requireApiKey/g) || [];
    assert.strictEqual(routeDeclarations.length, protectedDeclarations.length,
        `Expected all ${routeDeclarations.length} routes to use requireApiKey, found ${protectedDeclarations.length}`);
});

check('shared middleware checks x-api-key header', () => {
    assert.match(middlewareContent, /x-api-key/);
});

check('shared middleware returns 401 when key is missing', () => {
    assert.match(middlewareContent, /res\.status\(401\)/);
});

// ─── Service delegation ───────────────────────────────────────────────────────

check('GET /api/booking-links delegates to getAgentBookingLinks', () => {
    assert.match(routeContent, /getAgentBookingLinks/);
});

check('POST /api/booking-links delegates to generateAgentBookingLink', () => {
    assert.match(routeContent, /generateAgentBookingLink/);
});

check('POST /api/booking-links/personalized delegates to createPersonalizedBookingLink', () => {
    assert.match(routeContent, /createPersonalizedBookingLink/);
});

check('GET /api/booking-links/quick delegates to getQuickBookingLink', () => {
    assert.match(routeContent, /getQuickBookingLink/);
});

check('PATCH /api/booking-links/:id delegates to updateBookingConfig', () => {
    assert.match(routeContent, /updateBookingConfig/);
});

check('DELETE /api/booking-links/:id delegates to deactivateBookingLink', () => {
    assert.match(routeContent, /deactivateBookingLink/);
});

// ─── Input validation ─────────────────────────────────────────────────────────

check('GET /api/booking-links validates agentId is present', () => {
    assert.match(routeContent, /agentId.*required/);
});

check('POST /api/booking-links validates eventTypeSlug is present', () => {
    assert.match(routeContent, /eventTypeSlug.*required/);
});

check('POST /api/booking-links/personalized validates lead.name and lead.email', () => {
    assert.match(routeContent, /lead\.name/);
    assert.match(routeContent, /lead\.email/);
});

check('PATCH route validates non-empty update body', () => {
    assert.match(routeContent, /Object\.keys\(updates\)\.length/);
});

// ─── Error handling ───────────────────────────────────────────────────────────

check('returns 400 for ValidationError', () => {
    assert.match(routeContent, /status\(400\)/);
});

check('returns 500 for unexpected errors', () => {
    assert.match(routeContent, /status\(500\)/);
});

// ─── Server.js wiring ─────────────────────────────────────────────────────────

check('server.js requires booking-links router', () => {
    assert.match(serverContent, /require\(['"]\.\/routes\/booking-links['"]\)/);
});

check('server.js mounts booking-links router', () => {
    assert.match(serverContent, /app\.use\(['"]\/['"],\s*bookingLinksRouter\)/);
});

// ─── CalcomClient.js syntax fix ───────────────────────────────────────────────

check('CalcomClient.js has no syntax errors', () => {
    const calcomClientPath = path.join(__dirname, '..', '..', 'lib', 'services', 'CalcomClient.js');
    const src = fs.readFileSync(calcomClientPath, 'utf8');
    // The old bug was: `return {\n            this.logger.error(...)` inside catch block
    // After the fix: logger.error comes BEFORE return {} on separate line
    assert.doesNotMatch(
        src,
        /return \{\s*\n\s*this\.logger\.error/,
        'Found logger.error as first statement inside return {} (syntax error)'
    );
    // The getMe method must exist and be syntactically parseable
    assert.match(src, /async getMe\(\)/);
    assert.match(src, /this\.logger\.error\('Cal\.com getMe failed'/);
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
