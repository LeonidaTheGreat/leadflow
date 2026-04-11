'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const routePath = path.join(
  __dirname,
  '..',
  '..',
  'app',
  'api',
  'cron',
  'check-stuck-pilots',
  'route.js'
);
const routeContent = fs.readFileSync(routePath, 'utf8');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  PASS ${name}`);
    passed++;
  } catch (error) {
    console.log(`  FAIL ${name}: ${error.message}`);
    failed++;
  }
}

console.log('\n=== app route: check-stuck-pilots ===\n');

check('imports StuckPilotsService module', () => {
  assert.match(routeContent, /from ['"]@\/lib\/services\/StuckPilotsService['"]/);
});

check('creates default stuck pilots service instance', () => {
  assert.match(routeContent, /createDefaultStuckPilotsService\(\)/);
});

check('delegates to checkAndAlertStuckPilots', () => {
  assert.match(routeContent, /stuckPilotsService\.checkAndAlertStuckPilots\(\)/);
});

check('exports GET and POST handlers', () => {
  assert.match(routeContent, /export async function GET/);
  assert.match(routeContent, /export async function POST/);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
