/**
 * E2E test: WebhookService consolidation (task 4454eebd)
 * Verifies:
 * 1. Old files are gone (no stale imports)
 * 2. WebhookService class loads and exposes correct API
 * 3. processWebhookEvent handles known and unknown event types
 * 4. handleIncomingWebhook validates signatures in production mode
 * 5. No stale references to webhook-handler.js or webhook-processor.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n🧪 WebhookService Consolidation E2E Test\n');

// ── 1. File system checks ──────────────────────────────────────────────────
console.log('1. File existence');

test('Old webhook-handler.js is deleted', () => {
  const p = path.join(__dirname, '../lib/webhook-handler.js');
  assert(!fs.existsSync(p), `Expected lib/webhook-handler.js to be deleted, but it still exists`);
});

test('Old webhook-processor.js is deleted', () => {
  const p = path.join(__dirname, '../lib/webhook-processor.js');
  assert(!fs.existsSync(p), `Expected lib/webhook-processor.js to be deleted, but it still exists`);
});

test('New WebhookService.js exists', () => {
  const p = path.join(__dirname, '../lib/services/WebhookService.js');
  assert(fs.existsSync(p), `Expected lib/services/WebhookService.js to exist`);
});

// ── 2. No stale references ─────────────────────────────────────────────────
console.log('\n2. Stale import check');

function grepForPattern(pattern, dirs) {
  const { execSync } = require('child_process');
  try {
    const result = execSync(
      `grep -r '${pattern}' ${dirs.join(' ')} --include='*.js' --include='*.ts' 2>/dev/null || true`
    ).toString().trim();
    return result.split('\n').filter(l =>
      l &&
      !l.includes('.test.') &&
      !l.includes('/tests/') &&
      // Exclude comment lines (e.g. "Consolidates webhook-handler.js")
      !l.includes('* Consolidates') &&
      !l.includes('// Consolidates')
    );
  } catch {
    return [];
  }
}

test('No stale require(webhook-handler) outside tests', () => {
  const hits = grepForPattern('webhook-handler', ['routes/', 'lib/', 'server.js', 'stripe-subscriptions/']);
  assert(hits.length === 0, `Stale references found:\n${hits.join('\n')}`);
});

test('No stale require(webhook-processor) outside tests', () => {
  const hits = grepForPattern('webhook-processor', ['routes/', 'lib/', 'server.js', 'stripe-subscriptions/']);
  assert(hits.length === 0, `Stale references found:\n${hits.join('\n')}`);
});

test('WebhookService is imported by stripe-subscriptions/index.js', () => {
  const content = fs.readFileSync(path.join(__dirname, '../stripe-subscriptions/index.js'), 'utf8');
  assert(content.includes('WebhookService'), 'WebhookService not found in stripe-subscriptions/index.js');
});

// ── 3. Class API ──────────────────────────────────────────────────────────
console.log('\n3. Class API');

// WebhookService requires stripe (in dashboard/node_modules). Load it from there.
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === 'stripe') {
    return origResolve.call(this, request, { id: '/Users/clawdbot/projects/leadflow/product/lead-response/dashboard/lib/fake.js', filename: '/Users/clawdbot/projects/leadflow/product/lead-response/dashboard/lib/fake.js', paths: Module._nodeModulePaths('/Users/clawdbot/projects/leadflow/product/lead-response/dashboard/lib') }, isMain, options);
  }
  return origResolve.call(this, request, parent, isMain, options);
};

const WebhookServiceModule = require('../lib/services/WebhookService');
Module._resolveFilename = origResolve;

test('Module exports WebhookService class', () => {
  assert(WebhookServiceModule.WebhookService, 'Expected WebhookService class export');
});

test('Module exports singleton instance with processWebhookEvent', () => {
  assert(typeof WebhookServiceModule.processWebhookEvent === 'function',
    'Expected processWebhookEvent method on singleton');
});

test('Module exports singleton instance with handleIncomingWebhook', () => {
  assert(typeof WebhookServiceModule.handleIncomingWebhook === 'function',
    'Expected handleIncomingWebhook method on singleton');
});

test('WebhookService class is instantiable with injected deps', () => {
  const { WebhookService } = WebhookServiceModule;
  const svc = new WebhookService({ stripe: null, db: null });
  assert(svc instanceof WebhookService);
});

// ── 4. Functional: processWebhookEvent ───────────────────────────────────
console.log('\n4. processWebhookEvent behavior');

(async () => {
  const { WebhookService } = WebhookServiceModule;

  await asyncTest('Unknown event type returns processed=false (not throws)', async () => {
    const svc = new WebhookService({ stripe: null, db: null });
    const result = await svc.processWebhookEvent({ type: 'unknown.event', id: 'evt_test', data: { object: {} } });
    assert(!result.processed, `Expected processed=false for unknown event, got ${JSON.stringify(result)}`);
    assert(result.success, `Expected success=true`);
  });

  await asyncTest('checkout.session.completed is a registered handler', async () => {
    const svc = new WebhookService({ stripe: null, db: null });
    assert(typeof svc.EVENT_HANDLERS['checkout.session.completed'] === 'function',
      'Expected checkout.session.completed handler');
  });

  await asyncTest('customer.subscription.created is a registered handler', async () => {
    const svc = new WebhookService({ stripe: null, db: null });
    assert(typeof svc.EVENT_HANDLERS['customer.subscription.created'] === 'function',
      'Expected customer.subscription.created handler');
  });

  await asyncTest('invoice.payment_succeeded is a registered handler', async () => {
    const svc = new WebhookService({ stripe: null, db: null });
    assert(typeof svc.EVENT_HANDLERS['invoice.payment_succeeded'] === 'function',
      'Expected invoice.payment_succeeded handler');
  });

  // ── 5. handleIncomingWebhook: missing sig in production ──────────────────
  console.log('\n5. handleIncomingWebhook guard');

  await asyncTest('Returns 400 when signature missing in production', async () => {
    const savedEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const svc = new WebhookService({ stripe: null, db: null });
      let statusCode = null;
      const res = {
        status: (code) => { statusCode = code; return { send: () => {} }; },
        json: () => {}
      };
      const req = { headers: {}, body: {} };
      await svc.handleIncomingWebhook(req, res);
      assert(statusCode === 400, `Expected 400, got ${statusCode}`);
    } finally {
      process.env.NODE_ENV = savedEnv;
    }
  });

  // ── Report ────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Passed: ${passed}  ❌ Failed: ${failed}`);
  console.log(`📈 Pass rate: ${Math.round(passed / (passed + failed) * 100)}%`);
  console.log(`${'─'.repeat(50)}\n`);

  if (failed > 0) process.exit(1);
})();
