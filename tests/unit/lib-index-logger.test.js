'use strict';

/**
 * Unit tests for lib/index.js hub — logger re-exports — Jest format
 *
 * Spec:
 *   What:   lib/index.js — verifies that logger and requestLogger are correctly
 *           re-exported from the hub and are identical references to the direct
 *           imports from lib/logger.js.
 *   Verify: npx jest tests/unit/lib-index-logger.test.js --no-coverage → all pass
 *   Boundaries: lib/index.js, lib/logger.js, lib/errors.js, lib/types are read-only.
 */

const directLogger = require('../../lib/logger');
const hub = require('../../lib/index');

describe('lib/index.js — logger hub re-exports', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Re-export identity ────────────────────────────────────────────────────────

  describe('re-export identity', () => {
    test('hub.logger is the same object as the direct import', () => {
      expect(hub.logger).toBe(directLogger.logger);
    });

    test('hub.requestLogger is the same function as the direct import', () => {
      expect(hub.requestLogger).toBe(directLogger.requestLogger);
    });

    test('hub exports logger as an object', () => {
      expect(typeof hub.logger).toBe('object');
    });

    test('hub exports requestLogger as a function', () => {
      expect(typeof hub.requestLogger).toBe('function');
    });
  });

  // ── Logger functional via hub ─────────────────────────────────────────────────

  describe('logger functional via hub', () => {
    function firstEntry(spy) {
      expect(spy).toHaveBeenCalled();
      return JSON.parse(spy.mock.calls[0][0]);
    }

    test('hub.logger.info writes JSON to console.info', () => {
      hub.logger.info('hub info test', 'HubCtx', { key: 'val' });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.level).toBe('info');
      expect(entry.message).toBe('hub info test');
      expect(entry.service).toBe('leadflow-api');
    });

    test('hub.logger.warn writes to console.warn', () => {
      hub.logger.warn('hub warn test', 'HubCtx');
      const entry = firstEntry(consoleSpy.warn);
      expect(entry.level).toBe('warn');
    });

    test('hub.logger.error writes to console.error with error details', () => {
      const err = new Error('hub error');
      hub.logger.error('hub error test', err, 'HubCtx');
      const entry = firstEntry(consoleSpy.error);
      expect(entry.level).toBe('error');
      expect(entry.error.message).toBe('hub error');
    });

    test('hub.logger.fatal writes to console.error', () => {
      hub.logger.fatal('hub fatal test', new Error('fatal'));
      const entry = firstEntry(consoleSpy.error);
      expect(entry.level).toBe('fatal');
    });

    test('hub.logger.child returns a child logger with prefilled context', () => {
      const child = hub.logger.child('HubChild');
      child.info('child via hub', { x: 1 });
      const entry = firstEntry(consoleSpy.info);
      expect(entry.context).toBe('HubChild');
    });

    test('hub.logger.withLogging resolves operation result', async () => {
      const result = await hub.logger.withLogging(async () => 'hub-result', 'hubOp', 'HubCtx');
      expect(result).toBe('hub-result');
    });
  });

  // ── requestLogger functional via hub ─────────────────────────────────────────

  describe('requestLogger functional via hub', () => {
    function makeReq(overrides = {}) {
      return {
        method: 'GET',
        url: '/hub-test',
        ip: '127.0.0.1',
        headers: { 'x-request-id': 'hub-req-1', ...overrides.headers },
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

    test('hub.requestLogger calls next()', () => {
      const next = jest.fn();
      hub.requestLogger(makeReq(), makeRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('hub.requestLogger attaches requestId to req', () => {
      const req = makeReq({ headers: { 'x-request-id': 'hub-attach' } });
      hub.requestLogger(req, makeRes(), () => {});
      expect(req.requestId).toBe('hub-attach');
    });

    test('hub.requestLogger sets X-Request-ID response header', () => {
      const req = makeReq({ headers: { 'x-request-id': 'hub-header' } });
      const res = makeRes();
      hub.requestLogger(req, res, () => {});
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'hub-header');
    });
  });

  // ── Other hub exports are present ────────────────────────────────────────────

  describe('other hub exports (spot-check hub wiring)', () => {
    test('hub exports error classes', () => {
      expect(typeof hub.LeadFlowError).toBe('function');
      expect(typeof hub.ValidationError).toBe('function');
      expect(typeof hub.AuthenticationError).toBe('function');
      expect(typeof hub.NotFoundError).toBe('function');
    });

    test('hub exports middleware helpers', () => {
      expect(typeof hub.errorHandler).toBe('function');
      expect(typeof hub.asyncHandler).toBe('function');
      expect(typeof hub.requireAuth).toBe('function');
    });

    test('hub exports types', () => {
      expect(hub.types).toBeDefined();
    });
  });
});
