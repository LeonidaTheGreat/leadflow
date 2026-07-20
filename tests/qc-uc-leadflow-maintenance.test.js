const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const VALID_VERDICTS = ['duplicate/superseded', 'already-shipped-safe-delete', 'shippable-needs-task-pr', 'needs-human-review'];

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${label}: ${e.message}`);
    failed++;
  }
}

// --- Test 1: Primary deliverable (648ef165) is complete and well-formed ---
console.log('\n🧪 Test 1: Primary deliverable — verdict for dev/648ef165');
const primaryPath = path.join(repoRoot, 'docs/orphan-branch-verdict-648ef165.json');
check('Primary verdict file exists', () => assert.ok(fs.existsSync(primaryPath)));
const primary = JSON.parse(fs.readFileSync(primaryPath, 'utf8'));
check('investigatedBranch matches PR target', () =>
  assert.strictEqual(primary.investigatedBranch, 'dev/648ef165-dev-re-merge-fix-verify-stripe-webhook-s'));
check('verdict is a valid enum value', () =>
  assert.ok(VALID_VERDICTS.includes(primary.verdict), `got: ${primary.verdict}`));
check('recommendation is actionable (>20 chars)', () =>
  assert.ok(typeof primary.recommendation === 'string' && primary.recommendation.length > 20));
check('commandsRun has ≥3 entries (shows real investigation)', () =>
  assert.ok(Array.isArray(primary.commandsRun) && primary.commandsRun.length >= 3, `got: ${(primary.commandsRun||[]).length}`));
check('evidence object is present', () =>
  assert.ok(primary.evidence && typeof primary.evidence === 'object'));

// --- Test 2: Path fix in genome-replenish-queue-ready-fix.test.js is correct ---
console.log('\n🧪 Test 2: Genome test file path fix points to real files');
const testSrc = fs.readFileSync(path.join(repoRoot, 'tests/unit/genome-replenish-queue-ready-fix.test.js'), 'utf8');
check('uses projects/genome path (not stale .openclaw/genome)', () => {
  assert.ok(testSrc.includes("'projects/genome/core/loops/execution-loop.js'"), 'execution-loop path not updated');
  assert.ok(!testSrc.includes("'.openclaw/genome/core/loops/execution-loop.js'"), 'stale .openclaw path still present');
});
check('execution-loop.js exists at new path', () => {
  const p = path.join(process.env.HOME, 'projects/genome/core/loops/execution-loop.js');
  assert.ok(fs.existsSync(p), `missing: ${p}`);
});
check('queue-replenisher.js exists at new path', () => {
  const p = path.join(process.env.HOME, 'projects/genome/core/loops/queue-replenisher.js');
  assert.ok(fs.existsSync(p), `missing: ${p}`);
});

// --- Test 3: All verdict files have minimum viable schema ---
console.log('\n🧪 Test 3: All verdict files have minimum viable schema');
const allVerdictFiles = [
  ...fs.readdirSync(path.join(repoRoot, 'docs'))
    .filter(f => f.startsWith('orphan-branch-verdict-') && f.endsWith('.json'))
    .map(f => path.join(repoRoot, 'docs', f)),
  ...fs.readdirSync(path.join(repoRoot, 'docs/reports'))
    .filter(f => f.startsWith('orphan-branch-') && f.endsWith('-verdict.json'))
    .map(f => path.join(repoRoot, 'docs/reports', f)),
];
check(`found at least 10 verdict files (got ${allVerdictFiles.length})`, () =>
  assert.ok(allVerdictFiles.length >= 10));
const schemaFailures = [];
for (const f of allVerdictFiles) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const relPath = path.relative(repoRoot, f);
  const hasBranch = d.investigatedBranch || d.orphanBranch;
  if (!hasBranch) schemaFailures.push(`${relPath}: missing investigatedBranch/orphanBranch`);
  if (!VALID_VERDICTS.includes(d.verdict)) schemaFailures.push(`${relPath}: invalid verdict '${d.verdict}'`);
  if (!d.recommendation || d.recommendation.length < 5) schemaFailures.push(`${relPath}: recommendation missing or too short`);
  if (!Array.isArray(d.commandsRun) || d.commandsRun.length < 3) schemaFailures.push(`${relPath}: commandsRun missing or <3 entries`);
}
check(`all verdict files have valid verdict enum`, () => {
  const invalidVerdict = schemaFailures.filter(s => s.includes('invalid verdict'));
  assert.strictEqual(invalidVerdict.length, 0, '\n' + invalidVerdict.join('\n'));
});
check(`all verdict files have actionable recommendation`, () => {
  const missingRec = schemaFailures.filter(s => s.includes('recommendation'));
  assert.strictEqual(missingRec.length, 0, '\n' + missingRec.join('\n'));
});
check(`all verdict files have command provenance (≥3 entries)`, () => {
  const missingCmd = schemaFailures.filter(s => s.includes('commandsRun'));
  assert.strictEqual(missingCmd.length, 0, '\n' + missingCmd.join('\n'));
});

// --- Summary ---
console.log(`\n📊 Result: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
console.log('PASS: QC E2E test for uc-leadflow-maintenance');
