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

console.log('\n=== feat-subscription-funnel-tracking workflow task registration ===\n');

const tasksPath = path.join(root, '.local-tasks.json');
const specPath = path.join(root, 'docs/task-specs/feat-subscription-funnel-tracking-workflow-task.md');

let tasks;

test('`.local-tasks.json` is valid JSON', () => {
  const raw = fs.readFileSync(tasksPath, 'utf8');
  tasks = JSON.parse(raw);
  assert.ok(Array.isArray(tasks), 'expected array');
});

test('Exactly one task with id `feat-subscription-funnel-tracking-workflow-task`', () => {
  const matches = tasks.filter(t => t.id === 'feat-subscription-funnel-tracking-workflow-task');
  assert.strictEqual(matches.length, 1, `found ${matches.length} matching tasks`);
});

test('Task `spec_path` points to correct file', () => {
  const task = tasks.find(t => t.id === 'feat-subscription-funnel-tracking-workflow-task');
  assert.strictEqual(
    task.spec_path,
    'docs/task-specs/feat-subscription-funnel-tracking-workflow-task.md'
  );
});

test('Task `status` is `pending`', () => {
  const task = tasks.find(t => t.id === 'feat-subscription-funnel-tracking-workflow-task');
  assert.strictEqual(task.status, 'pending');
});

test('Task `owner` is `dev`', () => {
  const task = tasks.find(t => t.id === 'feat-subscription-funnel-tracking-workflow-task');
  assert.strictEqual(task.owner, 'dev');
});

test('Task `use_case_id` is `feat-subscription-funnel-tracking`', () => {
  const task = tasks.find(t => t.id === 'feat-subscription-funnel-tracking-workflow-task');
  assert.strictEqual(task.use_case_id, 'feat-subscription-funnel-tracking');
});

test('Spec file exists on disk', () => {
  assert.ok(fs.existsSync(specPath), `missing: ${specPath}`);
});

test('Spec file has non-trivial content (>= 500 bytes)', () => {
  const stat = fs.statSync(specPath);
  assert.ok(stat.size >= 500, `spec is only ${stat.size} bytes`);
});

test('Spec file references checkout abandonment recovery', () => {
  const content = fs.readFileSync(specPath, 'utf8');
  assert.ok(
    content.toLowerCase().includes('abandonment'),
    'spec must mention checkout abandonment recovery'
  );
});

test('No runtime JS files reference the new task spec', () => {
  const jsFiles = [
    path.join(root, 'server.js'),
    ...walkDir(path.join(root, 'routes'), '.js'),
    ...walkDir(path.join(root, 'lib'), '.js'),
  ].filter(f => fs.existsSync(f));

  for (const f of jsFiles) {
    const content = fs.readFileSync(f, 'utf8');
    assert.ok(
      !content.includes('feat-subscription-funnel-tracking-workflow-task'),
      `unexpected reference in runtime file: ${f}`
    );
  }
});

function walkDir(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkDir(full, ext));
    else if (entry.name.endsWith(ext)) results.push(full);
  }
  return results;
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);

if (failed > 0) process.exit(1);
