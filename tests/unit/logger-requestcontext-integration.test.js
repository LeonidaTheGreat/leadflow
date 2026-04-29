'use strict';

/**
 * Integration tests: requestLogger + request-context — Jest format
 *
 * Spec:
 *   What:   lib/logger.js requestLogger + lib/request-context.js AsyncLocalStorage seam.
 *           Verifies that requestLogger threads requestId into the async context so
 *           getRequestId() returns the correct value inside a live request handler.
 *   Verify: npx jest tests/unit/logger-requestcontext-integration.test.js --no-coverage → all pass
 *   Boundaries: lib/logger.js and lib/request-context.js are read-only.
 */

const http = require('http');
const { requestLogger } = require('../../lib/logger');
const { getRequestId, getRequestContext } = require('../../lib/request-context');

function makeRequest(server, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method: 'GET', headers },
      (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, () => resolve(server));
  });
}

describe('requestLogger + request-context integration', () => {
  beforeEach(() => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getRequestId() returns x-request-id header value inside requestLogger scope', async () => {
    let capturedId = null;
    const server = await startServer((req, res) => {
      requestLogger(req, res, () => {
        capturedId = getRequestId();
        res.writeHead(200);
        res.end('ok');
      });
    });
    try {
      await makeRequest(server, '/', { 'x-request-id': 'req-integration-1' });
      expect(capturedId).toBe('req-integration-1');
    } finally {
      server.close();
    }
  });

  test('getRequestContext() inside requestLogger scope has requestId set', async () => {
    let capturedCtx = null;
    const server = await startServer((req, res) => {
      requestLogger(req, res, () => {
        capturedCtx = getRequestContext();
        res.writeHead(200);
        res.end('ok');
      });
    });
    try {
      await makeRequest(server, '/ctx', { 'x-request-id': 'req-ctx-2' });
      expect(capturedCtx).toBeTruthy();
      expect(capturedCtx.requestId).toBe('req-ctx-2');
    } finally {
      server.close();
    }
  });

  test('X-Request-ID response header echoes the input x-request-id', async () => {
    const server = await startServer((req, res) => {
      requestLogger(req, res, () => {
        res.writeHead(200);
        res.end('ok');
      });
    });
    try {
      const response = await makeRequest(server, '/echo', { 'x-request-id': 'req-echo-3' });
      expect(response.headers['x-request-id']).toBe('req-echo-3');
    } finally {
      server.close();
    }
  });

  test('getRequestId() returns a generated req-* id when no x-request-id header is sent', async () => {
    let capturedId = null;
    const server = await startServer((req, res) => {
      requestLogger(req, res, () => {
        capturedId = getRequestId();
        res.writeHead(200);
        res.end('ok');
      });
    });
    try {
      await makeRequest(server, '/no-header');
      expect(capturedId).toMatch(/^req-\d+-[a-z0-9]+$/);
    } finally {
      server.close();
    }
  });

  test('request context does not leak between sequential requests', async () => {
    const capturedIds = [];
    const server = await startServer((req, res) => {
      requestLogger(req, res, () => {
        capturedIds.push(getRequestId());
        res.writeHead(200);
        res.end('ok');
      });
    });
    try {
      await makeRequest(server, '/r1', { 'x-request-id': 'req-isolation-A' });
      await makeRequest(server, '/r2', { 'x-request-id': 'req-isolation-B' });
      expect(capturedIds).toHaveLength(2);
      expect(capturedIds[0]).toBe('req-isolation-A');
      expect(capturedIds[1]).toBe('req-isolation-B');
    } finally {
      server.close();
    }
  });

  test('getRequestId() outside requestLogger scope returns a bg-* fallback id', () => {
    const id = getRequestId();
    expect(id).toMatch(/^(req-|bg-)/);
  });
});
