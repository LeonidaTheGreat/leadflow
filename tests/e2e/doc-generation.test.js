#!/usr/bin/env node
'use strict';

/**
 * E2E test: Auto-documentation generation
 * Verifies that generate-api-docs.js and generate-services-docs.js
 * produce valid output files with expected content.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_DIR = path.join(__dirname, '../..');

let passed = 0;
let failed = 0;

async function check(name, fn) {
    try {
        await fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (err) {
        console.log(`  ❌ ${name}: ${err.message}`);
        failed++;
    }
}

async function run() {
    console.log('\n🧪 Auto-documentation generation E2E tests\n');

    // Use temp dir to avoid overwriting production files
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leadflow-doc-gen-'));
    const tmpApiFile = path.join(tmpDir, 'API.md');
    const tmpServicesFile = path.join(tmpDir, 'SERVICES.md');

    // Patch OUTPUT_FILE by running scripts and redirecting to tmp
    // We test the scripts can run without error and produce correct structure
    // by running them against production paths (they just overwrite the existing MD files)

    // Test 1: generate-api-docs.js runs without error
    await check('generate-api-docs.js executes without error', async () => {
        const { generateApiDocs } = require('../../scripts/generate-api-docs');
        await generateApiDocs();
    });

    // Test 2: API.md exists and has auto-gen header
    await check('API.md has auto-generated header', () => {
        const content = fs.readFileSync(path.join(PROJECT_DIR, 'API.md'), 'utf8');
        assert(content.includes('AUTO-GENERATED'), 'Expected AUTO-GENERATED header in API.md');
        assert(content.includes('DO NOT EDIT'), 'Expected DO NOT EDIT warning in API.md');
    });

    // Test 3: API.md contains known endpoints
    await check('API.md contains billing routes', () => {
        const content = fs.readFileSync(path.join(PROJECT_DIR, 'API.md'), 'utf8');
        assert(content.includes('/create-customer') || content.includes('create-customer'), 'Expected billing create-customer endpoint in API.md');
        assert(content.includes('billingService'), 'Expected billingService reference in API.md');
    });

    // Test 4: API.md contains FUB webhook route
    await check('API.md contains FUB webhook route', () => {
        const content = fs.readFileSync(path.join(PROJECT_DIR, 'API.md'), 'utf8');
        assert(content.includes('fub'), 'Expected FUB webhook route in API.md');
    });

    // Test 5: generate-services-docs.js runs without error
    await check('generate-services-docs.js executes without error', async () => {
        const { generateServicesDocs } = require('../../scripts/generate-services-docs');
        await generateServicesDocs();
    });

    // Test 6: SERVICES.md exists and has auto-gen header
    await check('SERVICES.md has auto-generated header', () => {
        const content = fs.readFileSync(path.join(PROJECT_DIR, 'SERVICES.md'), 'utf8');
        assert(content.includes('AUTO-GENERATED'), 'Expected AUTO-GENERATED header in SERVICES.md');
        assert(content.includes('lib/services/'), 'Expected lib/services/ reference in SERVICES.md');
    });

    // Test 7: SERVICES.md contains known service classes
    await check('SERVICES.md contains CalcomWebhookHandler class', () => {
        const content = fs.readFileSync(path.join(PROJECT_DIR, 'SERVICES.md'), 'utf8');
        assert(content.includes('CalcomWebhookHandler'), 'Expected CalcomWebhookHandler in SERVICES.md');
    });

    // Test 8: SERVICES.md contains BillingService with method count > 0
    await check('SERVICES.md contains BillingService with methods', () => {
        const content = fs.readFileSync(path.join(PROJECT_DIR, 'SERVICES.md'), 'utf8');
        assert(content.includes('BillingService'), 'Expected BillingService in SERVICES.md');
        assert(content.includes('initializeBilling'), 'Expected initializeBilling method in BillingService section');
    });

    // Test 9: SERVICES.md contains BookingLinkService methods (previously missing in old version)
    await check('SERVICES.md contains BookingLinkService public methods', () => {
        const content = fs.readFileSync(path.join(PROJECT_DIR, 'SERVICES.md'), 'utf8');
        assert(content.includes('generateAgentBookingLink'), 'Expected generateAgentBookingLink in BookingLinkService section');
    });

    // Test 10: API.md contains admin endpoints with auth info
    await check('API.md documents admin endpoint auth', () => {
        const content = fs.readFileSync(path.join(PROJECT_DIR, 'API.md'), 'utf8');
        assert(content.includes('API key (admin)'), 'Expected admin auth annotation in API.md');
    });

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
