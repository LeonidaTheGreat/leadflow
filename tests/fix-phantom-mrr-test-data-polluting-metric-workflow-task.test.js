/*
Spec
What:
- Add tests/fix-phantom-mrr-test-data-polluting-metric-workflow-task.test.js to validate the first workflow task exists for use case `fix-phantom-mrr-test-data-polluting-metric`.
- Update .local-tasks.json by appending one task object with metadata.use_case_id = `fix-phantom-mrr-test-data-polluting-metric` and task spec path `docs/task-specs/fix-phantom-mrr-test-data-polluting-metric-workflow-task.md`.

Verify:
- Run: node tests/fix-phantom-mrr-test-data-polluting-metric-workflow-task.test.js
- Run: python3 -c 'import json; json.load(open(".local-tasks.json"))'
- Run: rg -n "fix-phantom-mrr-test-data-polluting-metric" .local-tasks.json docs/task-specs/fix-phantom-mrr-test-data-polluting-metric-workflow-task.md

Boundaries:
- Do not modify runtime app code under routes/, lib/, product/, or server.js.
- Do not implement MRR filtering behavior in this task.
- Do not touch protected generated docs/config files listed in assignment.
*/
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const LOCAL_TASKS_PATH = path.join(__dirname, '..', '.local-tasks.json');
const TASK_SPEC_PATH = path.join(__dirname, '..', 'docs', 'task-specs', 'fix-phantom-mrr-test-data-polluting-metric-workflow-task.md');
const UC_ID = 'fix-phantom-mrr-test-data-polluting-metric';
const SPAWNABLE_STATUSES = ['ready', 'backlog', 'pending'];

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}`);
    console.log(`  ${e.message}`);
    failed++;
  }
}

const localTasks = JSON.parse(fs.readFileSync(LOCAL_TASKS_PATH, 'utf-8'));
const task = localTasks.find(t => t.metadata && t.metadata.use_case_id === UC_ID);

test('task spec file exists', () => {
  assert.ok(fs.existsSync(TASK_SPEC_PATH), `Missing: ${TASK_SPEC_PATH}`);
});

test('task entry exists in .local-tasks.json', () => {
  assert.ok(task, `No task with use_case_id '${UC_ID}' found in .local-tasks.json`);
});

test('task status is spawnable for local-task workflows', () => {
  assert.ok(task && SPAWNABLE_STATUSES.includes(task.status), `Unexpected status: ${task && task.status}`);
});

test('task routes to dev agent', () => {
  assert.strictEqual(task.agent_id || task.owner, 'dev', `Expected dev assignee, got '${task.agent_id || task.owner}'`);
});

test('task points to correct spec path', () => {
  assert.strictEqual(
    task.metadata.task_spec,
    'docs/task-specs/fix-phantom-mrr-test-data-polluting-metric-workflow-task.md'
  );
});

test('local tasks json is valid and non-empty', () => {
  assert.ok(Array.isArray(localTasks), '.local-tasks.json is not an array');
  assert.ok(localTasks.length > 0, '.local-tasks.json is empty');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
