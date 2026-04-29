'use strict';

/**
 * E2E verification: logger hub wiring and core behaviors
 * Verifies the deliverables from PR #1369 (task 57d23baa)
 */

const { logger, requestLogger } = require('../lib/logger');
const hub = require('../lib/index');
const { getRequestId } = require('../lib/request-context');

describe('logger hub wiring — E2E', () => {
  beforeEach(() => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  test('hub.logger and hub.requestLogger are the same references as direct imports', () => {
    expect(hub.logger).toBe(logger);
    expect(hub.requestLogger).toBe(requestLogger);
  });

  test('logger.info emits structured JSON with expected fields', () => {
    logger.info('e2e check', 'E2ECtx', { test: true });
    const entry = JSON.parse(console.info.mock.calls[0][0]);
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('e2e check');
    expect(entry.context).toBe('E2ECtx');
    expect(entry.service).toBe('leadflow-api');
    expect(entry.metadata.test).toBe(true);
    expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
  });

  test('logger redacts sensitive fields and does not mutate original object', () => {
    const meta = { token: 'secret123', safe: 'ok' };
    logger.info('redact test', 'Ctx', meta);
    const entry = JSON.parse(console.info.mock.calls[0][0]);
    expect(entry.metadata.token).toBe('[REDACTED]');
    expect(entry.metadata.safe).toBe('ok');
    expect(meta.token).toBe('secret123');
  });

  test('requestLogger attaches requestId and sets response header', () => {
    const req = { method: 'GET', url: '/e2e', ip: '127.0.0.1', headers: { 'x-request-id': 'e2e-1' } };
    const res = { statusCode: 200, setHeader: jest.fn(), on: jest.fn() };
    requestLogger(req, res, () => {});
    expect(req.requestId).toBe('e2e-1');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'e2e-1');
  });
});
