// E2E test: Verify the workflow task entry for fix-no-urgency-or-scarcity-mechanism
// Tests that the task in .local-tasks.json is valid and will be processed by the genome spawn loop.

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const LOCAL_TASKS_PATH = path.join(__dirname, '..', '.local-tasks.json');
const TASK_SPEC_PATH = path.join(__dirname, '..', 'docs', 'task-specs', 'fix-no-urgency-or-scarcity-mechanism-workflow-task.md');
const UC_ID = 'fix-no-urgency-or-scarcity-mechanism';
const SPAWNABLE_STATUSES = ['ready', 'backlog']; // task-store-base.js:402

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${e.message}`);
    failed++;
  }
}

// Load files
const localTasks = JSON.parse(fs.readFileSync(LOCAL_TASKS_PATH, 'utf-8'));
const task = localTasks.find(t => t.metadata && t.metadata.use_case_id === UC_ID);

test('task spec file exists', () => {
  assert.ok(fs.existsSync(TASK_SPEC_PATH), `Missing: ${TASK_SPEC_PATH}`);
});

test('task entry exists in .local-tasks.json', () => {
  assert.ok(task, `No task with use_case_id '${UC_ID}' found in .local-tasks.json`);
});

test('task has spawnable status (ready or backlog)', () => {
  assert.ok(
    SPAWNABLE_STATUSES.includes(task.status),
    `Task status '${task.status}' is not spawnable. getReadyTasks() only processes: ${SPAWNABLE_STATUSES.join(', ')}`
  );
});

test('task targets correct agent (dev)', () => {
  assert.strictEqual(task.agent_id, 'dev', `Expected agent_id 'dev', got '${task.agent_id}'`);
});

test('task has valid created_at date (not in the past by >1 year)', () => {
  const createdAt = new Date(task.created_at);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  assert.ok(
    createdAt > oneYearAgo,
    `created_at '${task.created_at}' is more than 1 year in the past — likely a fabricated date`
  );
});

test('implementation target file exists', () => {
  const target = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'app', 'page.tsx');
  assert.ok(fs.existsSync(target), `Implementation target not found: ${target}`);
});

test('task spec references correct UC id', () => {
  const spec = fs.readFileSync(TASK_SPEC_PATH, 'utf-8');
  assert.ok(
    spec.includes(UC_ID),
    `Task spec does not reference use case id '${UC_ID}'`
  );
});

test('.local-tasks.json remains valid JSON after change', () => {
  assert.ok(Array.isArray(localTasks), '.local-tasks.json is not an array');
  assert.ok(localTasks.length > 0, '.local-tasks.json is empty');
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
