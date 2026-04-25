// E2E test: workflow task for phantom MRR use case (use case id: fix-phantom-mrr-test-data-polluting-metric)
// Verifies: .local-tasks.json has exactly ONE task entry for this UC, spec doc exists, JSON is valid

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run() {
  // 1. JSON validity
  const raw = fs.readFileSync(path.join(ROOT, '.local-tasks.json'), 'utf8');
  let tasks;
  try {
    tasks = JSON.parse(raw);
  } catch (e) {
    assert.fail(`FAIL: .local-tasks.json is not valid JSON: ${e.message}`);
  }
  console.log('PASS: .local-tasks.json is valid JSON');

  // 2. Exactly one task for this UC
  const UC_ID = 'fix-phantom-mrr-test-data-polluting-metric';
  const matching = tasks.filter(t => t?.metadata?.use_case_id === UC_ID);
  assert.strictEqual(matching.length, 1, `Expected exactly 1 task for ${UC_ID}, found ${matching.length}`);
  console.log('PASS: exactly one task entry for', UC_ID);

  // 3. Task has required fields
  const task = matching[0];
  assert.ok(task.id, 'FAIL: task missing id');
  assert.strictEqual(task.status, 'pending', `FAIL: expected status=pending, got ${task.status}`);
  assert.strictEqual(task.agent_id, 'dev', `FAIL: expected agent_id=dev, got ${task.agent_id}`);
  assert.strictEqual(task.priority, 'high', `FAIL: expected priority=high, got ${task.priority}`);
  assert.ok(Array.isArray(task.metadata.implementation_targets) && task.metadata.implementation_targets.length > 0, 'FAIL: missing implementation_targets');
  console.log('PASS: task has required fields (id, status=pending, agent_id=dev, priority=high, implementation_targets)');

  // 4. Spec doc exists
  const specPath = path.join(ROOT, task.metadata.task_spec_path);
  assert.ok(fs.existsSync(specPath), `FAIL: spec doc not found at ${specPath}`);
  console.log('PASS: spec doc exists at', task.metadata.task_spec_path);

  // 5. Implementation targets reference real paths (existence not required yet, but paths are non-empty strings)
  for (const target of task.metadata.implementation_targets) {
    assert.ok(typeof target === 'string' && target.length > 0, `FAIL: empty implementation target`);
  }
  console.log('PASS: all implementation_targets are non-empty strings');

  console.log('\nAll checks passed.');
}

run();
