// E2E test: PR #1991 — orphan branch investigation report for dev/2becf0ef
// Verifies the verdict JSON is structurally valid and complete.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Accept the file from the PR branch (checked out separately) or the worktree
const VERDICT_PATH = [
  path.join(__dirname, '../docs/orphan-branch-verdict-2becf0ef.json'),
  '/tmp/verdict-2becf0ef.json',
].find(p => fs.existsSync(p)) || path.join(__dirname, '../docs/orphan-branch-verdict-2becf0ef.json');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

// 1. File exists
test('verdict file exists at docs/orphan-branch-verdict-2becf0ef.json', () => {
  assert.ok(fs.existsSync(VERDICT_PATH), 'File not found');
});

const raw = fs.readFileSync(VERDICT_PATH, 'utf8');
let doc;

// 2. Valid JSON
test('verdict file is valid JSON', () => {
  doc = JSON.parse(raw);
});

// 3. Required top-level fields
test('has taskId field', () => {
  assert.ok(typeof doc.taskId === 'string' && doc.taskId.length > 0);
});

test('has verdict field', () => {
  assert.ok(typeof doc.verdict === 'string' && doc.verdict.length > 0);
});

test('has branch field matching expected orphan branch', () => {
  assert.strictEqual(doc.branch, 'dev/2becf0ef-dev-re-merge-feat-transactional-email-re');
});

test('has evidence object with commitsAheadOfMain', () => {
  assert.ok(doc.evidence && Array.isArray(doc.evidence.commitsAheadOfMain));
  assert.ok(doc.evidence.commitsAheadOfMain.length > 0, 'Expected at least one commit ahead of main');
});

test('has risk object with level', () => {
  assert.ok(doc.risk && typeof doc.risk.level === 'string');
  assert.ok(['low', 'medium', 'high'].includes(doc.risk.level.toLowerCase()));
});

test('has recommendation string', () => {
  assert.ok(typeof doc.recommendation === 'string' && doc.recommendation.length > 10);
});

test('rootCauseAnalysis has failurePoint, why, fix', () => {
  const rca = doc.rootCauseAnalysis;
  assert.ok(rca && rca.failurePoint && rca.why && rca.fix, 'Missing one or more rootCauseAnalysis fields');
});

test('verdict is one of expected values', () => {
  const allowed = [
    'safe-delete', 'duplicate/superseded', 'needs-human-review',
    'shippable-needs-task-pr', 'already-on-main'
  ];
  assert.ok(
    allowed.includes(doc.verdict),
    `Unexpected verdict "${doc.verdict}". Allowed: ${allowed.join(', ')}`
  );
});

test('sibling branches listed (evidence.relatedBranches is array)', () => {
  assert.ok(
    Array.isArray(doc.evidence.relatedBranches) && doc.evidence.relatedBranches.length > 0,
    'Expected sibling branch list to be non-empty'
  );
});

test('commandsRun is non-empty array', () => {
  assert.ok(Array.isArray(doc.commandsRun) && doc.commandsRun.length > 0);
});

console.log(`\n📋 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ All checks pass');
}
