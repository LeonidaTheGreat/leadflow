'use strict';

/*
 * Spec:
 *   What:   tests/logger.test.js — Jest tests for lib/logger.js hub module.
 *           Covers all exported symbols: logger.{debug,info,warn,error,fatal,child,withLogging}
 *           and requestLogger Express middleware.
 *   Verify: npx jest tests/logger.test.js --no-coverage → all green, exit 0
 *   Boundaries: lib/logger.js is read-only. No other files created or modified.
 */

const { logger, requestLogger } = require('../lib/logger');

describe('lib/logger', () => {
  let spies;

  beforeEach(() => {
    spies = {
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
      info:  jest.spyOn(console, 'info').mockImplementation(() => {}),
      warn:  jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function parseFirst(spy) {
    expect(spy).toHaveBeenCalled();
    return JSON.parse(spy.mock.calls[0][0]);
  }

  function parseCalls(spy) {
    return spy.mock.calls.map((args) => JSON.parse(args[0]));
  }

  // ── module exports ───────────────────────────────────────────────────────────

  describe('module exports', () => {
    test('exports logger object', () => {
      const mod = require('../lib/logger');
      expect(typeof mod.logger).toBe('object');
    });

    test('exports requestLogger function', () => {
      const mod = require('../lib/logger');
      expect(typeof mod.requestLogger).toBe('function');
    });

    test('named exports equal destructured exports', () => {
      const mod = require('../lib/logger');
      expect(mod.logger).toBe(logger);
      expect(mod.requestLogger).toBe(requestLogger);
    });

    test('logger has all expected methods', () => {
      for (const method of ['debug', 'info', 'warn', 'error', 'fatal', 'child', 'withLogging']) {
        expect(typeof logger[method]).toBe('function');
      }
    });
  });

  // ── logger.info ──────────────────────────────────────────────────────────────

  describe('logger.info', () => {
    test('writes JSON to console.info', () => {
      logger.info('hello', 'Ctx', { k: 'v' });
      const e = parseFirst(spies.info);
      expect(e.level).toBe('info');
      expect(e.message).toBe('hello');
      expect(e.context).toBe('Ctx');
      expect(e.service).toBe('leadflow-api');
      expect(e.timestamp).toBeDefined();
      expect(e.metadata).toEqual({ k: 'v' });
    });

    test('no error field when no error provided', () => {
      logger.info('ok', 'Ctx');
      expect(parseFirst(spies.info).error).toBeUndefined();
    });

    test('includes environment field', () => {
      logger.info('env', 'Ctx');
      expect(parseFirst(spies.info).environment).toBeDefined();
    });

    test('one console call per log call', () => {
      logger.info('a', 'Ctx');
      logger.info('b', 'Ctx');
      expect(spies.info).toHaveBeenCalledTimes(2);
    });

    test('timestamp is valid ISO string', () => {
      logger.info('ts', 'Ctx');
      const { timestamp } = parseFirst(spies.info);
      expect(new Date(timestamp).getTime()).not.toBeNaN();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('output is valid JSON', () => {
      logger.info('json', 'Ctx', { x: 1 });
      expect(() => JSON.parse(spies.info.mock.calls[0][0])).not.toThrow();
    });
  });

  // ── logger.warn ──────────────────────────────────────────────────────────────

  describe('logger.warn', () => {
    test('writes JSON to console.warn with level=warn', () => {
      logger.warn('caution', 'WarnCtx', { detail: 1 });
      const e = parseFirst(spies.warn);
      expect(e.level).toBe('warn');
      expect(e.message).toBe('caution');
    });

    test('includes error fields when error passed', () => {
      const err = new Error('warn err');
      err.code = 'EWARN';
      logger.warn('with err', 'Ctx', {}, err);
      const e = parseFirst(spies.warn);
      expect(e.error.name).toBe('Error');
      expect(e.error.message).toBe('warn err');
      expect(e.error.code).toBe('EWARN');
    });

    test('no error field when no error passed', () => {
      logger.warn('no err', 'Ctx');
      expect(parseFirst(spies.warn).error).toBeUndefined();
    });
  });

  // ── logger.error ─────────────────────────────────────────────────────────────

  describe('logger.error', () => {
    test('writes JSON to console.error with level=error', () => {
      const err = new Error('boom');
      logger.error('failed', err, 'ErrCtx', { id: 1 });
      const e = parseFirst(spies.error);
      expect(e.level).toBe('error');
      expect(e.message).toBe('failed');
      expect(e.error.name).toBe('Error');
      expect(e.error.message).toBe('boom');
      expect(e.context).toBe('ErrCtx');
    });

    test('error.code undefined when error has no code', () => {
      logger.error('no code', new Error('x'), 'Ctx');
      expect(parseFirst(spies.error).error.code).toBeUndefined();
    });

    test('handles null error (no error field in entry)', () => {
      logger.error('null err', null, 'Ctx');
      expect(spies.error).toHaveBeenCalled();
      expect(parseFirst(spies.error).error).toBeUndefined();
    });

    test('includes context and metadata', () => {
      logger.error('ctx', new Error('e'), 'MyCtx', { userId: 7 });
      const e = parseFirst(spies.error);
      expect(e.context).toBe('MyCtx');
      expect(e.metadata.userId).toBe(7);
    });
  });

  // ── logger.fatal ─────────────────────────────────────────────────────────────

  describe('logger.fatal', () => {
    test('writes level=fatal to console.error channel', () => {
      logger.fatal('crash', new Error('fatal'), 'FatalCtx');
      const e = parseFirst(spies.error);
      expect(e.level).toBe('fatal');
      expect(e.message).toBe('crash');
    });

    test('always logs regardless of level filter', () => {
      logger.fatal('always');
      expect(spies.error).toHaveBeenCalledTimes(1);
    });

    test('does not write to info or warn channels', () => {
      logger.fatal('only error', new Error('e'));
      expect(spies.info).not.toHaveBeenCalled();
      expect(spies.warn).not.toHaveBeenCalled();
    });

    test('includes error details when error provided', () => {
      const err = new Error('fatal err');
      err.code = 'EFATAL';
      logger.fatal('crash', err, 'Ctx');
      const e = parseFirst(spies.error);
      expect(e.error.message).toBe('fatal err');
      expect(e.error.code).toBe('EFATAL');
    });
  });

  // ── logger.debug ─────────────────────────────────────────────────────────────

  describe('logger.debug', () => {
    test('filtered when default minLevel is info', () => {
      logger.debug('debug msg', 'Ctx', { x: 1 });
      expect(spies.debug).not.toHaveBeenCalled();
    });
  });

  // ── sensitive data redaction ──────────────────────────────────────────────────

  describe('sensitive data redaction', () => {
    test('redacts password', () => {
      logger.info('login', 'Auth', { password: 'secret', user: 'alice' });
      const e = parseFirst(spies.info);
      expect(e.metadata.password).toBe('[REDACTED]');
      expect(e.metadata.user).toBe('alice');
    });

    test('redacts token', () => {
      logger.info('auth', 'Auth', { token: 'abc', userId: 1 });
      const e = parseFirst(spies.info);
      expect(e.metadata.token).toBe('[REDACTED]');
      expect(e.metadata.userId).toBe(1);
    });

    test('redacts apiKey', () => {
      logger.info('init', 'Ctx', { apiKey: 'sk-xxx', service: 'stripe' });
      const e = parseFirst(spies.info);
      expect(e.metadata.apiKey).toBe('[REDACTED]');
      expect(e.metadata.service).toBe('stripe');
    });

    test('redacts secret', () => {
      logger.info('sec', 'Ctx', { secret: 'val', other: 'ok' });
      const e = parseFirst(spies.info);
      expect(e.metadata.secret).toBe('[REDACTED]');
      expect(e.metadata.other).toBe('ok');
    });

    test('redacts authorization (partial key match)', () => {
      logger.info('req', 'HTTP', { authorizationHeader: 'Bearer xyz', path: '/api' });
      const e = parseFirst(spies.info);
      expect(e.metadata.authorizationHeader).toBe('[REDACTED]');
      expect(e.metadata.path).toBe('/api');
    });

    test('redacts cookie', () => {
      logger.info('req', 'HTTP', { cookie: 'session=abc', method: 'GET' });
      const e = parseFirst(spies.info);
      expect(e.metadata.cookie).toBe('[REDACTED]');
      expect(e.metadata.method).toBe('GET');
    });

    test('redacts credit_card', () => {
      logger.info('pay', 'Billing', { credit_card: '4111', amount: 100 });
      const e = parseFirst(spies.info);
      expect(e.metadata.credit_card).toBe('[REDACTED]');
      expect(e.metadata.amount).toBe(100);
    });

    test('redacts nested sensitive fields recursively', () => {
      logger.info('nested', 'Ctx', { user: { token: 'secret', name: 'bob' } });
      const e = parseFirst(spies.info);
      expect(e.metadata.user.token).toBe('[REDACTED]');
      expect(e.metadata.user.name).toBe('bob');
    });

    test('does not mutate the original metadata object', () => {
      const meta = { token: 'abc', safe: 'val' };
      logger.info('immutable', 'Ctx', meta);
      expect(meta.token).toBe('abc');
    });

    test('handles null metadata without error', () => {
      expect(() => logger.info('null', 'Ctx', null)).not.toThrow();
      expect(parseFirst(spies.info).metadata).toBeNull();
    });

    test('handles undefined metadata without error', () => {
      expect(() => logger.info('undef', 'Ctx')).not.toThrow();
      expect(parseFirst(spies.info).metadata).toBeUndefined();
    });

    test('handles array metadata with nested sensitive fields', () => {
      logger.info('arr', 'Ctx', [{ token: 'secret', safe: 'ok' }]);
      const e = parseFirst(spies.info);
      expect(e.metadata[0].token).toBe('[REDACTED]');
      expect(e.metadata[0].safe).toBe('ok');
    });
  });

  // ── logger.child ──────────────────────────────────────────────────────────────

  describe('logger.child', () => {
    test('returns object with all log methods', () => {
      const child = logger.child('ChildCtx');
      for (const m of ['debug', 'info', 'warn', 'error', 'fatal']) {
        expect(typeof child[m]).toBe('function');
      }
    });

    test('child.info prefills context', () => {
      logger.child('ChildCtx').info('msg', { extra: 1 });
      const e = parseFirst(spies.info);
      expect(e.context).toBe('ChildCtx');
      expect(e.message).toBe('msg');
    });

    test('child.warn prefills context', () => {
      logger.child('WarnChild').warn('warn msg', { d: 'x' });
      const e = parseFirst(spies.warn);
      expect(e.context).toBe('WarnChild');
      expect(e.level).toBe('warn');
    });

    test('child.error prefills context and captures error', () => {
      const err = new Error('child err');
      logger.child('ErrChild').error('oops', err, { extra: true });
      const e = parseFirst(spies.error);
      expect(e.context).toBe('ErrChild');
      expect(e.error.message).toBe('child err');
    });

    test('child.fatal prefills context', () => {
      logger.child('FatalChild').fatal('crash', new Error('fatal'));
      const e = parseFirst(spies.error);
      expect(e.context).toBe('FatalChild');
      expect(e.level).toBe('fatal');
    });

    test('child.debug respects level filter', () => {
      logger.child('DebugChild').debug('silent');
      expect(spies.debug).not.toHaveBeenCalled();
    });

    test('child metadata is redacted', () => {
      logger.child('SecureCtx').info('secure', { token: 'secret', safe: 'ok' });
      const e = parseFirst(spies.info);
      expect(e.metadata.token).toBe('[REDACTED]');
      expect(e.metadata.safe).toBe('ok');
    });
  });

  // ── logger.withLogging ───────────────────────────────────────────────────────

  describe('logger.withLogging', () => {
    test('returns the operation result', async () => {
      const result = await logger.withLogging(async () => 42, 'getAnswer', 'Ctx');
      expect(result).toBe(42);
    });

    test('logs Starting message at info level', async () => {
      await logger.withLogging(async () => {}, 'doWork', 'WorkCtx');
      const entries = parseCalls(spies.info);
      const start = entries.find((e) => e.message.includes('Starting'));
      expect(start).toBeDefined();
      expect(start.message).toContain('doWork');
    });

    test('logs Completed message with durationMs', async () => {
      await logger.withLogging(async () => {}, 'doWork', 'WorkCtx');
      const entries = parseCalls(spies.info);
      const done = entries.find((e) => e.message.includes('Completed'));
      expect(done).toBeDefined();
      expect(typeof done.metadata.durationMs).toBe('number');
    });

    test('re-throws error from the operation', async () => {
      const boom = new Error('op failed');
      await expect(
        logger.withLogging(async () => { throw boom; }, 'failing', 'Ctx')
      ).rejects.toBe(boom);
    });

    test('logs Failed message with durationMs when operation throws', async () => {
      await logger.withLogging(
        async () => { throw new Error('fail'); }, 'badOp', 'Ctx'
      ).catch(() => {});
      const entries = parseCalls(spies.error);
      const failed = entries.find((e) => e.message.includes('Failed'));
      expect(failed).toBeDefined();
      expect(failed.level).toBe('error');
      expect(typeof failed.metadata.durationMs).toBe('number');
    });

    test('works without explicit context argument', async () => {
      const result = await logger.withLogging(async () => 'ok');
      expect(result).toBe('ok');
    });

    test('passes through any return value type', async () => {
      const obj = { a: 1 };
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
        headers: { 'x-request-id': 'req-default', ...((overrides.headers) || {}) },
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

    test('attaches requestId from x-request-id header', () => {
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

    test('generated requestId echoed in X-Request-ID header', () => {
      const req = makeReq({ headers: {} });
      const res = makeRes();
      requestLogger(req, res, () => {});
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.requestId);
    });

    test('logs request start to console.info', () => {
      requestLogger(makeReq(), makeRes(), () => {});
      const entries = parseCalls(spies.info);
      expect(entries.some((e) => e.message.includes('started'))).toBe(true);
    });

    test('request start log includes method, url, requestId', () => {
      const req = makeReq({ method: 'POST', url: '/api/leads', headers: { 'x-request-id': 'req-meta' } });
      requestLogger(req, makeRes(), () => {});
      const e = parseCalls(spies.info).find((x) => x.message.includes('started'));
      expect(e.metadata.method).toBe('POST');
      expect(e.metadata.url).toBe('/api/leads');
      expect(e.metadata.requestId).toBe('req-meta');
    });

    test('logs completion to console.info on finish for 2xx', () => {
      const req = makeReq({ headers: { 'x-request-id': 'req-finish' } });
      const res = makeRes(200);
      requestLogger(req, res, () => {});
      spies.info.mockClear();
      res.trigger('finish');
      const entries = parseCalls(spies.info);
      const completed = entries.find((e) => e.message.includes('completed'));
      expect(completed).toBeDefined();
      expect(completed.metadata.statusCode).toBe(200);
      expect(completed.metadata.requestId).toBe('req-finish');
    });

    test('completion log includes method, url, durationMs', () => {
      const req = makeReq({ method: 'PUT', url: '/api/agents/1' });
      const res = makeRes(204);
      requestLogger(req, res, () => {});
      spies.info.mockClear();
      res.trigger('finish');
      const e = parseCalls(spies.info).find((x) => x.message.includes('completed'));
      expect(e.metadata.method).toBe('PUT');
      expect(e.metadata.url).toBe('/api/agents/1');
      expect(typeof e.metadata.durationMs).toBe('number');
    });

    test('uses console.warn for 4xx responses', () => {
      const res = makeRes(404);
      requestLogger(makeReq({ headers: {} }), res, () => {});
      res.trigger('finish');
      expect(spies.warn).toHaveBeenCalled();
      expect(parseFirst(spies.warn).metadata.statusCode).toBe(404);
    });

    test('uses console.warn for 5xx responses', () => {
      const res = makeRes(500);
      requestLogger(makeReq({ headers: {} }), res, () => {});
      res.trigger('finish');
      expect(spies.warn).toHaveBeenCalled();
      expect(parseFirst(spies.warn).metadata.statusCode).toBe(500);
    });

    test('falls back to connection.remoteAddress when req.ip absent', () => {
      const req = {
        headers: { 'x-request-id': 'req-conn' },
        method: 'GET',
        url: '/conn',
        ip: undefined,
        connection: { remoteAddress: '192.168.1.1' },
      };
      requestLogger(req, makeRes(), () => {});
      const e = parseCalls(spies.info).find((x) => x.message.includes('started'));
      expect(e.metadata.ip).toBe('192.168.1.1');
    });
  });
});
