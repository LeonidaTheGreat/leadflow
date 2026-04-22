/**
 * Spec
 * What: tests/unit/logger.test.js — unit tests for lib/logger.js
 *   Targets: logger.{debug,info,warn,error,fatal,child,withLogging} and requestLogger middleware
 *   Files touched: tests/unit/logger.test.js (create only)
 * Verify: node tests/unit/logger.test.js → exit 0, 100% pass rate
 * Boundaries: lib/logger.js is read-only. No other files touched.
 */

'use strict';

const assert = require('assert');
const { logger, requestLogger } = require('../../lib/logger');

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

// Wraps a sync body, returns { result, lines }
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

async function withConsoleSpyAsync(method, fn) {
  const lines = [];
  const original = console[method];
  console[method] = (...args) => lines.push(args[0]);
  let result;
  try {
    result = await fn();
  } finally {
    console[method] = original;
  }
  return { result, lines };
}

// Suppress all console output from logger during a test (sync and async)
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
  console.log('║  Unit Tests: logger                                  ║');
  console.log('║  Task: 61c092e5-d8da-4e84-bbf1-9cc3027611bc         ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── logger.info ─────────────────────────────────────────────────────────────

  await test('logger.info writes JSON to console.info', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('hello world', 'TestCtx', { foo: 'bar' });
    });
    assert.strictEqual(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.level, 'info');
    assert.strictEqual(entry.message, 'hello world');
    assert.strictEqual(entry.context, 'TestCtx');
    assert.strictEqual(entry.service, 'leadflow-api');
    assert.ok(entry.timestamp);
    assert.deepStrictEqual(entry.metadata, { foo: 'bar' });
  });

  await test('logger.info entry has no error field when no error passed', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('no error', 'TestCtx');
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.error, undefined);
  });

  // ── logger.warn ──────────────────────────────────────────────────────────────

  await test('logger.warn writes JSON to console.warn', () => {
    const { lines } = withConsoleSpy('warn', () => {
      logger.warn('something off', 'WarnCtx', { detail: 1 });
    });
    assert.strictEqual(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.level, 'warn');
    assert.strictEqual(entry.message, 'something off');
  });

  await test('logger.warn includes error fields when error provided', () => {
    const err = new Error('warn error');
    err.code = 'EWARN';
    const { lines } = withConsoleSpy('warn', () => {
      logger.warn('with error', 'WarnCtx', {}, err);
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.error.name, 'Error');
    assert.strictEqual(entry.error.message, 'warn error');
    assert.strictEqual(entry.error.code, 'EWARN');
  });

  // ── logger.error ─────────────────────────────────────────────────────────────

  await test('logger.error writes JSON to console.error', () => {
    const err = new Error('boom');
    const { lines } = withConsoleSpy('error', () => {
      logger.error('something failed', err, 'ErrCtx', { id: 42 });
    });
    assert.strictEqual(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.level, 'error');
    assert.strictEqual(entry.message, 'something failed');
    assert.strictEqual(entry.error.name, 'Error');
    assert.strictEqual(entry.error.message, 'boom');
    assert.strictEqual(entry.context, 'ErrCtx');
  });

  await test('logger.error handles error with no code', () => {
    const err = new Error('no code');
    const { lines } = withConsoleSpy('error', () => {
      logger.error('no code error', err, 'Ctx');
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.error.code, undefined);
  });

  // ── logger.fatal ─────────────────────────────────────────────────────────────

  await test('logger.fatal writes JSON to console.error (fatal uses error channel)', () => {
    const { lines } = withConsoleSpy('error', () => {
      logger.fatal('system crash', new Error('fatal'), 'FatalCtx');
    });
    assert.strictEqual(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.level, 'fatal');
    assert.strictEqual(entry.message, 'system crash');
  });

  await test('logger.fatal always logs regardless of level filter', () => {
    // fatal bypasses shouldLog check
    const { lines } = withConsoleSpy('error', () => {
      logger.fatal('always logs');
    });
    assert.strictEqual(lines.length, 1);
  });

  // ── logger.debug ─────────────────────────────────────────────────────────────

  await test('logger.debug is filtered when minLevel is info (default)', () => {
    // Default LOG_LEVEL is 'info', so debug should not produce output
    const { lines } = withConsoleSpy('debug', () => {
      logger.debug('this is debug', 'Ctx', { x: 1 });
    });
    // Filtered — no console.debug call
    assert.strictEqual(lines.length, 0);
  });

  // ── Sensitive data redaction ─────────────────────────────────────────────────

  await test('logger redacts password field in metadata', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('user action', 'Auth', { password: 'supersecret', username: 'alice' });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.password, '[REDACTED]');
    assert.strictEqual(entry.metadata.username, 'alice');
  });

  await test('logger redacts token field in metadata', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('auth', 'Auth', { token: 'abc123', userId: 99 });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.token, '[REDACTED]');
  });

  await test('logger redacts apiKey field in metadata', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('config', 'Init', { apiKey: 'sk-xxx', service: 'stripe' });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.apiKey, '[REDACTED]');
    assert.strictEqual(entry.metadata.service, 'stripe');
  });

  await test('logger redacts fields with partial name match (e.g. authorizationHeader)', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('req', 'HTTP', { authorizationHeader: 'Bearer xyz', path: '/api' });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.authorizationHeader, '[REDACTED]');
    assert.strictEqual(entry.metadata.path, '/api');
  });

  await test('logger redacts nested sensitive fields', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('nested', 'Ctx', { user: { token: 'secret', name: 'bob' } });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.user.token, '[REDACTED]');
    assert.strictEqual(entry.metadata.user.name, 'bob');
  });

  await test('logger passes null metadata through without error', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('no meta', 'Ctx', null);
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata, null);
  });

  await test('logger passes undefined metadata through without error', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('no meta', 'Ctx');
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata, undefined);
  });

  await test('logger does not mutate original metadata object', () => {
    const meta = { token: 'abc', safe: 'value' };
    withConsoleSpy('info', () => logger.info('test', 'Ctx', meta));
    assert.strictEqual(meta.token, 'abc'); // original untouched
  });

  // ── JSON structure ───────────────────────────────────────────────────────────

  await test('log entry always includes timestamp, level, message, service', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('check fields', 'Ctx');
    });
    const entry = JSON.parse(lines[0]);
    assert.ok(entry.timestamp, 'missing timestamp');
    assert.strictEqual(entry.level, 'info');
    assert.strictEqual(entry.message, 'check fields');
    assert.strictEqual(entry.service, 'leadflow-api');
  });

  await test('log entry timestamp is a valid ISO date string', () => {
    const { lines } = withConsoleSpy('info', () => logger.info('ts test', 'Ctx'));
    const entry = JSON.parse(lines[0]);
    const d = new Date(entry.timestamp);
    assert.ok(!isNaN(d.getTime()), `invalid timestamp: ${entry.timestamp}`);
  });

  // ── logger.child ─────────────────────────────────────────────────────────────

  await test('logger.child returns an object with debug/info/warn/error/fatal', () => {
    const child = logger.child('ChildCtx');
    assert.strictEqual(typeof child.debug, 'function');
    assert.strictEqual(typeof child.info, 'function');
    assert.strictEqual(typeof child.warn, 'function');
    assert.strictEqual(typeof child.error, 'function');
    assert.strictEqual(typeof child.fatal, 'function');
  });

  await test('logger.child.info prefills context', () => {
    const child = logger.child('ChildCtx');
    const { lines } = withConsoleSpy('info', () => {
      child.info('child message', { extra: 1 });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.context, 'ChildCtx');
    assert.strictEqual(entry.message, 'child message');
  });

  await test('logger.child.warn prefills context', () => {
    const child = logger.child('WarnChild');
    const { lines } = withConsoleSpy('warn', () => {
      child.warn('child warn', { detail: 'x' });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.context, 'WarnChild');
    assert.strictEqual(entry.level, 'warn');
  });

  await test('logger.child.error prefills context', () => {
    const child = logger.child('ErrChild');
    const err = new Error('child err');
    const { lines } = withConsoleSpy('error', () => {
      child.error('oops', err, { extra: true });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.context, 'ErrChild');
    assert.strictEqual(entry.error.message, 'child err');
  });

  await test('logger.child.fatal prefills context', () => {
    const child = logger.child('FatalChild');
    const { lines } = withConsoleSpy('error', () => {
      child.fatal('crash', new Error('fatal'));
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.context, 'FatalChild');
    assert.strictEqual(entry.level, 'fatal');
  });

  // ── logger.withLogging ───────────────────────────────────────────────────────

  await test('logger.withLogging returns operation result', async () => {
    const result = await suppressConsole(() =>
      logger.withLogging(async () => 42, 'getAnswer', 'TestCtx')
    );
    assert.strictEqual(result, 42);
  });

  await test('logger.withLogging logs start and completion', async () => {
    const allLines = [];
    const origInfo = console.info;
    console.info = (line) => allLines.push(line);
    try {
      await logger.withLogging(async () => 'done', 'doWork', 'WorkCtx');
    } finally {
      console.info = origInfo;
    }
    assert.ok(allLines.length >= 2, `expected ≥2 log lines, got ${allLines.length}`);
    const startEntry = JSON.parse(allLines[0]);
    const endEntry = JSON.parse(allLines[1]);
    assert.ok(startEntry.message.includes('Starting'));
    assert.ok(endEntry.message.includes('Completed'));
    assert.ok(typeof endEntry.metadata.durationMs === 'number');
  });

  await test('logger.withLogging re-throws error from operation', async () => {
    const boom = new Error('operation failed');
    await assert.rejects(
      () => suppressConsole(() => logger.withLogging(async () => { throw boom; }, 'failing', 'Ctx')),
      (err) => err === boom
    );
  });

  await test('logger.withLogging logs error when operation throws', async () => {
    const errorLines = [];
    const origError = console.error;
    const origInfo = console.info;
    console.error = (line) => errorLines.push(line);
    console.info = () => {};
    try {
      await logger.withLogging(async () => { throw new Error('fail'); }, 'badOp', 'ErrCtx').catch(() => {});
    } finally {
      console.error = origError;
      console.info = origInfo;
    }
    assert.ok(errorLines.length >= 1);
    const entry = JSON.parse(errorLines[0]);
    assert.ok(entry.message.includes('Failed'));
    assert.strictEqual(entry.level, 'error');
  });

  await test('logger.withLogging works without explicit context', async () => {
    const result = await suppressConsole(() =>
      logger.withLogging(async () => 'no-ctx')
    );
    assert.strictEqual(result, 'no-ctx');
  });

  // ── requestLogger middleware ──────────────────────────────────────────────────

  await test('requestLogger calls next()', (done) => {
    let nextCalled = false;
    const req = {
      headers: { 'x-request-id': 'req-test-1' },
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
    };
    const res = {
      _headers: {},
      setHeader(name, val) { this._headers[name] = val; },
      on(event, fn) {},
      statusCode: 200,
    };
    const next = () => { nextCalled = true; };
    suppressConsole(() => requestLogger(req, res, next));
    assert.strictEqual(nextCalled, true);
  });

  await test('requestLogger attaches requestId to req', () => {
    const req = {
      headers: { 'x-request-id': 'req-attach-test' },
      method: 'GET',
      url: '/attach',
      ip: '127.0.0.1',
    };
    const res = {
      setHeader() {},
      on() {},
      statusCode: 200,
    };
    suppressConsole(() => requestLogger(req, res, () => {}));
    assert.strictEqual(req.requestId, 'req-attach-test');
  });

  await test('requestLogger sets X-Request-ID response header', () => {
    const req = {
      headers: { 'x-request-id': 'req-header-test' },
      method: 'GET',
      url: '/header',
      ip: '10.0.0.1',
    };
    const headers = {};
    const res = {
      setHeader(name, val) { headers[name] = val; },
      on() {},
      statusCode: 200,
    };
    suppressConsole(() => requestLogger(req, res, () => {}));
    assert.strictEqual(headers['X-Request-ID'], 'req-header-test');
  });

  await test('requestLogger generates requestId when x-request-id header absent', () => {
    const req = {
      headers: {},
      method: 'POST',
      url: '/generate',
      ip: '127.0.0.1',
    };
    const res = {
      setHeader() {},
      on() {},
      statusCode: 201,
    };
    suppressConsole(() => requestLogger(req, res, () => {}));
    assert.ok(req.requestId, 'requestId should be generated');
    assert.match(req.requestId, /^req-\d+-[a-z0-9]+$/);
  });

  await test('requestLogger logs on res finish event', () => {
    let finishHandler = null;
    const req = {
      headers: { 'x-request-id': 'req-finish-test' },
      method: 'GET',
      url: '/finish',
      ip: '127.0.0.1',
    };
    const res = {
      setHeader() {},
      on(event, fn) { if (event === 'finish') finishHandler = fn; },
      statusCode: 200,
    };

    const infoLines = [];
    const warnLines = [];
    const origInfo = console.info;
    const origWarn = console.warn;
    console.info = (line) => infoLines.push(line);
    console.warn = (line) => warnLines.push(line);

    try {
      requestLogger(req, res, () => {});
      assert.ok(finishHandler, 'finish handler was not registered');

      // Trigger the finish event
      finishHandler();

      // Check that a completion log was written (either info or warn depending on status)
      const allLines = [...infoLines, ...warnLines];
      assert.ok(allLines.length >= 1, 'expected at least one completion log');
      const completionEntry = JSON.parse(allLines[allLines.length - 1]);
      assert.ok(completionEntry.message.includes('completed') || completionEntry.message.includes('Request'));
      assert.strictEqual(completionEntry.metadata.statusCode, 200);
      assert.strictEqual(completionEntry.metadata.requestId, 'req-finish-test');
    } finally {
      console.info = origInfo;
      console.warn = origWarn;
    }
  });

  await test('requestLogger uses console.warn for 4xx responses on finish', () => {
    let finishHandler = null;
    const req = {
      headers: {},
      method: 'GET',
      url: '/not-found',
      ip: '127.0.0.1',
    };
    const res = {
      setHeader() {},
      on(event, fn) { if (event === 'finish') finishHandler = fn; },
      statusCode: 404,
    };

    const warnLines = [];
    const origWarn = console.warn;
    const origInfo = console.info;
    console.warn = (line) => warnLines.push(line);
    console.info = () => {};  // suppress request start log

    try {
      requestLogger(req, res, () => {});
      finishHandler();
      assert.ok(warnLines.length >= 1, 'expected warn log for 4xx');
      const entry = JSON.parse(warnLines[0]);
      assert.strictEqual(entry.metadata.statusCode, 404);
    } finally {
      console.warn = origWarn;
      console.info = origInfo;
    }
  });

  await test('requestLogger falls back to connection.remoteAddress when req.ip absent', () => {
    const req = {
      headers: { 'x-request-id': 'req-conn-test' },
      method: 'GET',
      url: '/conn',
      ip: undefined,
      connection: { remoteAddress: '192.168.1.1' },
    };
    const res = {
      setHeader() {},
      on() {},
      statusCode: 200,
    };
    const infoLines = [];
    const orig = console.info;
    console.info = (line) => infoLines.push(line);
    try {
      requestLogger(req, res, () => {});
    } finally {
      console.info = orig;
    }
    const entry = JSON.parse(infoLines[0]);
    assert.strictEqual(entry.metadata.ip, '192.168.1.1');
  });

  // ── Module exports ───────────────────────────────────────────────────────────

  await test('module exports logger and requestLogger', () => {
    const mod = require('../../lib/logger');
    assert.strictEqual(typeof mod.logger, 'object');
    assert.strictEqual(typeof mod.requestLogger, 'function');
    // Both named and destructured exports resolve to the same objects
    assert.strictEqual(mod.logger, logger);
    assert.strictEqual(mod.requestLogger, requestLogger);
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
