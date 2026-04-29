/**
 * Spec
 * What: tests/unit/lib-index-logger.test.js — tests lib/index.js hub for logger exports
 *   Verifies lib/index.js correctly re-exports logger and requestLogger from ./logger.
 *   Tests that re-exported instances are identical to direct imports (same object references).
 *   Tests that re-exported logger methods are functional (produce structured JSON output).
 *   Tests that re-exported requestLogger middleware is functional.
 *   Also spot-checks that error-class and types exports are present (hub wiring).
 * Verify: node tests/unit/lib-index-logger.test.js → exit 0, 100% pass rate
 * Boundaries: lib/index.js, lib/logger.js, lib/errors.js, lib/types are read-only. No other files touched.
 */

'use strict';

const assert = require('assert');

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        passed++;
        results.push({ name, passed: true });
        console.log(`  ✅ ${name}`);
      }).catch((err) => {
        failed++;
        results.push({ name, passed: false, error: err.message });
        console.log(`  ❌ ${name}: ${err.message}`);
      });
    }
    passed++;
    results.push({ name, passed: true });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    results.push({ name, passed: false, error: err.message });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
  return Promise.resolve();
}

function withConsoleSpy(method, fn) {
  const lines = [];
  const original = console[method];
  console[method] = (...args) => lines.push(args[0]);
  let result;
  try {
    result = fn();
  } finally {
    console[method] = original;
  }
  return { result, lines };
}

async function suppressConsole(fn) {
  const originals = {};
  for (const m of ['debug', 'info', 'warn', 'error']) {
    originals[m] = console[m];
    console[m] = () => {};
  }
  try {
    return await fn();
  } finally {
    for (const m of Object.keys(originals)) console[m] = originals[m];
  }
}

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Unit Tests: lib/index.js hub — logger exports      ║');
  console.log('║  Task: 57d23baa-d3f7-4c69-8782-20cd3e787c28         ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const hub = require('../../lib/index');
  const directLogger = require('../../lib/logger');

  // ── Re-export identity ───────────────────────────────────────────────────────

  await test('hub exports logger as an object', () => {
    assert.strictEqual(typeof hub.logger, 'object');
    assert.notStrictEqual(hub.logger, null);
  });

  await test('hub exports requestLogger as a function', () => {
    assert.strictEqual(typeof hub.requestLogger, 'function');
  });

  await test('hub.logger is the same instance as require("./logger").logger', () => {
    assert.strictEqual(hub.logger, directLogger.logger);
  });

  await test('hub.requestLogger is the same instance as require("./logger").requestLogger', () => {
    assert.strictEqual(hub.requestLogger, directLogger.requestLogger);
  });

  // ── hub.logger method shape ──────────────────────────────────────────────────

  await test('hub.logger exposes debug method', () => {
    assert.strictEqual(typeof hub.logger.debug, 'function');
  });

  await test('hub.logger exposes info method', () => {
    assert.strictEqual(typeof hub.logger.info, 'function');
  });

  await test('hub.logger exposes warn method', () => {
    assert.strictEqual(typeof hub.logger.warn, 'function');
  });

  await test('hub.logger exposes error method', () => {
    assert.strictEqual(typeof hub.logger.error, 'function');
  });

  await test('hub.logger exposes fatal method', () => {
    assert.strictEqual(typeof hub.logger.fatal, 'function');
  });

  await test('hub.logger exposes child method', () => {
    assert.strictEqual(typeof hub.logger.child, 'function');
  });

  await test('hub.logger exposes withLogging method', () => {
    assert.strictEqual(typeof hub.logger.withLogging, 'function');
  });

  // ── hub.logger functional: info ──────────────────────────────────────────────

  await test('hub.logger.info writes structured JSON to console.info', () => {
    const { lines } = withConsoleSpy('info', () => {
      hub.logger.info('hub test message', 'HubCtx', { key: 'val' });
    });
    assert.strictEqual(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.level, 'info');
    assert.strictEqual(entry.message, 'hub test message');
    assert.strictEqual(entry.context, 'HubCtx');
    assert.strictEqual(entry.service, 'leadflow-api');
    assert.ok(entry.timestamp, 'missing timestamp');
    assert.deepStrictEqual(entry.metadata, { key: 'val' });
  });

  await test('hub.logger.info entry has no error field when no error passed', () => {
    const { lines } = withConsoleSpy('info', () => {
      hub.logger.info('no error', 'HubCtx');
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.error, undefined);
  });

  // ── hub.logger functional: warn ──────────────────────────────────────────────

  await test('hub.logger.warn writes JSON to console.warn with error field', () => {
    const err = new Error('hub warn error');
    err.code = 'EHUB';
    const { lines } = withConsoleSpy('warn', () => {
      hub.logger.warn('hub warning', 'HubWarn', {}, err);
    });
    assert.strictEqual(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.level, 'warn');
    assert.strictEqual(entry.error.message, 'hub warn error');
    assert.strictEqual(entry.error.code, 'EHUB');
  });

  // ── hub.logger functional: error ────────────────────────────────────────────

  await test('hub.logger.error writes JSON to console.error with error field', () => {
    const err = new Error('hub error');
    const { lines } = withConsoleSpy('error', () => {
      hub.logger.error('hub error message', err, 'HubErr', { id: 1 });
    });
    assert.strictEqual(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.level, 'error');
    assert.strictEqual(entry.error.name, 'Error');
    assert.strictEqual(entry.error.message, 'hub error');
    assert.strictEqual(entry.context, 'HubErr');
  });

  // ── hub.logger functional: fatal ────────────────────────────────────────────

  await test('hub.logger.fatal writes to console.error (fatal uses error channel)', () => {
    const { lines } = withConsoleSpy('error', () => {
      hub.logger.fatal('hub fatal', new Error('fatal'), 'HubFatal');
    });
    assert.strictEqual(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.level, 'fatal');
    assert.strictEqual(entry.message, 'hub fatal');
  });

  await test('hub.logger.fatal always logs regardless of level filter', () => {
    const { lines } = withConsoleSpy('error', () => {
      hub.logger.fatal('unconditional fatal');
    });
    assert.strictEqual(lines.length, 1);
  });

  // ── hub.logger functional: sensitive data redaction ─────────────────────────

  await test('hub.logger.info redacts token field in metadata', () => {
    const { lines } = withConsoleSpy('info', () => {
      hub.logger.info('auth event', 'HubAuth', { token: 'secret-abc', userId: 7 });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.token, '[REDACTED]');
    assert.strictEqual(entry.metadata.userId, 7);
  });

  await test('hub.logger.info redacts password field in metadata', () => {
    const { lines } = withConsoleSpy('info', () => {
      hub.logger.info('login', 'HubAuth', { password: 'secret', email: 'a@b.com' });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.password, '[REDACTED]');
    assert.strictEqual(entry.metadata.email, 'a@b.com');
  });

  // ── hub.logger.child ─────────────────────────────────────────────────────────

  await test('hub.logger.child returns child logger with prefilled context', () => {
    const child = hub.logger.child('HubChild');
    const { lines } = withConsoleSpy('info', () => {
      child.info('child via hub', { x: 1 });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.context, 'HubChild');
    assert.strictEqual(entry.message, 'child via hub');
  });

  // ── hub.logger.withLogging ───────────────────────────────────────────────────

  await test('hub.logger.withLogging returns operation result', async () => {
    const result = await suppressConsole(() =>
      hub.logger.withLogging(async () => 'hub-result', 'hubOp', 'HubCtx')
    );
    assert.strictEqual(result, 'hub-result');
  });

  await test('hub.logger.withLogging re-throws error from operation', async () => {
    const err = new Error('hub op failed');
    await assert.rejects(
      () => suppressConsole(() =>
        hub.logger.withLogging(async () => { throw err; }, 'hubFail', 'HubCtx')
      ),
      (e) => e === err
    );
  });

  // ── hub.requestLogger functional ────────────────────────────────────────────

  await test('hub.requestLogger calls next()', () => {
    let nextCalled = false;
    const req = {
      headers: { 'x-request-id': 'hub-req-1' },
      method: 'GET',
      url: '/hub-test',
      ip: '127.0.0.1',
    };
    const res = {
      setHeader() {},
      on() {},
      statusCode: 200,
    };
    suppressConsole(() => hub.requestLogger(req, res, () => { nextCalled = true; }));
    assert.strictEqual(nextCalled, true);
  });

  await test('hub.requestLogger attaches requestId to req', () => {
    const req = {
      headers: { 'x-request-id': 'hub-req-attach' },
      method: 'GET',
      url: '/hub-attach',
      ip: '127.0.0.1',
    };
    const res = {
      setHeader() {},
      on() {},
      statusCode: 200,
    };
    suppressConsole(() => hub.requestLogger(req, res, () => {}));
    assert.strictEqual(req.requestId, 'hub-req-attach');
  });

  await test('hub.requestLogger sets X-Request-ID response header', () => {
    const req = {
      headers: { 'x-request-id': 'hub-req-header' },
      method: 'GET',
      url: '/hub-header',
      ip: '127.0.0.1',
    };
    const headers = {};
    const res = {
      setHeader(name, val) { headers[name] = val; },
      on() {},
      statusCode: 200,
    };
    suppressConsole(() => hub.requestLogger(req, res, () => {}));
    assert.strictEqual(headers['X-Request-ID'], 'hub-req-header');
  });

  // ── hub error class exports ──────────────────────────────────────────────────

  await test('hub exports LeadFlowError', () => {
    assert.strictEqual(typeof hub.LeadFlowError, 'function');
  });

  await test('hub exports ValidationError', () => {
    assert.strictEqual(typeof hub.ValidationError, 'function');
  });

  await test('hub exports AuthenticationError', () => {
    assert.strictEqual(typeof hub.AuthenticationError, 'function');
  });

  await test('hub exports AuthorizationError', () => {
    assert.strictEqual(typeof hub.AuthorizationError, 'function');
  });

  await test('hub exports NotFoundError', () => {
    assert.strictEqual(typeof hub.NotFoundError, 'function');
  });

  await test('hub exports ConflictError', () => {
    assert.strictEqual(typeof hub.ConflictError, 'function');
  });

  await test('hub exports RateLimitError', () => {
    assert.strictEqual(typeof hub.RateLimitError, 'function');
  });

  await test('hub exports ExternalServiceError', () => {
    assert.strictEqual(typeof hub.ExternalServiceError, 'function');
  });

  await test('hub exports DatabaseError', () => {
    assert.strictEqual(typeof hub.DatabaseError, 'function');
  });

  await test('hub exports ConfigurationError', () => {
    assert.strictEqual(typeof hub.ConfigurationError, 'function');
  });

  // ── hub middleware exports ───────────────────────────────────────────────────

  await test('hub exports errorHandler middleware', () => {
    assert.strictEqual(typeof hub.errorHandler, 'function');
  });

  await test('hub exports asyncHandler middleware', () => {
    assert.strictEqual(typeof hub.asyncHandler, 'function');
  });

  await test('hub exports validateRequest middleware', () => {
    assert.strictEqual(typeof hub.validateRequest, 'function');
  });

  await test('hub exports requireAuth middleware', () => {
    assert.strictEqual(typeof hub.requireAuth, 'function');
  });

  await test('hub exports requireRole middleware', () => {
    assert.strictEqual(typeof hub.requireRole, 'function');
  });

  // ── hub types export ────────────────────────────────────────────────────────

  await test('hub exports types object', () => {
    assert.ok(hub.types !== null && hub.types !== undefined);
    assert.strictEqual(typeof hub.types, 'object');
  });

  // ── Summary ──────────────────────────────────────────────────────────────────

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                          ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  const rate = (passed + failed) > 0 ? passed / (passed + failed) : 1;
  console.log(`  📈 Pass rate: ${(rate * 100).toFixed(0)}%`);
  console.log('');

  return { passed, failed, total: passed + failed, passRate: rate, results };
}

module.exports = { runTests };

if (require.main === module) {
  runTests()
    .then((result) => {
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}
