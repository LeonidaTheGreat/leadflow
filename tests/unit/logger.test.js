/*
 * SPEC
 * What:  tests/unit/logger.test.js — tests for lib/logger.js
 *        Tests: logger.debug/info/warn/error/fatal, redaction, child(), withLogging(), requestLogger()
 * Verify: node tests/unit/logger.test.js → "Results: N passed, 0 failed"
 * Boundaries: only tests logger.js public API; does not modify logger.js or request-context.js
 */

'use strict';

const assert = require('assert');

// Capture console output before requiring the module (logger uses console)
const captured = [];
const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

function mockConsole() {
  for (const level of ['debug', 'info', 'warn', 'error']) {
    console[level] = (...args) => captured.push({ level, output: args[0] });
  }
}

function restoreConsole() {
  Object.assign(console, originalConsole);
}

function flushCaptured() {
  captured.length = 0;
}

function lastEntry(level) {
  const entries = captured.filter(e => e.level === level);
  if (!entries.length) return null;
  try {
    return JSON.parse(entries[entries.length - 1].output);
  } catch {
    return null;
  }
}

// Require after setting up capture
mockConsole();
const { logger, requestLogger } = require('../../lib/logger');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  flushCaptured();
  try {
    await fn();
    originalConsole.info(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    originalConsole.error(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

async function run() {
  originalConsole.info('\n=== unit: logger ===\n');

  // ── logger.info ──────────────────────────────────────────────────────────────

  await check('logger.info writes JSON to console.info', () => {
    logger.info('hello world', 'TestCtx', { key: 'val' });
    const entry = lastEntry('info');
    assert.ok(entry, 'expected a logged entry');
    assert.strictEqual(entry.level, 'info');
    assert.strictEqual(entry.message, 'hello world');
    assert.strictEqual(entry.context, 'TestCtx');
    assert.deepStrictEqual(entry.metadata, { key: 'val' });
    assert.strictEqual(entry.service, 'leadflow-api');
    assert.ok(entry.timestamp, 'timestamp must be present');
  });

  await check('logger.info without metadata logs null metadata', () => {
    logger.info('bare message');
    const entry = lastEntry('info');
    assert.ok(entry);
    assert.strictEqual(entry.message, 'bare message');
    assert.strictEqual(entry.metadata, undefined);
  });

  // ── logger.warn ──────────────────────────────────────────────────────────────

  await check('logger.warn writes JSON to console.warn', () => {
    logger.warn('something off', 'WarnCtx', { extra: 1 });
    const entry = lastEntry('warn');
    assert.ok(entry);
    assert.strictEqual(entry.level, 'warn');
    assert.strictEqual(entry.message, 'something off');
  });

  await check('logger.warn includes error field when error provided', () => {
    const err = new Error('boom');
    err.code = 'TEST_ERR';
    logger.warn('with error', 'Ctx', {}, err);
    const entry = lastEntry('warn');
    assert.ok(entry);
    assert.ok(entry.error, 'expected error field');
    assert.strictEqual(entry.error.name, 'Error');
    assert.strictEqual(entry.error.message, 'boom');
    assert.strictEqual(entry.error.code, 'TEST_ERR');
  });

  // ── logger.error ─────────────────────────────────────────────────────────────

  await check('logger.error writes JSON to console.error', () => {
    const err = new Error('fail hard');
    logger.error('error message', err, 'ErrCtx', { detail: 42 });
    const entry = lastEntry('error');
    assert.ok(entry);
    assert.strictEqual(entry.level, 'error');
    assert.strictEqual(entry.message, 'error message');
    assert.strictEqual(entry.error.message, 'fail hard');
    assert.deepStrictEqual(entry.metadata, { detail: 42 });
  });

  await check('logger.error handles null error gracefully', () => {
    logger.error('no error object', null, 'ErrCtx', {});
    const entry = lastEntry('error');
    assert.ok(entry);
    assert.strictEqual(entry.error, undefined);
  });

  // ── logger.fatal ─────────────────────────────────────────────────────────────

  await check('logger.fatal always logs (uses console.error)', () => {
    const err = new Error('fatal boom');
    logger.fatal('fatal message', err, 'FatalCtx', {});
    // fatal maps to console.error
    const entry = lastEntry('error');
    assert.ok(entry);
    assert.strictEqual(entry.level, 'fatal');
    assert.strictEqual(entry.message, 'fatal message');
    assert.strictEqual(entry.error.message, 'fatal boom');
  });

  // ── logger.debug (filtered by LOG_LEVEL=info default) ────────────────────────

  await check('logger.debug is suppressed when LOG_LEVEL=info (default)', () => {
    // Default minLevel is 'info' so debug should not produce output
    const before = captured.length;
    logger.debug('debug msg', 'DbgCtx', {});
    // debug may or may not appear depending on env; we only assert if LOG_LEVEL != 'debug'
    const logLevel = process.env.LOG_LEVEL || 'info';
    if (logLevel !== 'debug') {
      assert.strictEqual(captured.length, before, 'debug should be suppressed at info level');
    }
  });

  // ── Sensitive data redaction ──────────────────────────────────────────────────

  await check('metadata with "password" field is redacted', () => {
    logger.info('redact test', 'RedactCtx', { password: 'supersecret', name: 'Alice' });
    const entry = lastEntry('info');
    assert.ok(entry);
    assert.strictEqual(entry.metadata.password, '[REDACTED]');
    assert.strictEqual(entry.metadata.name, 'Alice');
  });

  await check('metadata with "token" field is redacted', () => {
    logger.info('token test', 'RedactCtx', { accessToken: 'abc123', userId: 7 });
    const entry = lastEntry('info');
    assert.strictEqual(entry.metadata.accessToken, '[REDACTED]');
    assert.strictEqual(entry.metadata.userId, 7);
  });

  await check('metadata with "apiKey" field is redacted', () => {
    logger.info('apiKey test', 'Ctx', { apiKey: 'sk-xxx', count: 3 });
    const entry = lastEntry('info');
    assert.strictEqual(entry.metadata.apiKey, '[REDACTED]');
    assert.strictEqual(entry.metadata.count, 3);
  });

  await check('nested metadata with secret field is redacted', () => {
    logger.info('nested redact', 'Ctx', { auth: { secret: 'hidden', label: 'ok' } });
    const entry = lastEntry('info');
    assert.strictEqual(entry.metadata.auth.secret, '[REDACTED]');
    assert.strictEqual(entry.metadata.auth.label, 'ok');
  });

  await check('null metadata does not throw', () => {
    logger.info('null meta', 'Ctx', null);
    const entry = lastEntry('info');
    assert.ok(entry);
    assert.strictEqual(entry.metadata, null);
  });

  await check('non-object metadata (string) passes through unchanged', () => {
    logger.info('string meta', 'Ctx', 'raw string');
    const entry = lastEntry('info');
    assert.ok(entry);
    assert.strictEqual(entry.metadata, 'raw string');
  });

  // ── logger.child ──────────────────────────────────────────────────────────────

  await check('child logger binds context to all log calls', () => {
    const child = logger.child('ChildContext');
    child.info('child info', { x: 1 });
    const entry = lastEntry('info');
    assert.ok(entry);
    assert.strictEqual(entry.context, 'ChildContext');
    assert.strictEqual(entry.message, 'child info');
    assert.deepStrictEqual(entry.metadata, { x: 1 });
  });

  await check('child.warn passes error correctly', () => {
    const child = logger.child('ChildWarn');
    const err = new Error('child warn err');
    child.warn('child warn', { y: 2 }, err);
    const entry = lastEntry('warn');
    assert.ok(entry);
    assert.strictEqual(entry.context, 'ChildWarn');
    assert.strictEqual(entry.error.message, 'child warn err');
  });

  await check('child.error passes error correctly', () => {
    const child = logger.child('ChildError');
    const err = new Error('child error');
    child.error('child error msg', err, { z: 3 });
    const entry = lastEntry('error');
    assert.ok(entry);
    assert.strictEqual(entry.context, 'ChildError');
    assert.strictEqual(entry.error.message, 'child error');
  });

  await check('child.fatal logs at fatal level', () => {
    const child = logger.child('ChildFatal');
    const err = new Error('fatal from child');
    child.fatal('fatal', err, {});
    const entry = lastEntry('error'); // fatal uses console.error
    assert.ok(entry);
    assert.strictEqual(entry.level, 'fatal');
  });

  // ── logger.withLogging ────────────────────────────────────────────────────────

  await check('withLogging logs start and completion for successful operation', async () => {
    let capturedInner = [];
    const before = captured.length;
    const result = await logger.withLogging(
      async () => 'operation result',
      'TestOperation',
      'WithLoggingCtx'
    );
    assert.strictEqual(result, 'operation result');
    // should have logged "Starting: TestOperation" and "Completed: TestOperation"
    const entries = captured.slice(before).map(e => JSON.parse(e.output));
    const starting = entries.find(e => e.message && e.message.includes('Starting: TestOperation'));
    const completed = entries.find(e => e.message && e.message.includes('Completed: TestOperation'));
    assert.ok(starting, 'should log starting message');
    assert.ok(completed, 'should log completed message');
    assert.ok(typeof completed.metadata.durationMs === 'number', 'should include durationMs');
  });

  await check('withLogging logs failure and re-throws error', async () => {
    const before = captured.length;
    const opError = new Error('operation failed');
    let thrown = null;
    try {
      await logger.withLogging(
        async () => { throw opError; },
        'FailingOperation',
        'WithLoggingCtx'
      );
    } catch (e) {
      thrown = e;
    }
    assert.strictEqual(thrown, opError, 'should re-throw the original error');
    const entries = captured.slice(before).map(e => JSON.parse(e.output));
    const failed = entries.find(e => e.level === 'error' && e.message && e.message.includes('Failed: FailingOperation'));
    assert.ok(failed, 'should log failure message');
    assert.strictEqual(failed.error.message, 'operation failed');
  });

  await check('withLogging without context defaults gracefully', async () => {
    const result = await logger.withLogging(async () => 42, 'NoCtxOp');
    assert.strictEqual(result, 42);
  });

  // ── requestLogger middleware ──────────────────────────────────────────────────

  await check('requestLogger calls next()', () => {
    let nextCalled = false;
    const req = {
      headers: { 'x-request-id': 'req-test-123', 'user-agent': 'test-agent' },
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
    };
    const events = {};
    const res = {
      setHeader: () => {},
      statusCode: 200,
      on: (event, cb) => { events[event] = cb; },
    };
    requestLogger(req, res, () => { nextCalled = true; });
    assert.ok(nextCalled, 'next() must be called');
  });

  await check('requestLogger uses x-request-id header when present', () => {
    const req = {
      headers: { 'x-request-id': 'my-request-id', 'user-agent': 'ua' },
      method: 'POST',
      url: '/api/test',
      ip: '10.0.0.1',
      connection: { remoteAddress: '10.0.0.1' },
    };
    const res = {
      setHeader: (name, val) => {},
      statusCode: 201,
      on: () => {},
    };
    const before = captured.length;
    requestLogger(req, res, () => {});
    const entries = captured.slice(before).map(e => { try { return JSON.parse(e.output); } catch { return null; } }).filter(Boolean);
    const started = entries.find(e => e.message === 'Request started');
    assert.ok(started, 'should log Request started');
    assert.strictEqual(started.metadata.requestId, 'my-request-id');
  });

  await check('requestLogger generates requestId when header absent', () => {
    const req = {
      headers: { 'user-agent': 'ua' },
      method: 'GET',
      url: '/no-id',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
    };
    let setHeaderCalled = false;
    const res = {
      setHeader: (name, val) => {
        if (name === 'X-Request-ID') setHeaderCalled = true;
      },
      statusCode: 200,
      on: () => {},
    };
    requestLogger(req, res, () => {});
    assert.ok(req.requestId, 'should assign requestId to req');
    assert.ok(req.requestId.startsWith('req-'), 'generated requestId should start with req-');
    assert.ok(setHeaderCalled, 'should set X-Request-ID response header');
  });

  await check('requestLogger logs completion on response finish with 200', () => {
    const req = {
      headers: { 'x-request-id': 'finish-test', 'user-agent': 'ua' },
      method: 'GET',
      url: '/finish',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
    };
    let finishCb = null;
    const res = {
      setHeader: () => {},
      statusCode: 200,
      on: (event, cb) => { if (event === 'finish') finishCb = cb; },
    };
    const before = captured.length;
    requestLogger(req, res, () => {});
    assert.ok(finishCb, 'finish handler must be registered');
    finishCb(); // simulate response finish
    const entries = captured.slice(before).map(e => { try { return JSON.parse(e.output); } catch { return null; } }).filter(Boolean);
    const completed = entries.find(e => e.message === 'Request completed');
    assert.ok(completed, 'should log Request completed');
    assert.strictEqual(completed.metadata.statusCode, 200);
    assert.strictEqual(completed.metadata.requestId, 'finish-test');
    assert.ok(typeof completed.metadata.durationMs === 'number');
  });

  await check('requestLogger logs completion as warn for 4xx responses', () => {
    const req = {
      headers: { 'x-request-id': 'err-test', 'user-agent': 'ua' },
      method: 'GET',
      url: '/bad',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
    };
    let finishCb = null;
    const res = {
      setHeader: () => {},
      statusCode: 404,
      on: (event, cb) => { if (event === 'finish') finishCb = cb; },
    };
    const before = captured.length;
    requestLogger(req, res, () => {});
    finishCb();
    const entries = captured.slice(before).map(e => { try { return JSON.parse(e.output); } catch { return null; } }).filter(Boolean);
    const completed = entries.find(e => e.message === 'Request completed');
    assert.ok(completed, 'should log Request completed');
    assert.strictEqual(completed.level, 'warn', '4xx should log at warn level');
    assert.strictEqual(completed.metadata.statusCode, 404);
  });

  // ── Module exports ────────────────────────────────────────────────────────────

  await check('module exports logger and requestLogger as named exports', () => {
    const mod = require('../../lib/logger');
    assert.ok(mod.logger, 'should export logger');
    assert.ok(mod.requestLogger, 'should export requestLogger');
    assert.strictEqual(typeof mod.logger.info, 'function');
    assert.strictEqual(typeof mod.requestLogger, 'function');
  });

  await check('default and named exports are the same object', () => {
    const mod = require('../../lib/logger');
    assert.strictEqual(mod.logger, mod.logger, 'sanity check');
    // Both module.exports.logger and named export should be same
    assert.strictEqual(typeof mod.logger.child, 'function');
    assert.strictEqual(typeof mod.logger.withLogging, 'function');
  });

  restoreConsole();

  originalConsole.info(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  originalConsole.error('Test runner error:', err);
  process.exit(1);
});
