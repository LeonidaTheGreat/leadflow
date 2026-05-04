'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', '..', relPath), 'utf8');
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    return true;
  } catch (error) {
    console.error(`  ❌ ${name}: ${error.message}`);
    return false;
  }
}

console.log('\nWeak randomness regression checks\n');

const loggerSource = read('lib/logger.js');
const requestContextSource = read('lib/request-context.js');
const circuitBreakerSource = read('lib/utils/circuit-breaker.js');

const results = [];
results.push(test('logger requestId does not use Math.random', () => {
  assert.ok(!loggerSource.includes('Math.random('), 'Math.random found in lib/logger.js');
  assert.ok(loggerSource.includes('crypto.randomBytes(5)'), 'crypto.randomBytes(5) not found in lib/logger.js');
}));

results.push(test('request-context synthetic requestId does not use Math.random', () => {
  assert.ok(!requestContextSource.includes('Math.random('), 'Math.random found in lib/request-context.js');
  assert.ok(requestContextSource.includes('crypto.randomBytes(3)'), 'crypto.randomBytes(3) not found in lib/request-context.js');
}));

results.push(test('circuit-breaker retry jitter does not use Math.random', () => {
  assert.ok(!circuitBreakerSource.includes('Math.random('), 'Math.random found in lib/utils/circuit-breaker.js');
  assert.ok(circuitBreakerSource.includes('crypto.randomInt(0, 2001)'), 'crypto.randomInt(0, 2001) not found in lib/utils/circuit-breaker.js');
}));

const passed = results.filter(Boolean).length;
const total = results.length;

console.log(`\nPassed ${passed}/${total} checks`);
process.exit(passed === total ? 0 : 1);
