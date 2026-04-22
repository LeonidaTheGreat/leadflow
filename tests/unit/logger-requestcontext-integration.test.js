'use strict';

/**
 * Integration test: requestLogger + request-context seam
 * Verifies that requestLogger correctly threads requestId into AsyncLocalStorage
 * so getRequestId() returns the right value during an active request.
 */

const assert = require('assert');
const http = require('http');
const { requestLogger } = require('../../lib/logger');
const { getRequestId, getRequestContext } = require('../../lib/request-context');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        passed++;
        console.log(`  ✅ ${name}`);
      }).catch((err) => {
        failed++;
        console.log(`  ❌ ${name}: ${err.message}`);
      });
    }
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ❌ ${name}: ${err.message}`);
  }
  return Promise.resolve();
}

function makeRequest(server, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: addr.port,
      path,
      method: 'GET',
      headers,
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Integration: requestLogger + request-context       ║');
  console.log('║  Task: 61c092e5-d8da-4e84-bbf1-9cc3027611bc        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── Test 1: getRequestId() inside requestLogger scope returns header value ──

  await test('getRequestId() returns x-request-id header value inside requestLogger scope', async () => {
    let capturedId = null;
    const server = http.createServer((req, res) => {
      requestLogger(req, res, () => {
        capturedId = getRequestId();
        res.writeHead(200);
        res.end('ok');
      });
    });
    server.listen(0);
    try {
      await makeRequest(server, '/', { 'x-request-id': 'req-integration-test-1' });
      assert.strictEqual(capturedId, 'req-integration-test-1');
    } finally {
      server.close();
    }
  });

  // ── Test 2: getRequestContext() inside scope contains the requestId ──

  await test('getRequestContext() inside requestLogger scope has requestId set', async () => {
    let capturedCtx = null;
    const server = http.createServer((req, res) => {
      requestLogger(req, res, () => {
        capturedCtx = getRequestContext();
        res.writeHead(200);
        res.end('ok');
      });
    });
    server.listen(0);
    try {
      await makeRequest(server, '/ctx', { 'x-request-id': 'req-ctx-test-2' });
      assert.ok(capturedCtx, 'context should not be empty');
      assert.strictEqual(capturedCtx.requestId, 'req-ctx-test-2');
    } finally {
      server.close();
    }
  });

  // ── Test 3: X-Request-ID response header echoes the input header ──

  await test('response X-Request-ID header echoes the input x-request-id', async () => {
    const server = http.createServer((req, res) => {
      requestLogger(req, res, () => {
        res.writeHead(200);
        res.end('ok');
      });
    });
    server.listen(0);
    try {
      const response = await makeRequest(server, '/echo', { 'x-request-id': 'req-echo-test-3' });
      assert.strictEqual(response.headers['x-request-id'], 'req-echo-test-3');
    } finally {
      server.close();
    }
  });

  // ── Test 4: generated requestId is threaded correctly when no header ──

  await test('getRequestId() returns a generated req-* id when no x-request-id header sent', async () => {
    let capturedId = null;
    const server = http.createServer((req, res) => {
      requestLogger(req, res, () => {
        capturedId = getRequestId();
        res.writeHead(200);
        res.end('ok');
      });
    });
    server.listen(0);
    try {
      await makeRequest(server, '/no-header');
      assert.ok(capturedId, 'requestId should be generated');
      assert.match(capturedId, /^req-\d+-[a-z0-9]+$/);
    } finally {
      server.close();
    }
  });

  // ── Test 5: context is NOT leaked between requests ──

  await test('request context does not leak between sequential requests', async () => {
    const capturedIds = [];
    const server = http.createServer((req, res) => {
      requestLogger(req, res, () => {
        capturedIds.push(getRequestId());
        res.writeHead(200);
        res.end('ok');
      });
    });
    server.listen(0);
    try {
      await makeRequest(server, '/r1', { 'x-request-id': 'req-isolation-A' });
      await makeRequest(server, '/r2', { 'x-request-id': 'req-isolation-B' });
      assert.strictEqual(capturedIds.length, 2);
      assert.strictEqual(capturedIds[0], 'req-isolation-A');
      assert.strictEqual(capturedIds[1], 'req-isolation-B');
    } finally {
      server.close();
    }
  });

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                          ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  const rate = (passed + failed) > 0 ? passed / (passed + failed) : 1;
  console.log(`  📈 Pass rate: ${(rate * 100).toFixed(0)}%`);
  console.log('');

  return { passed, failed, total: passed + failed, passRate: rate };
}

module.exports = { runTests };

if (require.main === module) {
  runTests()
    .then((result) => {
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Test runner error:', err);
      process.exit(1);
    });
}
