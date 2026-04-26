/**
 * Spec
 * What: tests/logger.test.js — entry point running all logger test suites
 *   Suites:
 *     - tests/unit/logger.test.js         (unit: 37 tests — all exported symbols)
 *     - tests/unit/logger-requestcontext-integration.test.js (5 integration tests)
 *   Files touched: tests/logger.test.js (create only)
 * Verify: node tests/logger.test.js → exit 0, 100% pass rate
 * Boundaries: lib/logger.js and existing unit tests are read-only. No other files touched.
 *
 * lib/logger.js exports: { logger, requestLogger }
 *   logger.{debug,info,warn,error,fatal,child,withLogging}
 *   requestLogger — Express middleware
 */

'use strict';

const path = require('path');

const SUITES = [
  {
    name: 'Unit: lib/logger.js — all exported symbols',
    file: path.join(__dirname, 'unit', 'logger.test.js'),
  },
  {
    name: 'Integration: requestLogger + request-context',
    file: path.join(__dirname, 'unit', 'logger-requestcontext-integration.test.js'),
  },
];

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Logger Test Suite — tests/logger.test.js           ║');
  console.log('║  Module: lib/logger.js  |  Dependents: 17          ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of SUITES) {
    console.log(`\n── ${suite.name} ──`);
    const { runTests } = require(suite.file);
    const result = await runTests();
    totalPassed += result.passed;
    totalFailed += result.failed;
  }

  const total = totalPassed + totalFailed;
  const rate = total > 0 ? totalPassed / total : 1;

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                 COMBINED RESULTS                    ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Passed:    ${totalPassed} / ${total}`);
  console.log(`  Failed:    ${totalFailed}`);
  console.log(`  Pass rate: ${(rate * 100).toFixed(0)}%`);
  console.log('');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
