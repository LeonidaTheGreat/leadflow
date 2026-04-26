'use strict';

const assert = require('assert');
const { logger, requestLogger } = require('../lib/logger');

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

function suppressConsole(fn) {
  const originals = {};
  for (const m of ['debug', 'info', 'warn', 'error']) {
    originals[m] = console[m];
    console[m] = () => {};
  }
  try {
    return fn();
  } finally {
    for (const m of Object.keys(originals)) console[m] = originals[m];
  }
}

async function suppressConsoleAsync(fn) {
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
  console.log('\n═════════════════════════════════════════════════');
  console.log('  Unit Tests: lib/logger.js');
  console.log('  Task: e91772bc-d38d-4939-9db2-961536304dbc');
  console.log('═════════════════════════════════════════════════\n');

  // ── logger.info ───────────────────────────────────────────────────────

  await test('logger.info outputs structured JSON to console.info', () => {
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

  await test('logger.info omits error field when no error provided', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('clean', 'Ctx');
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.error, undefined);
  });

  await test('logger.info works with no context or metadata', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('bare message');
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.message, 'bare message');
    assert.strictEqual(entry.context, undefined);
    assert.strictEqual(entry.metadata, undefined);
  });

  // ── logger.warn ───────────────────────────────────────────────────────

  await test('logger.warn outputs to console.warn with correct level', () => {
    const { lines } = withConsoleSpy('warn', () => {
      logger.warn('caution', 'WarnCtx', { detail: 1 });
    });
    assert.strictEqual(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.level, 'warn');
    assert.strictEqual(entry.message, 'caution');
    assert.strictEqual(entry.context, 'WarnCtx');
  });

  await test('logger.warn serializes error when provided as 4th arg', () => {
    const err = new Error('warn err');
    err.code = 'EWARN';
    const { lines } = withConsoleSpy('warn', () => {
      logger.warn('with error', 'Ctx', {}, err);
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.error.name, 'Error');
    assert.strictEqual(entry.error.message, 'warn err');
    assert.strictEqual(entry.error.code, 'EWARN');
  });

  // ── logger.error ──────────────────────────────────────────────────────

  await test('logger.error outputs to console.error with error details', () => {
    const err = new Error('boom');
    err.code = 'EBOOM';
    const { lines } = withConsoleSpy('error', () => {
      logger.error('something failed', err, 'ErrCtx', { id: 42 });
    });
    assert.strictEqual(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.level, 'error');
    assert.strictEqual(entry.message, 'something failed');
    assert.strictEqual(entry.error.name, 'Error');
    assert.strictEqual(entry.error.message, 'boom');
    assert.strictEqual(entry.error.code, 'EBOOM');
    assert.strictEqual(entry.context, 'ErrCtx');
    assert.deepStrictEqual(entry.metadata, { id: 42 });
  });

  await test('logger.error handles error without code property', () => {
    const err = new Error('no code');
    const { lines } = withConsoleSpy('error', () => {
      logger.error('err', err, 'Ctx');
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.error.code, undefined);
  });

  await test('logger.error includes stack trace in development', () => {
    const err = new Error('stack test');
    const { lines } = withConsoleSpy('error', () => {
      logger.error('trace', err, 'Ctx');
    });
    const entry = JSON.parse(lines[0]);
    assert.ok(entry.error.stack, 'stack should be present in development');
    assert.ok(entry.error.stack.includes('Error: stack test'));
  });

  // ── logger.fatal ──────────────────────────────────────────────────────

  await test('logger.fatal outputs to console.error (not console.fatal)', () => {
    const { lines } = withConsoleSpy('error', () => {
      logger.fatal('system crash', new Error('fatal'), 'FatalCtx');
    });
    assert.strictEqual(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.level, 'fatal');
    assert.strictEqual(entry.message, 'system crash');
  });

  await test('logger.fatal always logs even if minLevel is above it', () => {
    const { lines } = withConsoleSpy('error', () => {
      logger.fatal('always');
    });
    assert.strictEqual(lines.length, 1);
  });

  await test('logger.fatal works without error argument', () => {
    const { lines } = withConsoleSpy('error', () => {
      logger.fatal('no error arg');
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.level, 'fatal');
    assert.strictEqual(entry.error, undefined);
  });

  // ── logger.debug ──────────────────────────────────────────────────────

  await test('logger.debug is suppressed when minLevel is info (default)', () => {
    const { lines } = withConsoleSpy('debug', () => {
      logger.debug('debug msg', 'Ctx', { x: 1 });
    });
    assert.strictEqual(lines.length, 0);
  });

  // ── Redaction: all 7 default fields ───────────────────────────────────

  await test('redacts password field', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', { password: 'secret123', user: 'alice' });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.password, '[REDACTED]');
    assert.strictEqual(entry.metadata.user, 'alice');
  });

  await test('redacts token field', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', { token: 'abc', ok: true });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.token, '[REDACTED]');
    assert.strictEqual(entry.metadata.ok, true);
  });

  await test('redacts apiKey field', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', { apiKey: 'sk-xxx' });
    });
    assert.strictEqual(JSON.parse(lines[0]).metadata.apiKey, '[REDACTED]');
  });

  await test('redacts secret field', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', { clientSecret: 'shh' });
    });
    assert.strictEqual(JSON.parse(lines[0]).metadata.clientSecret, '[REDACTED]');
  });

  await test('redacts authorization field', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', { authorizationHeader: 'Bearer xyz', path: '/api' });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.authorizationHeader, '[REDACTED]');
    assert.strictEqual(entry.metadata.path, '/api');
  });

  await test('redacts cookie field', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', { sessionCookie: 'abc=123' });
    });
    assert.strictEqual(JSON.parse(lines[0]).metadata.sessionCookie, '[REDACTED]');
  });

  await test('redacts credit_card field', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', { credit_card: '4111111111111111' });
    });
    assert.strictEqual(JSON.parse(lines[0]).metadata.credit_card, '[REDACTED]');
  });

  // ── Redaction: edge cases ─────────────────────────────────────────────

  await test('redacts nested objects recursively', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', { user: { token: 'x', name: 'bob' } });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.user.token, '[REDACTED]');
    assert.strictEqual(entry.metadata.user.name, 'bob');
  });

  await test('redacts deeply nested objects (3 levels)', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', { a: { b: { password: 'deep' } } });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.a.b.password, '[REDACTED]');
  });

  await test('handles array metadata without crashing', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', [1, 2, 3]);
    });
    const entry = JSON.parse(lines[0]);
    assert.ok(Array.isArray(entry.metadata));
    assert.deepStrictEqual(entry.metadata, [1, 2, 3]);
  });

  await test('redacts sensitive fields inside arrays of objects', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', [{ token: 'x', id: 1 }, { name: 'safe' }]);
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata[0].token, '[REDACTED]');
    assert.strictEqual(entry.metadata[0].id, 1);
    assert.strictEqual(entry.metadata[1].name, 'safe');
  });

  await test('passes null metadata through without error', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', null);
    });
    assert.strictEqual(JSON.parse(lines[0]).metadata, null);
  });

  await test('passes undefined metadata through', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx');
    });
    assert.strictEqual(JSON.parse(lines[0]).metadata, undefined);
  });

  await test('passes string metadata through (not an object)', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', 'just a string');
    });
    assert.strictEqual(JSON.parse(lines[0]).metadata, 'just a string');
  });

  await test('passes number metadata through (not an object)', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', 42);
    });
    assert.strictEqual(JSON.parse(lines[0]).metadata, 42);
  });

  await test('redaction does not mutate the original object', () => {
    const meta = { token: 'abc', safe: 'value' };
    withConsoleSpy('info', () => logger.info('r', 'Ctx', meta));
    assert.strictEqual(meta.token, 'abc');
    assert.strictEqual(meta.safe, 'value');
  });

  await test('redaction is case-insensitive for field matching', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('r', 'Ctx', { PASSWORD: 'x', TOKEN: 'y' });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.PASSWORD, '[REDACTED]');
    assert.strictEqual(entry.metadata.TOKEN, '[REDACTED]');
  });

  // ── JSON structure ────────────────────────────────────────────────────

  await test('log entry contains timestamp, level, message, service, environment', () => {
    const { lines } = withConsoleSpy('info', () => {
      logger.info('fields check', 'Ctx');
    });
    const entry = JSON.parse(lines[0]);
    assert.ok(entry.timestamp);
    assert.strictEqual(entry.level, 'info');
    assert.strictEqual(entry.message, 'fields check');
    assert.strictEqual(entry.service, 'leadflow-api');
    assert.ok(entry.environment);
  });

  await test('timestamp is a valid ISO 8601 string', () => {
    const { lines } = withConsoleSpy('info', () => logger.info('ts', 'Ctx'));
    const entry = JSON.parse(lines[0]);
    const d = new Date(entry.timestamp);
    assert.ok(!isNaN(d.getTime()), `invalid timestamp: ${entry.timestamp}`);
    assert.ok(entry.timestamp.endsWith('Z'), 'should end with Z');
  });

  await test('output is valid JSON (parseable)', () => {
    const { lines } = withConsoleSpy('warn', () => {
      logger.warn('json check', 'Ctx', { special: 'chars "and" more' });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.special, 'chars "and" more');
  });

  // ── logger.child ──────────────────────────────────────────────────────

  await test('child() returns object with all 5 log methods', () => {
    const child = logger.child('ChildCtx');
    for (const method of ['debug', 'info', 'warn', 'error', 'fatal']) {
      assert.strictEqual(typeof child[method], 'function', `missing ${method}`);
    }
  });

  await test('child.info injects predefined context', () => {
    const child = logger.child('ServiceA');
    const { lines } = withConsoleSpy('info', () => {
      child.info('from child', { extra: 1 });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.context, 'ServiceA');
    assert.strictEqual(entry.message, 'from child');
    assert.deepStrictEqual(entry.metadata, { extra: 1 });
  });

  await test('child.warn injects predefined context', () => {
    const child = logger.child('WarnSvc');
    const { lines } = withConsoleSpy('warn', () => {
      child.warn('child warn');
    });
    assert.strictEqual(JSON.parse(lines[0]).context, 'WarnSvc');
  });

  await test('child.error injects context and serializes error', () => {
    const child = logger.child('ErrSvc');
    const err = new Error('child err');
    const { lines } = withConsoleSpy('error', () => {
      child.error('oops', err, { detail: true });
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.context, 'ErrSvc');
    assert.strictEqual(entry.error.message, 'child err');
    assert.strictEqual(entry.metadata.detail, true);
  });

  await test('child.fatal injects context', () => {
    const child = logger.child('FatalSvc');
    const { lines } = withConsoleSpy('error', () => {
      child.fatal('crash', new Error('f'));
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.context, 'FatalSvc');
    assert.strictEqual(entry.level, 'fatal');
  });

  await test('child.debug is filtered by minLevel (default info)', () => {
    const child = logger.child('DebugSvc');
    const { lines } = withConsoleSpy('debug', () => {
      child.debug('should not appear');
    });
    assert.strictEqual(lines.length, 0);
  });

  // ── logger.withLogging ────────────────────────────────────────────────

  await test('withLogging returns the operation result', async () => {
    const result = await suppressConsoleAsync(() =>
      logger.withLogging(async () => 42, 'getAnswer', 'Ctx')
    );
    assert.strictEqual(result, 42);
  });

  await test('withLogging logs start and completion messages', async () => {
    const { lines } = await withConsoleSpyAsync('info', () =>
      logger.withLogging(async () => 'done', 'doWork', 'WorkCtx')
    );
    assert.ok(lines.length >= 2, `expected >=2 info lines, got ${lines.length}`);
    const start = JSON.parse(lines[0]);
    const end = JSON.parse(lines[1]);
    assert.ok(start.message.includes('Starting'));
    assert.ok(end.message.includes('Completed'));
  });

  await test('withLogging completion log includes durationMs >= 0', async () => {
    const { lines } = await withConsoleSpyAsync('info', () =>
      logger.withLogging(async () => {}, 'timing', 'Ctx')
    );
    const end = JSON.parse(lines[lines.length - 1]);
    assert.ok(typeof end.metadata.durationMs === 'number');
    assert.ok(end.metadata.durationMs >= 0);
  });

  await test('withLogging re-throws the original error', async () => {
    const boom = new Error('op failed');
    await assert.rejects(
      () => suppressConsoleAsync(() =>
        logger.withLogging(async () => { throw boom; }, 'failing', 'Ctx')
      ),
      (err) => err === boom
    );
  });

  await test('withLogging logs error with durationMs when operation fails', async () => {
    const errorLines = [];
    const origError = console.error;
    const origInfo = console.info;
    console.error = (line) => errorLines.push(line);
    console.info = () => {};
    try {
      await logger.withLogging(async () => { throw new Error('fail'); }, 'badOp', 'Ctx').catch(() => {});
    } finally {
      console.error = origError;
      console.info = origInfo;
    }
    assert.ok(errorLines.length >= 1);
    const entry = JSON.parse(errorLines[0]);
    assert.ok(entry.message.includes('Failed'));
    assert.strictEqual(entry.level, 'error');
    assert.ok(typeof entry.metadata.durationMs === 'number');
  });

  await test('withLogging defaults context to "AsyncOperation" when omitted', async () => {
    const { lines } = await withConsoleSpyAsync('info', () =>
      logger.withLogging(async () => 'ok', 'noCtx')
    );
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.context, 'AsyncOperation');
  });

  await test('withLogging works with synchronous-returning operation', async () => {
    const result = await suppressConsoleAsync(() =>
      logger.withLogging(() => 'sync-result', 'syncOp', 'Ctx')
    );
    assert.strictEqual(result, 'sync-result');
  });

  // ── requestLogger middleware ───────────────────────────────────────────

  await test('requestLogger calls next()', () => {
    let nextCalled = false;
    const req = {
      headers: { 'x-request-id': 'req-1' },
      method: 'GET', url: '/test', ip: '127.0.0.1',
    };
    const res = {
      setHeader() {}, on() {}, statusCode: 200,
    };
    suppressConsole(() => requestLogger(req, res, () => { nextCalled = true; }));
    assert.strictEqual(nextCalled, true);
  });

  await test('requestLogger attaches requestId from x-request-id header', () => {
    const req = {
      headers: { 'x-request-id': 'req-custom-id' },
      method: 'GET', url: '/attach', ip: '127.0.0.1',
    };
    const res = { setHeader() {}, on() {}, statusCode: 200 };
    suppressConsole(() => requestLogger(req, res, () => {}));
    assert.strictEqual(req.requestId, 'req-custom-id');
  });

  await test('requestLogger generates requestId when header absent', () => {
    const req = {
      headers: {},
      method: 'POST', url: '/gen', ip: '127.0.0.1',
    };
    const res = { setHeader() {}, on() {}, statusCode: 201 };
    suppressConsole(() => requestLogger(req, res, () => {}));
    assert.ok(req.requestId, 'requestId should be generated');
    assert.match(req.requestId, /^req-\d+-[a-z0-9]+$/);
  });

  await test('requestLogger sets X-Request-ID response header', () => {
    const headers = {};
    const req = {
      headers: { 'x-request-id': 'req-hdr' },
      method: 'GET', url: '/hdr', ip: '10.0.0.1',
    };
    const res = {
      setHeader(name, val) { headers[name] = val; },
      on() {}, statusCode: 200,
    };
    suppressConsole(() => requestLogger(req, res, () => {}));
    assert.strictEqual(headers['X-Request-ID'], 'req-hdr');
  });

  await test('requestLogger logs request start with method, url, ip', () => {
    const req = {
      headers: { 'x-request-id': 'req-start', 'user-agent': 'TestAgent/1.0' },
      method: 'POST', url: '/api/leads', ip: '192.168.1.1',
    };
    const res = { setHeader() {}, on() {}, statusCode: 200 };
    const { lines } = withConsoleSpy('info', () => {
      requestLogger(req, res, () => {});
    });
    assert.ok(lines.length >= 1);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.method, 'POST');
    assert.strictEqual(entry.metadata.url, '/api/leads');
    assert.strictEqual(entry.metadata.ip, '192.168.1.1');
    assert.strictEqual(entry.metadata.userAgent, 'TestAgent/1.0');
    assert.strictEqual(entry.metadata.requestId, 'req-start');
  });

  await test('requestLogger logs completion on res finish with statusCode and durationMs', () => {
    let finishHandler = null;
    const req = {
      headers: { 'x-request-id': 'req-finish' },
      method: 'GET', url: '/done', ip: '127.0.0.1',
    };
    const res = {
      setHeader() {},
      on(event, fn) { if (event === 'finish') finishHandler = fn; },
      statusCode: 200,
    };
    const allLines = [];
    const origInfo = console.info;
    console.info = (line) => allLines.push(line);
    try {
      requestLogger(req, res, () => {});
      assert.ok(finishHandler, 'finish handler not registered');
      finishHandler();
    } finally {
      console.info = origInfo;
    }
    const completionEntry = JSON.parse(allLines[allLines.length - 1]);
    assert.strictEqual(completionEntry.metadata.statusCode, 200);
    assert.ok(typeof completionEntry.metadata.durationMs === 'number');
    assert.strictEqual(completionEntry.metadata.requestId, 'req-finish');
  });

  await test('requestLogger uses warn level for 4xx status codes', () => {
    let finishHandler = null;
    const req = {
      headers: {}, method: 'GET', url: '/notfound', ip: '127.0.0.1',
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
    console.info = () => {};
    try {
      requestLogger(req, res, () => {});
      finishHandler();
    } finally {
      console.warn = origWarn;
      console.info = origInfo;
    }
    assert.ok(warnLines.length >= 1);
    assert.strictEqual(JSON.parse(warnLines[0]).metadata.statusCode, 404);
  });

  await test('requestLogger uses warn level for 5xx status codes', () => {
    let finishHandler = null;
    const req = {
      headers: {}, method: 'GET', url: '/error', ip: '127.0.0.1',
    };
    const res = {
      setHeader() {},
      on(event, fn) { if (event === 'finish') finishHandler = fn; },
      statusCode: 500,
    };
    const warnLines = [];
    const origWarn = console.warn;
    const origInfo = console.info;
    console.warn = (line) => warnLines.push(line);
    console.info = () => {};
    try {
      requestLogger(req, res, () => {});
      finishHandler();
    } finally {
      console.warn = origWarn;
      console.info = origInfo;
    }
    assert.ok(warnLines.length >= 1);
    assert.strictEqual(JSON.parse(warnLines[0]).metadata.statusCode, 500);
  });

  await test('requestLogger uses info level for 2xx status codes on finish', () => {
    let finishHandler = null;
    const req = {
      headers: { 'x-request-id': 'req-2xx' },
      method: 'POST', url: '/create', ip: '127.0.0.1',
    };
    const res = {
      setHeader() {},
      on(event, fn) { if (event === 'finish') finishHandler = fn; },
      statusCode: 201,
    };
    const infoLines = [];
    const origInfo = console.info;
    console.info = (line) => infoLines.push(line);
    try {
      requestLogger(req, res, () => {});
      finishHandler();
    } finally {
      console.info = origInfo;
    }
    const last = JSON.parse(infoLines[infoLines.length - 1]);
    assert.strictEqual(last.level, 'info');
    assert.strictEqual(last.metadata.statusCode, 201);
  });

  await test('requestLogger falls back to connection.remoteAddress when req.ip is absent', () => {
    const req = {
      headers: { 'x-request-id': 'req-conn' },
      method: 'GET', url: '/conn',
      ip: undefined,
      connection: { remoteAddress: '10.10.10.10' },
    };
    const res = { setHeader() {}, on() {}, statusCode: 200 };
    const { lines } = withConsoleSpy('info', () => {
      requestLogger(req, res, () => {});
    });
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.metadata.ip, '10.10.10.10');
  });

  // ── Module exports ────────────────────────────────────────────────────

  await test('module.exports.logger is the logger object', () => {
    const mod = require('../lib/logger');
    assert.strictEqual(typeof mod.logger, 'object');
    assert.strictEqual(typeof mod.logger.info, 'function');
    assert.strictEqual(typeof mod.logger.error, 'function');
    assert.strictEqual(typeof mod.logger.child, 'function');
    assert.strictEqual(typeof mod.logger.withLogging, 'function');
  });

  await test('module.exports.requestLogger is a function', () => {
    const mod = require('../lib/logger');
    assert.strictEqual(typeof mod.requestLogger, 'function');
  });

  await test('destructured and named exports reference the same objects', () => {
    const mod = require('../lib/logger');
    const { logger: l, requestLogger: rl } = mod;
    assert.strictEqual(l, mod.logger);
    assert.strictEqual(rl, mod.requestLogger);
  });

  // ── Summary ───────────────────────────────────────────────────────────

  console.log('\n═════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═════════════════════════════════════════════════');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  const rate = (passed + failed) > 0 ? passed / (passed + failed) : 1;
  console.log(`  Pass rate: ${(rate * 100).toFixed(0)}%`);
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
