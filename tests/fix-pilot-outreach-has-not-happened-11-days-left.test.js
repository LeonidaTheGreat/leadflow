// E2E test: uc_no_tasks seed for fix-pilot-outreach-has-not-happened-11-days-left
// Verifies the new task entry and referenced PRD are present and well-formed.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

const tasksPath = path.join(ROOT, '.local-tasks.json');
const prdPath = path.join(ROOT, 'docs/prd/PRD-PILOT-SIGNUP-FOLLOW-UP-SEQUENCE.md');
const specPath = path.join(ROOT, 'docs/task-specs/fix-pilot-outreach-has-not-happened-11-days-left-workflow-task.md');

test('local-tasks.json is valid JSON', () => {
  const raw = fs.readFileSync(tasksPath, 'utf-8');
  JSON.parse(raw);
});

test('pilot follow-up task exists exactly once', () => {
  const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
  const matches = tasks.filter(t => t.title === 'Implement Pilot Signup Follow-Up Sequence');
  assert.strictEqual(matches.length, 1, `Expected 1 match, got ${matches.length}`);
});

test('task agent_id is dev', () => {
  const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
  const task = tasks.find(t => t.title === 'Implement Pilot Signup Follow-Up Sequence');
  assert.strictEqual(task.agent_id, 'dev');
});

test('task status is ready', () => {
  const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
  const task = tasks.find(t => t.title === 'Implement Pilot Signup Follow-Up Sequence');
  assert.strictEqual(task.status, 'ready');
});

test('task use_case_id matches UC', () => {
  const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
  const task = tasks.find(t => t.title === 'Implement Pilot Signup Follow-Up Sequence');
  assert.strictEqual(task.metadata.use_case_id, 'fix-pilot-outreach-has-not-happened-11-days-left');
});

test('referenced PRD file exists', () => {
  assert.ok(fs.existsSync(prdPath), `PRD not found: ${prdPath}`);
});

test('task spec doc exists', () => {
  assert.ok(fs.existsSync(specPath), `Spec not found: ${specPath}`);
});

test('task has required fields (id, title, description, project_id, acceptance_criteria)', () => {
  const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
  const task = tasks.find(t => t.title === 'Implement Pilot Signup Follow-Up Sequence');
  for (const field of ['id', 'title', 'description', 'project_id', 'acceptance_criteria']) {
    assert.ok(task[field], `Missing field: ${field}`);
  }
  assert.ok(Array.isArray(task.acceptance_criteria) && task.acceptance_criteria.length > 0, 'acceptance_criteria must be non-empty array');
});

test('no duplicate task ids in local-tasks.json', () => {
  const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
  const ids = tasks.map(t => t.id);
  const unique = new Set(ids);
  assert.strictEqual(ids.length, unique.size, 'Duplicate task IDs found');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
