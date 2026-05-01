'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${err.message}`);
    failed++;
  }
}

console.log('\n=== uc-marketing-campaign-launch workflow task registration ===\n');

const tasksPath = path.join(root, '.local-tasks.json');
const specPath = path.join(root, 'docs/task-specs/uc-marketing-campaign-launch-workflow-task.md');

let tasks;

test('`.local-tasks.json` is valid JSON', () => {
  const raw = fs.readFileSync(tasksPath, 'utf8');
  tasks = JSON.parse(raw);
  assert.ok(Array.isArray(tasks), 'expected array');
});

test('Exactly one task with id `uc-marketing-campaign-launch-workflow-task`', () => {
  const matches = tasks.filter(t => t.id === 'uc-marketing-campaign-launch-workflow-task');
  assert.strictEqual(matches.length, 1, `found ${matches.length} matching tasks`);
});

test('Task `spec_path` points to correct file', () => {
  const task = tasks.find(t => t.id === 'uc-marketing-campaign-launch-workflow-task');
  assert.strictEqual(task.spec_path, 'docs/task-specs/uc-marketing-campaign-launch-workflow-task.md');
});

test('Task `status` is `pending`', () => {
  const task = tasks.find(t => t.id === 'uc-marketing-campaign-launch-workflow-task');
  assert.strictEqual(task.status, 'pending');
});

test('Task `owner` is `dev`', () => {
  const task = tasks.find(t => t.id === 'uc-marketing-campaign-launch-workflow-task');
  assert.strictEqual(task.owner, 'dev');
});

test('Task `use_case_id` is `uc-marketing-campaign-launch`', () => {
  const task = tasks.find(t => t.id === 'uc-marketing-campaign-launch-workflow-task');
  assert.strictEqual(task.use_case_id, 'uc-marketing-campaign-launch');
});

test('Spec file exists on disk', () => {
  assert.ok(fs.existsSync(specPath), `missing: ${specPath}`);
});

test('Spec file has non-trivial content (>= 500 bytes)', () => {
  const stat = fs.statSync(specPath);
  assert.ok(stat.size >= 500, `spec is only ${stat.size} bytes`);
});

console.log(`\n  ${passed} passed, ${failed} failed\n`);

if (failed > 0) process.exit(1);
