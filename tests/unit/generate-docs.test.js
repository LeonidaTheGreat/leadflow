'use strict';

/**
 * Unit test: generate-api-docs.js and generate-services-docs.js
 * Verifies that generation scripts produce valid output files
 * with expected content (service class names, API routes).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PROJECT_DIR = path.join(__dirname, '../..');

let passed = 0;
let failed = 0;

async function check(name, fn) {
    try {
        await fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`  ❌ ${name}: ${error.message}`);
        failed++;
    }
}

async function run() {
    console.log('\n🧪 Documentation generation script tests\n');

    const { generateApiDocs } = require('../../scripts/generate-api-docs');
    const { generateServicesDocs } = require('../../scripts/generate-services-docs');

    // Run both generators
    await check('generate-api-docs.js runs without error', async () => {
        await generateApiDocs();
    });

    await check('generate-services-docs.js runs without error', async () => {
        await generateServicesDocs();
    });

    // Check API.md
    await check('API.md is generated', async () => {
        const apiMd = path.join(PROJECT_DIR, 'API.md');
        assert.ok(fs.existsSync(apiMd), 'API.md must exist');
    });

    await check('API.md contains auto-generated header', async () => {
        const content = fs.readFileSync(path.join(PROJECT_DIR, 'API.md'), 'utf8');
        assert.ok(content.includes('AUTO-GENERATED'), 'Must have AUTO-GENERATED header');
    });

    await check('API.md contains at least 1 route entry', async () => {
        const content = fs.readFileSync(path.join(PROJECT_DIR, 'API.md'), 'utf8');
        assert.ok(content.includes('| **GET**') || content.includes('| **POST**'), 'Must contain HTTP method entries');
    });

    await check('API.md includes billing route', async () => {
        const content = fs.readFileSync(path.join(PROJECT_DIR, 'API.md'), 'utf8');
        assert.ok(content.includes('billing'), 'Must include billing routes');
    });

    // Check SERVICES.md
    await check('SERVICES.md is generated', async () => {
        const servicesMd = path.join(PROJECT_DIR, 'SERVICES.md');
        assert.ok(fs.existsSync(servicesMd), 'SERVICES.md must exist');
    });

    await check('SERVICES.md contains auto-generated header', async () => {
        const content = fs.readFileSync(path.join(PROJECT_DIR, 'SERVICES.md'), 'utf8');
        assert.ok(content.includes('AUTO-GENERATED'), 'Must have AUTO-GENERATED header');
    });

    await check('SERVICES.md contains CalcomWebhookHandler', async () => {
        const content = fs.readFileSync(path.join(PROJECT_DIR, 'SERVICES.md'), 'utf8');
        assert.ok(content.includes('CalcomWebhookHandler'), 'Must include CalcomWebhookHandler class');
    });

    await check('SERVICES.md contains BillingService or billingService', async () => {
        const content = fs.readFileSync(path.join(PROJECT_DIR, 'SERVICES.md'), 'utf8');
        assert.ok(
            content.includes('BillingService') || content.includes('billingService'),
            'Must include a billing service entry'
        );
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
