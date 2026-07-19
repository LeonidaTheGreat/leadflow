const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const verdictFiles = [
  'docs/orphan-branch-verdict-0047d8d9.json',
  'docs/orphan-branch-verdict-1c19567f.json',
  'docs/reports/orphan-branch-098f80d4-verdict.json',
  'docs/reports/orphan-branch-0ed46882-verdict.json',
  'docs/reports/orphan-branch-0fd668fb-verdict.json',
  'docs/reports/orphan-branch-de3b67e0-verdict.json',
];

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

test('all added orphan verdict JSON files parse', () => {
  for (const file of verdictFiles) {
    const parsed = readJson(file);
    assert.ok(parsed && typeof parsed === 'object', `${file} did not parse as an object`);
  }
});

test('verdict files include a concrete verdict and recommendation', () => {
  for (const file of verdictFiles) {
    const parsed = readJson(file);
    assert.ok(parsed.verdict, `${file} is missing verdict`);
    assert.ok(parsed.recommendation || parsed.verdictSummary, `${file} is missing recommendation/verdictSummary`);
  }
});

test('markdown investigation document includes verdict and evidence sections', () => {
  const file = path.join(ROOT, 'docs/reports/ORPHAN-BRANCH-0fd668fb-investigation.md');
  const content = fs.readFileSync(file, 'utf8');
  assert.match(content, /Verdict:/, 'investigation markdown must state a verdict');
  assert.match(content, /## Evidence/, 'investigation markdown must include evidence');
  assert.match(content, /## Recommendation/, 'investigation markdown must include recommendation');
});
