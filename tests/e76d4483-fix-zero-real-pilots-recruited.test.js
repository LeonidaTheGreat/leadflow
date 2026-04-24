'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const USE_CASE_ID = 'fix-zero-real-pilots-recruited';
const TASK_TITLE = 'Real Pilot Recruitment Campaign Brief';
const SPEC_PATH = path.join(ROOT, 'docs/task-specs/real-pilot-recruitment-campaign-brief-workflow-task.md');
const TASKS_PATH = path.join(ROOT, '.local-tasks.json');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n── E2E: fix-zero-real-pilots-recruited task creation ──\n');

// 1. JSON validity
let tasks;
test('.local-tasks.json is valid JSON', () => {
  const raw = fs.readFileSync(TASKS_PATH, 'utf8');
  tasks = JSON.parse(raw);
  assert(Array.isArray(tasks), 'Expected array');
});

// 2. Task entry exists
let task;
test(`Task "${TASK_TITLE}" exists in .local-tasks.json`, () => {
  task = tasks.find(t => t.title === TASK_TITLE);
  assert(task, `No task found with title "${TASK_TITLE}"`);
});

// 3. Correct use_case_id
test('Task links to correct use_case_id', () => {
  assert.strictEqual(task.metadata.use_case_id, USE_CASE_ID);
});

// 4. Agent matches first workflow step (marketing)
test('Task assigned to marketing agent (first workflow step)', () => {
  assert.strictEqual(task.agent_id, 'marketing', `Expected marketing, got ${task.agent_id}`);
});

// 5. Task is ready to spawn
test('Task status is ready', () => {
  assert.strictEqual(task.status, 'ready');
});

// 6. Priority is P1
test('Task priority is 1 (P1)', () => {
  assert.strictEqual(task.priority, 1);
});

// 7. Acceptance criteria present and non-empty
test('Task has acceptance_criteria array with ≥3 items', () => {
  assert(Array.isArray(task.acceptance_criteria), 'acceptance_criteria must be an array');
  assert(task.acceptance_criteria.length >= 3, `Expected ≥3 criteria, got ${task.acceptance_criteria.length}`);
});

// 8. gap_type is uc_no_tasks
test('gap_type is uc_no_tasks', () => {
  assert.strictEqual(task.metadata.gap_type, 'uc_no_tasks');
});

// 9. Task spec file exists
test('Task spec file exists at docs/task-specs/', () => {
  assert(fs.existsSync(SPEC_PATH), `Missing: ${SPEC_PATH}`);
});

// 10. Spec references the correct use case ID
test('Task spec references use_case_id', () => {
  const content = fs.readFileSync(SPEC_PATH, 'utf8');
  assert(content.includes(USE_CASE_ID), `Spec does not reference ${USE_CASE_ID}`);
});

// 11. Spec references correct agent
test('Task spec references marketing agent', () => {
  const content = fs.readFileSync(SPEC_PATH, 'utf8');
  assert(content.toLowerCase().includes('marketing'), 'Spec does not reference marketing agent');
});

// 12. Only one task for this use case (no duplicates)
test('Only one task linked to this use_case_id', () => {
  const matches = tasks.filter(t => t.metadata && t.metadata.use_case_id === USE_CASE_ID);
  assert.strictEqual(matches.length, 1, `Expected 1 task, found ${matches.length}`);
});

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
