'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, '..', '..', 'routes', 'check-stuck-pilots.js');
const routeContent = fs.readFileSync(routePath, 'utf8');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

console.log('\n=== route: check-stuck-pilots ===\n');

check('imports the StuckPilotsService service module', () => {
  assert.match(routeContent, /require\('\.\.\/lib\/services\/StuckPilotsService'\)/);
});

check('creates the default stuck pilots service', () => {
  assert.match(routeContent, /createDefaultStuckPilotsService\(\)/);
});

check('delegates to checkAndAlertStuckPilots()', () => {
  assert.match(routeContent, /stuckPilotsService\.checkAndAlertStuckPilots\(\)/);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
