// E2E test: PR #1872 — Dev agent COMMIT VERIFICATION rule
// Verifies that the rule described in docs was actually applied to genome files
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const GENOME_ROLE_CONTEXT = path.join(HOME, 'projects/genome/core/food/role-context.js');
const DEV_SOUL = path.join(HOME, '.openclaw/workspace-dev/SOUL.md');
const GENOME_WORKFLOW_ENGINE = path.join(HOME, 'projects/genome/intelligence/workflow-engine.js');
const DOC_FILE = path.join(__dirname, '../../docs/GENOME-DEV-COMMIT-VERIFICATION-2cfc666b.md');

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

console.log('\n=== PR #1872: Dev COMMIT VERIFICATION rule ===\n');

check('docs file exists in leadflow repo', () => {
  assert.ok(fs.existsSync(DOC_FILE), `Missing: ${DOC_FILE}`);
});

check('docs file documents the correct task ID', () => {
  const content = fs.readFileSync(DOC_FILE, 'utf8');
  assert.ok(content.includes('2cfc666b'), 'Task ID not in doc');
});

check('genome role-context.js injects COMMIT VERIFICATION into dev context', () => {
  const content = fs.readFileSync(GENOME_ROLE_CONTEXT, 'utf8');
  assert.ok(
    content.includes('COMMIT VERIFICATION'),
    'COMMIT VERIFICATION rule not found in role-context.js'
  );
  assert.ok(
    content.includes('git log --oneline HEAD -1'),
    'git log command not found in role-context.js'
  );
});

check('genome workflow-engine.js has commit verification policy comment', () => {
  const content = fs.readFileSync(GENOME_WORKFLOW_ENGINE, 'utf8');
  assert.ok(
    content.includes('COMMIT VERIFICATION'),
    'COMMIT VERIFICATION policy comment missing from workflow-engine.js'
  );
});

check('dev SOUL.md contains mandatory commit verification rule', () => {
  assert.ok(fs.existsSync(DEV_SOUL), `SOUL.md not found at ${DEV_SOUL}`);
  const content = fs.readFileSync(DEV_SOUL, 'utf8');
  assert.ok(
    content.includes('COMMIT VERIFICATION'),
    'COMMIT VERIFICATION rule missing from workspace-dev/SOUL.md'
  );
});

check('rule covers the documented failure mode (no silent exit without commit)', () => {
  const content = fs.readFileSync(GENOME_ROLE_CONTEXT, 'utf8');
  // Rule must direct agents to include git log output as evidence
  assert.ok(
    content.includes('git log') && content.includes('HEAD'),
    'Rule does not instruct agent to verify commit via git log HEAD'
  );
});

console.log(`\n============================================================`);
console.log(`📊 RESULT: ${passed} passed, ${failed} failed`);
console.log(`============================================================\n`);

if (failed > 0) process.exit(1);
