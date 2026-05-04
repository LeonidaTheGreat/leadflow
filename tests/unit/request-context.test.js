/**
 * Spec
 * What:
 * - Add tests in tests/unit/request-context.test.js for lib/request-context.js.
 * - Verify getRequestContext() returns an empty object outside AsyncLocalStorage scope.
 * - Verify getRequestContext() returns the active store object inside requestContext.run(...).
 * - Verify getRequestId() returns the active requestId inside scope and generates a synthetic bg-* id outside scope.
 * - Verify nested async work (setTimeout) preserves the request context.
 * Verify:
 * - Run: node tests/unit/request-context.test.js
 * - Expected: exit code 0, all tests logged as passing, summary shows 100% pass rate.
 * - Grep check: grep -n "request-context" tests/unit/request-context.test.js
 * Boundaries:
 * - Do not change lib/request-context.js behavior.
 * - Do not modify unrelated hubs, app code, or package scripts.
 * - Do not touch protected/generated files listed in the task instructions.
 */

'use strict';

const assert = require('assert');
const {
  requestContext,
  getRequestContext,
  getRequestId,
} = require('../../lib/request-context');

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

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Unit Tests: request-context                        ║');
  console.log('║  Task: 6f13c2f7-ae20-4623-89b9-98663344703b         ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  await test('getRequestContext returns empty object outside request scope', () => {
    assert.deepStrictEqual(getRequestContext(), {});
  });

  await test('getRequestContext returns the active AsyncLocalStorage store', async () => {
    const store = { requestId: 'req-123', leadId: 'lead-456' };

    await new Promise((resolve, reject) => {
      requestContext.run(store, () => {
        try {
          assert.strictEqual(getRequestContext(), store);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  await test('getRequestId returns requestId from the active context', async () => {
    await new Promise((resolve, reject) => {
      requestContext.run({ requestId: 'req-active-789' }, () => {
        try {
          assert.strictEqual(getRequestId(), 'req-active-789');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  await test('getRequestId generates a synthetic bg id outside request scope', () => {
    const requestId = getRequestId();
    assert.match(requestId, /^bg-\d+-[a-f0-9]{6}$/);
  });

  await test('request context is preserved across async boundaries', async () => {
    await new Promise((resolve, reject) => {
      requestContext.run({ requestId: 'req-async-321', source: 'unit-test' }, () => {
        setTimeout(() => {
          try {
            assert.deepStrictEqual(getRequestContext(), {
              requestId: 'req-async-321',
              source: 'unit-test',
            });
            assert.strictEqual(getRequestId(), 'req-async-321');
            resolve();
          } catch (error) {
            reject(error);
          }
        }, 0);
      });
    });
  });

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
