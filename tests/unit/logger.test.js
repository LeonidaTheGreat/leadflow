'use strict';

/**
 * Unit tests for lib/logger.js — Jest format
 *
 * Spec:
 *   What:   lib/logger.js — logger.{debug,info,warn,error,fatal,child,withLogging}
 *           and requestLogger Express middleware
 *   Verify: npx jest tests/unit/logger.test.js --no-coverage → all tests pass, exit 0
 *   Boundaries: lib/logger.js is read-only. No other files touched.
 */

const { logger, requestLogger } = require('../../lib/logger');

describe('logger', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function parseCalls(spy) {
    return spy.mock.calls.map((args) => JSON.parse(args[0]));
  }

  function firstEntry(spy) {
    expect(spy).toHaveBeenCalled();
    return JSON.parse(spy.mock.calls[0][0]);
  }

  // ── logger.info ──────────────────────────────────────────────────────────────

  describe('logger.info', () => {
    test('writes JSON to console.info', () => {
      logger.info('hello world', 'TestCtx', { foo: 'bar' });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.level).toBe('info');
      expect(entry.message).toBe('hello world');
      expect(entry.context).toBe('TestCtx');
      expect(entry.service).toBe('leadflow-api');
      expect(entry.timestamp).toBeDefined();
      expect(entry.metadata).toEqual({ foo: 'bar' });
    });

    test('does not include error field when no error provided', () => {
      logger.info('no error', 'TestCtx');
      expect(firstEntry(consoleSpy.info).error).toBeUndefined();
    });

    test('includes environment field', () => {
      logger.info('env check', 'TestCtx');
      expect(firstEntry(consoleSpy.info).environment).toBeDefined();
    });

    test('writes one line per call', () => {
      logger.info('msg1', 'Ctx');
      logger.info('msg2', 'Ctx');
      expect(consoleSpy.info).toHaveBeenCalledTimes(2);
    });
  });

  // ── logger.warn ──────────────────────────────────────────────────────────────

  describe('logger.warn', () => {
    test('writes JSON to console.warn', () => {
      logger.warn('something off', 'WarnCtx', { detail: 1 });
      const entry = firstEntry(consoleSpy.warn);
      expect(entry.level).toBe('warn');
      expect(entry.message).toBe('something off');
    });

    test('includes error fields when error is provided', () => {
      const err = new Error('warn error');
      err.code = 'EWARN';
      logger.warn('with error', 'WarnCtx', {}, err);
      const entry = firstEntry(consoleSpy.warn);
      expect(entry.error.name).toBe('Error');
      expect(entry.error.message).toBe('warn error');
      expect(entry.error.code).toBe('EWARN');
    });

    test('does not include error field when no error provided', () => {
      logger.warn('no error warn', 'Ctx');
      expect(firstEntry(consoleSpy.warn).error).toBeUndefined();
    });
  });

  // ── logger.error ─────────────────────────────────────────────────────────────

  describe('logger.error', () => {
    test('writes JSON to console.error', () => {
      const err = new Error('boom');
      logger.error('something failed', err, 'ErrCtx', { id: 42 });
      const entry = firstEntry(consoleSpy.error);
      expect(entry.level).toBe('error');
      expect(entry.message).toBe('something failed');
      expect(entry.error.name).toBe('Error');
      expect(entry.error.message).toBe('boom');
      expect(entry.context).toBe('ErrCtx');
    });

    test('error.code is undefined when error has no code', () => {
      logger.error('no code error', new Error('no code'), 'Ctx');
      expect(firstEntry(consoleSpy.error).error.code).toBeUndefined();
    });

    test('handles null error gracefully (no error field emitted)', () => {
      logger.error('null error', null, 'Ctx');
      expect(consoleSpy.error).toHaveBeenCalled();
      expect(firstEntry(consoleSpy.error).error).toBeUndefined();
    });

    test('includes context and metadata in entry', () => {
      logger.error('ctx test', new Error('x'), 'MyCtx', { userId: 7 });
      const entry = firstEntry(consoleSpy.error);
      expect(entry.context).toBe('MyCtx');
      expect(entry.metadata.userId).toBe(7);
    });
  });

  // ── logger.fatal ─────────────────────────────────────────────────────────────

  describe('logger.fatal', () => {
    test('writes JSON to console.error (fatal uses the error channel)', () => {
      logger.fatal('system crash', new Error('fatal'), 'FatalCtx');
      const entry = firstEntry(consoleSpy.error);
      expect(entry.level).toBe('fatal');
      expect(entry.message).toBe('system crash');
    });

    test('always logs regardless of level filter', () => {
      logger.fatal('always logs');
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    test('does not write to info or warn channels', () => {
      logger.fatal('fatal msg', new Error('crash'));
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    test('includes error fields when error provided', () => {
      const err = new Error('fatal error');
      err.code = 'EFATAL';
      logger.fatal('crash', err, 'Ctx');
      const entry = firstEntry(consoleSpy.error);
      expect(entry.error.message).toBe('fatal error');
      expect(entry.error.code).toBe('EFATAL');
    });
  });

  // ── logger.debug ─────────────────────────────────────────────────────────────

  describe('logger.debug', () => {
    test('is filtered when minLevel is info (the default)', () => {
      logger.debug('debug message', 'Ctx', { x: 1 });
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });
  });

  // ── Sensitive data redaction ──────────────────────────────────────────────────

  describe('sensitive data redaction', () => {
    test('redacts password field', () => {
      logger.info('login', 'Auth', { password: 'supersecret', username: 'alice' });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata.password).toBe('[REDACTED]');
      expect(entry.metadata.username).toBe('alice');
    });

    test('redacts token field', () => {
      logger.info('auth', 'Auth', { token: 'abc123', userId: 99 });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata.token).toBe('[REDACTED]');
      expect(entry.metadata.userId).toBe(99);
    });

    test('redacts apiKey field', () => {
      logger.info('config', 'Init', { apiKey: 'sk-xxx', service: 'stripe' });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata.apiKey).toBe('[REDACTED]');
      expect(entry.metadata.service).toBe('stripe');
    });

    test('redacts secret field', () => {
      logger.info('secret', 'Ctx', { secret: 'mysecret', other: 'value' });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata.secret).toBe('[REDACTED]');
      expect(entry.metadata.other).toBe('value');
    });

    test('redacts authorization field (partial match: authorizationHeader)', () => {
      logger.info('req', 'HTTP', { authorizationHeader: 'Bearer xyz', path: '/api' });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata.authorizationHeader).toBe('[REDACTED]');
      expect(entry.metadata.path).toBe('/api');
    });

    test('redacts cookie field', () => {
      logger.info('req', 'HTTP', { cookie: 'session=abc', method: 'GET' });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata.cookie).toBe('[REDACTED]');
      expect(entry.metadata.method).toBe('GET');
    });

    test('redacts credit_card field', () => {
      logger.info('payment', 'Billing', { credit_card: '4111-xxxx', amount: 100 });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata.credit_card).toBe('[REDACTED]');
      expect(entry.metadata.amount).toBe(100);
    });

    test('redacts nested sensitive fields recursively', () => {
      logger.info('nested', 'Ctx', { user: { token: 'secret', name: 'bob' } });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata.user.token).toBe('[REDACTED]');
      expect(entry.metadata.user.name).toBe('bob');
    });

    test('does not mutate the original metadata object', () => {
      const meta = { token: 'abc', safe: 'value' };
      logger.info('immutable', 'Ctx', meta);
      expect(meta.token).toBe('abc');
    });

    test('handles null metadata without error', () => {
      expect(() => logger.info('null meta', 'Ctx', null)).not.toThrow();
      expect(firstEntry(consoleSpy.info).metadata).toBeNull();
    });

    test('handles undefined metadata without error', () => {
      expect(() => logger.info('undef meta', 'Ctx')).not.toThrow();
      expect(firstEntry(consoleSpy.info).metadata).toBeUndefined();
    });

    test('handles array metadata with sensitive field inside objects', () => {
      logger.info('arr', 'Ctx', [{ token: 'secret', safe: 'value' }]);
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata[0].token).toBe('[REDACTED]');
      expect(entry.metadata[0].safe).toBe('value');
    });
  });

  // ── JSON log entry structure ──────────────────────────────────────────────────

  describe('JSON log entry structure', () => {
    test('always includes timestamp, level, message, service, context, environment', () => {
      logger.info('check fields', 'TestCtx');
      const entry = firstEntry(consoleSpy.info);
      expect(entry.timestamp).toBeDefined();
      expect(entry.level).toBe('info');
      expect(entry.message).toBe('check fields');
      expect(entry.context).toBe('TestCtx');
      expect(entry.service).toBe('leadflow-api');
      expect(entry.environment).toBeDefined();
    });

    test('timestamp is a valid ISO date string', () => {
      logger.info('ts test', 'Ctx');
      const { timestamp } = firstEntry(consoleSpy.info);
      expect(new Date(timestamp).getTime()).not.toBeNaN();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('output written to console is valid JSON', () => {
      logger.info('json check', 'Ctx', { key: 'val' });
      expect(() => JSON.parse(consoleSpy.info.mock.calls[0][0])).not.toThrow();
    });

    test('service field is always leadflow-api', () => {
      logger.warn('service check', 'Ctx');
      expect(firstEntry(consoleSpy.warn).service).toBe('leadflow-api');
    });
  });

  // ── logger.child ──────────────────────────────────────────────────────────────

  describe('logger.child', () => {
    test('returns object with debug/info/warn/error/fatal methods', () => {
      const child = logger.child('ChildCtx');
      expect(typeof child.debug).toBe('function');
      expect(typeof child.info).toBe('function');
      expect(typeof child.warn).toBe('function');
      expect(typeof child.error).toBe('function');
      expect(typeof child.fatal).toBe('function');
    });

    test('child.info prefills context in log entry', () => {
      const child = logger.child('ChildCtx');
      child.info('child message', { extra: 1 });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.context).toBe('ChildCtx');
      expect(entry.message).toBe('child message');
    });

    test('child.warn prefills context', () => {
      const child = logger.child('WarnChild');
      child.warn('child warn', { detail: 'x' });
      const entry = firstEntry(consoleSpy.warn);
      expect(entry.context).toBe('WarnChild');
      expect(entry.level).toBe('warn');
    });

    test('child.error prefills context and captures error', () => {
      const child = logger.child('ErrChild');
      const err = new Error('child err');
      child.error('oops', err, { extra: true });
      const entry = firstEntry(consoleSpy.error);
      expect(entry.context).toBe('ErrChild');
      expect(entry.error.message).toBe('child err');
    });

    test('child.fatal prefills context', () => {
      const child = logger.child('FatalChild');
      child.fatal('crash', new Error('fatal'));
      const entry = firstEntry(consoleSpy.error);
      expect(entry.context).toBe('FatalChild');
      expect(entry.level).toBe('fatal');
    });

    test('child.debug respects the level filter', () => {
      const child = logger.child('DebugChild');
      child.debug('debug msg');
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    test('child.info metadata is redacted', () => {
      const child = logger.child('SecureChild');
      child.info('secure', { token: 'secret', safe: 'ok' });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata.token).toBe('[REDACTED]');
      expect(entry.metadata.safe).toBe('ok');
    });
  });

  // ── logger.withLogging ───────────────────────────────────────────────────────

  describe('logger.withLogging', () => {
    test('returns the operation result', async () => {
      const result = await logger.withLogging(async () => 42, 'getAnswer', 'TestCtx');
      expect(result).toBe(42);
    });

    test('logs a start message at info level', async () => {
      await logger.withLogging(async () => {}, 'doWork', 'WorkCtx');
      const entries = parseCalls(consoleSpy.info);
      const start = entries.find((e) => e.message.includes('Starting'));
      expect(start).toBeDefined();
      expect(start.message).toContain('doWork');
    });

    test('logs a completion message at info level with durationMs', async () => {
      await logger.withLogging(async () => {}, 'doWork', 'WorkCtx');
      const entries = parseCalls(consoleSpy.info);
      const complete = entries.find((e) => e.message.includes('Completed'));
      expect(complete).toBeDefined();
      expect(complete.message).toContain('doWork');
      expect(typeof complete.metadata.durationMs).toBe('number');
    });

    test('re-throws error from the operation', async () => {
      const boom = new Error('operation failed');
      await expect(
        logger.withLogging(async () => { throw boom; }, 'failing', 'Ctx')
      ).rejects.toBe(boom);
    });

    test('logs error with durationMs when operation throws', async () => {
      await logger.withLogging(
        async () => { throw new Error('fail'); }, 'badOp', 'ErrCtx'
      ).catch(() => {});
      const entries = parseCalls(consoleSpy.error);
      const failed = entries.find((e) => e.message.includes('Failed'));
      expect(failed).toBeDefined();
      expect(failed.level).toBe('error');
      expect(typeof failed.metadata.durationMs).toBe('number');
    });

    test('works without explicit context argument', async () => {
      const result = await logger.withLogging(async () => 'no-ctx');
      expect(result).toBe('no-ctx');
    });

    test('passes through any return value type', async () => {
      const obj = { a: 1, b: [2, 3] };
      const result = await logger.withLogging(async () => obj, 'getObj', 'Ctx');
      expect(result).toBe(obj);
    });
  });

  // ── requestLogger middleware ──────────────────────────────────────────────────

  describe('requestLogger middleware', () => {
    function makeReq(overrides = {}) {
      return {
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        headers: { 'x-request-id': 'req-default', ...overrides.headers },
        ...overrides,
      };
    }

    function makeRes(statusCode = 200) {
      const handlers = {};
      return {
        statusCode,
        setHeader: jest.fn(),
        on(event, fn) { handlers[event] = fn; },
        trigger(event) { if (handlers[event]) handlers[event](); },
      };
    }

    test('calls next()', () => {
      const next = jest.fn();
      requestLogger(makeReq(), makeRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('attaches requestId from x-request-id header to req', () => {
      const req = makeReq({ headers: { 'x-request-id': 'req-attach' } });
      requestLogger(req, makeRes(), () => {});
      expect(req.requestId).toBe('req-attach');
    });

    test('sets X-Request-ID response header', () => {
      const req = makeReq({ headers: { 'x-request-id': 'req-echo' } });
      const res = makeRes();
      requestLogger(req, res, () => {});
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'req-echo');
    });

    test('generates requestId when x-request-id header is absent', () => {
      const req = makeReq({ headers: {} });
      requestLogger(req, makeRes(), () => {});
      expect(req.requestId).toMatch(/^req-\d+-[a-z0-9]+$/);
    });

    test('generated requestId is echoed back in X-Request-ID header', () => {
      const req = makeReq({ headers: {} });
      const res = makeRes();
      requestLogger(req, res, () => {});
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.requestId);
    });

    test('logs request start to console.info', () => {
      requestLogger(makeReq(), makeRes(), () => {});
      const entries = parseCalls(consoleSpy.info);
      const started = entries.find((e) => e.message.includes('started'));
      expect(started).toBeDefined();
    });

    test('request start log includes method, url, requestId', () => {
      const req = makeReq({ method: 'POST', url: '/api/leads', headers: { 'x-request-id': 'req-start-meta' } });
      requestLogger(req, makeRes(), () => {});
      const entries = parseCalls(consoleSpy.info);
      const started = entries.find((e) => e.message.includes('started'));
      expect(started.metadata.method).toBe('POST');
      expect(started.metadata.url).toBe('/api/leads');
      expect(started.metadata.requestId).toBe('req-start-meta');
    });

    test('logs completion to console.info on finish for 2xx', () => {
      const req = makeReq({ headers: { 'x-request-id': 'req-finish' } });
      const res = makeRes(200);
      requestLogger(req, res, () => {});
      consoleSpy.info.mockClear();
      res.trigger('finish');
      const entries = parseCalls(consoleSpy.info);
      const completed = entries.find((e) => e.message.includes('completed'));
      expect(completed).toBeDefined();
      expect(completed.metadata.statusCode).toBe(200);
      expect(completed.metadata.requestId).toBe('req-finish');
    });

    test('completion log includes method, url, durationMs', () => {
      const req = makeReq({ method: 'PUT', url: '/api/agents/1' });
      const res = makeRes(204);
      requestLogger(req, res, () => {});
      consoleSpy.info.mockClear();
      res.trigger('finish');
      const entries = parseCalls(consoleSpy.info);
      const completed = entries.find((e) => e.message.includes('completed'));
      expect(completed.metadata.method).toBe('PUT');
      expect(completed.metadata.url).toBe('/api/agents/1');
      expect(typeof completed.metadata.durationMs).toBe('number');
    });

    test('uses console.warn for 4xx responses on finish', () => {
      const res = makeRes(404);
      requestLogger(makeReq({ headers: {} }), res, () => {});
      res.trigger('finish');
      expect(consoleSpy.warn).toHaveBeenCalled();
      const entry = firstEntry(consoleSpy.warn);
      expect(entry.metadata.statusCode).toBe(404);
    });

    test('uses console.warn for 5xx responses on finish', () => {
      const res = makeRes(500);
      requestLogger(makeReq({ headers: {} }), res, () => {});
      res.trigger('finish');
      expect(consoleSpy.warn).toHaveBeenCalled();
      const entry = firstEntry(consoleSpy.warn);
      expect(entry.metadata.statusCode).toBe(500);
    });

    test('falls back to connection.remoteAddress when req.ip is absent', () => {
      const req = {
        headers: { 'x-request-id': 'req-conn' },
        method: 'GET',
        url: '/conn',
        ip: undefined,
        connection: { remoteAddress: '192.168.1.1' },
      };
      requestLogger(req, makeRes(), () => {});
      const entries = parseCalls(consoleSpy.info);
      const started = entries.find((e) => e.message.includes('started'));
      expect(started.metadata.ip).toBe('192.168.1.1');
    });
  });

  // ── Case-insensitive redaction ────────────────────────────────────────────────

  describe('case-insensitive redaction', () => {
    test('redacts PASSWORD (uppercase key)', () => {
      logger.info('case test', 'Ctx', { PASSWORD: 'secret123', user: 'alice' });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata.PASSWORD).toBe('[REDACTED]');
      expect(entry.metadata.user).toBe('alice');
    });

    test('redacts ApiKey (mixed case key)', () => {
      logger.info('mixed case', 'Ctx', { ApiKey: 'sk-xxx', mode: 'live' });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata.ApiKey).toBe('[REDACTED]');
      expect(entry.metadata.mode).toBe('live');
    });

    test('redacts AUTHORIZATION (all caps key)', () => {
      logger.info('all caps', 'Ctx', { AUTHORIZATION: 'Bearer xyz', path: '/' });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata.AUTHORIZATION).toBe('[REDACTED]');
    });

    test('redacts userToken (partial match, mixed case)', () => {
      logger.info('partial mixed', 'Ctx', { userToken: 'tok_123', id: 5 });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata.userToken).toBe('[REDACTED]');
      expect(entry.metadata.id).toBe(5);
    });
  });

  // ── Primitive and empty metadata ──────────────────────────────────────────────

  describe('primitive and empty metadata', () => {
    test('string metadata passes through unmodified', () => {
      logger.info('string meta', 'Ctx', 'just a string');
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata).toBe('just a string');
    });

    test('number metadata passes through unmodified', () => {
      logger.info('number meta', 'Ctx', 42);
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata).toBe(42);
    });

    test('boolean metadata passes through unmodified', () => {
      logger.info('bool meta', 'Ctx', true);
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata).toBe(true);
    });

    test('empty object metadata is preserved', () => {
      logger.info('empty obj', 'Ctx', {});
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata).toEqual({});
    });

    test('empty array metadata is preserved', () => {
      logger.info('empty arr', 'Ctx', []);
      const entry = firstEntry(consoleSpy.info);
      expect(entry.metadata).toEqual([]);
    });
  });

  // ── Error stack trace environment behavior ────────────────────────────────────

  describe('error stack trace in log entries', () => {
    test('error entry excludes stack in non-development environment (NODE_ENV=test)', () => {
      const err = new Error('no stack leak');
      logger.error('stack test', err, 'Ctx');
      const entry = firstEntry(consoleSpy.error);
      expect(entry.error.stack).toBeUndefined();
    });

    test('error entry includes error.name', () => {
      class CustomError extends Error { constructor(msg) { super(msg); this.name = 'CustomError'; } }
      const err = new CustomError('custom');
      logger.error('custom err', err, 'Ctx');
      const entry = firstEntry(consoleSpy.error);
      expect(entry.error.name).toBe('CustomError');
      expect(entry.error.message).toBe('custom');
    });

    test('error entry always includes name, message, and code fields', () => {
      const err = new Error('full fields');
      err.code = 'EFIELD';
      logger.error('fields test', err, 'Ctx');
      const entry = firstEntry(consoleSpy.error);
      expect(entry.error).toEqual(expect.objectContaining({
        name: 'Error',
        message: 'full fields',
        code: 'EFIELD',
      }));
    });
  });

  // ── requestLogger metadata detail ─────────────────────────────────────────────

  describe('requestLogger metadata detail', () => {
    function makeReq(overrides = {}) {
      return {
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        headers: { 'x-request-id': 'req-meta-test', 'user-agent': 'TestAgent/1.0', ...overrides.headers },
        ...overrides,
      };
    }

    function makeRes(statusCode = 200) {
      const handlers = {};
      return {
        statusCode,
        setHeader: jest.fn(),
        on(event, fn) { handlers[event] = fn; },
        trigger(event) { if (handlers[event]) handlers[event](); },
      };
    }

    test('request start log has context "HTTP"', () => {
      requestLogger(makeReq(), makeRes(), () => {});
      const entries = parseCalls(consoleSpy.info);
      const started = entries.find((e) => e.message.includes('started'));
      expect(started.context).toBe('HTTP');
    });

    test('request start log includes userAgent', () => {
      requestLogger(makeReq(), makeRes(), () => {});
      const entries = parseCalls(consoleSpy.info);
      const started = entries.find((e) => e.message.includes('started'));
      expect(started.metadata.userAgent).toBe('TestAgent/1.0');
    });

    test('completion log has context "HTTP"', () => {
      const res = makeRes(200);
      requestLogger(makeReq(), res, () => {});
      consoleSpy.info.mockClear();
      res.trigger('finish');
      const entries = parseCalls(consoleSpy.info);
      const completed = entries.find((e) => e.message.includes('completed'));
      expect(completed.context).toBe('HTTP');
    });

    test('durationMs in completion is non-negative', () => {
      const res = makeRes(200);
      requestLogger(makeReq(), res, () => {});
      consoleSpy.info.mockClear();
      res.trigger('finish');
      const entries = parseCalls(consoleSpy.info);
      const completed = entries.find((e) => e.message.includes('completed'));
      expect(completed.metadata.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Module exports ────────────────────────────────────────────────────────────

  describe('module exports', () => {
    test('exports logger object and requestLogger function', () => {
      const mod = require('../../lib/logger');
      expect(typeof mod.logger).toBe('object');
      expect(typeof mod.requestLogger).toBe('function');
    });

    test('named and destructured exports are the same references', () => {
      const mod = require('../../lib/logger');
      expect(mod.logger).toBe(logger);
      expect(mod.requestLogger).toBe(requestLogger);
    });

    test('logger has all expected methods', () => {
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.fatal).toBe('function');
      expect(typeof logger.child).toBe('function');
      expect(typeof logger.withLogging).toBe('function');
    });
  });
});
