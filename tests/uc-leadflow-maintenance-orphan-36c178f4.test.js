#!/usr/bin/env node
/**
 * E2E test for PR #1996 — orphan branch investigation artifacts
 * Validates: JSON validity, required fields, no contradictory verdicts for same branch
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '..');
const VALID_VERDICTS = new Set([
  'duplicate/superseded',
  'shippable-needs-task-pr',
  'safe-delete',
  'needs-human-review',
  'already-merged',
]);

function collectVerdictFiles() {
  const files = [];
  const dirs = [
    path.join(REPO_ROOT, 'docs'),
    path.join(REPO_ROOT, 'docs', 'reports'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.match(/orphan.*verdict.*\.json$/i) || f.match(/orphan.*investigation.*\.json$/i)) {
        files.push(path.join(dir, f));
      }
    }
  }
  return files;
}

let passed = 0;
let failed = 0;

function ok(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${e.message}`);
    failed++;
  }
}

const verdictFiles = collectVerdictFiles();

ok('verdict JSON files exist in PR', () => {
  assert(verdictFiles.length >= 5, `Expected >=5 verdict JSON files, found ${verdictFiles.length}`);
});

// Track per-branch verdicts to detect contradictions
const branchVerdicts = {}; // branch -> [{file, verdict}]

for (const filePath of verdictFiles) {
  const rel = path.relative(REPO_ROOT, filePath);

  ok(`${rel} — valid JSON`, () => {
    const raw = fs.readFileSync(filePath, 'utf8');
    JSON.parse(raw); // throws on invalid
  });

  ok(`${rel} — has verdict field`, () => {
    const obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert(obj.verdict, `Missing 'verdict' field in ${rel}`);
  });

  ok(`${rel} — verdict is a known value`, () => {
    const obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const v = obj.verdict.toLowerCase();
    // Accept any string that contains one of the valid prefixes
    const knownValues = [
      'duplicate/superseded', 'shippable-needs-task-pr', 'safe-delete',
      'needs-human-review', 'already-merged',
    ];
    const matches = knownValues.some(kv => v.includes(kv.split('/')[0]) || v.includes(kv));
    assert(matches, `Unknown verdict value '${obj.verdict}' in ${rel}. Known: ${knownValues.join(', ')}`);
  });

  // Collect per-branch verdict data
  try {
    const obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const branch = obj.branch || obj.investigatedBranch;
    if (branch) {
      if (!branchVerdicts[branch]) branchVerdicts[branch] = [];
      branchVerdicts[branch].push({ file: rel, verdict: obj.verdict });
    }
  } catch (_) {}
}

// Cross-file check: detect contradictory verdicts for the same branch
ok('no contradictory verdicts for the same orphan branch across files', () => {
  const contradictions = [];
  for (const [branch, entries] of Object.entries(branchVerdicts)) {
    if (entries.length < 2) continue;
    const uniqueVerdicts = new Set(entries.map(e => e.verdict));
    if (uniqueVerdicts.size > 1) {
      contradictions.push(
        `Branch '${branch}' has conflicting verdicts:\n` +
        entries.map(e => `    ${e.file}: "${e.verdict}"`).join('\n')
      );
    }
  }
  assert.strictEqual(
    contradictions.length, 0,
    `Contradictory verdicts found:\n${contradictions.join('\n')}`
  );
});

// Check that package.json does not have non-standard spurious fields
ok('package.json has no spurious non-standard fields introduced by this PR', () => {
  const pkgPath = path.join(REPO_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const STANDARD_PKG_FIELDS = new Set([
    'name', 'version', 'description', 'main', 'scripts', 'dependencies',
    'devDependencies', 'peerDependencies', 'optionalDependencies', 'engines',
    'keywords', 'author', 'license', 'repository', 'bugs', 'homepage',
    'private', 'files', 'bin', 'man', 'exports', 'type', 'module',
    'types', 'typings', 'workspaces', 'resolutions', 'overrides',
    'funding', 'contributors', 'config',
  ]);
  // Fields introduced by this PR that are non-standard
  const nonStandardIntroduced = ['testSuiteFloor'];
  for (const field of nonStandardIntroduced) {
    assert(
      !(field in pkg),
      `package.json contains non-standard field '${field}': ${JSON.stringify(pkg[field])}. ` +
      'This is outside the scope of an orphan branch investigation task.'
    );
  }
});

console.log('\n============================================================');
console.log(`📊 TEST REPORT: ${passed} passed, ${failed} failed`);
console.log('============================================================');

if (failed > 0) {
  process.exit(1);
}
