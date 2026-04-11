'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/clawdbot/projects/leadflow';

let passed = 0, failed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`  ✅ ${name}`); }
    catch (e) { failed++; console.error(`  ❌ ${name}: ${e.message}`); }
}

console.log('\n🧪 QC: PR #1158 — Doc generation + Cal.com tests verification\n');

test('SERVICES.md exists at repo root', () => assert.ok(fs.existsSync(path.join(ROOT, 'SERVICES.md'))));
test('SERVICES.md is non-empty (>100 bytes)', () => assert.ok(fs.readFileSync(path.join(ROOT, 'SERVICES.md'), 'utf8').length > 100));
test('SERVICES.md contains CalcomClient', () => assert.ok(fs.readFileSync(path.join(ROOT, 'SERVICES.md'), 'utf8').includes('CalcomClient')));
test('API.md exists at repo root', () => assert.ok(fs.existsSync(path.join(ROOT, 'API.md'))));
test('API.md is non-empty (>100 bytes)', () => assert.ok(fs.readFileSync(path.join(ROOT, 'API.md'), 'utf8').length > 100));
test('CLAUDE.md documents SERVICES.md as auto-generated', () => {
    const c = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
    assert.ok(c.includes('SERVICES.md'), 'SERVICES.md not mentioned');
});
test('CLAUDE.md documents API.md as auto-generated', () => {
    const c = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
    assert.ok(c.includes('API.md'), 'API.md not mentioned');
});
test('E2E test file committed', () => assert.ok(fs.existsSync(path.join(ROOT, 'tests/calcom-class-refactor-e2e.test.js'))));
test('Backcompat unit test committed', () => assert.ok(fs.existsSync(path.join(ROOT, 'tests/unit/calcom-class-backcompat.test.js'))));

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
