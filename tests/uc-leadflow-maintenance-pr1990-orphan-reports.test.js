const assert = require('assert');
const { execFileSync } = require('child_process');

const prRef = 'origin/dev/dec4ee35-investigate-orphan-branch-dev-2aee86f1-d';
const reportFiles = [
  'docs/orphan-branch-dec4ee35-verdict.json',
  'docs/reports/orphan-branch-2aee86f1-nps-cron-investigation.json',
  'docs/reports/orphan-branch-2aee86f1-verdict.json',
  'docs/reports/orphan-branch-investigation-2aee86f1.json',
];

function readReport(path) {
  const content = execFileSync('git', ['show', `${prRef}:${path}`], {
    encoding: 'utf8',
  });
  return JSON.parse(content);
}

for (const path of reportFiles) {
  const report = readReport(path);

  assert.strictEqual(
    report.verdict,
    'duplicate/superseded',
    `${path} should mark the orphan branch as duplicate/superseded`
  );
  assert.match(
    JSON.stringify(report),
    /dev\/2aee86f1-dev-fix-nps-cron-pipeline-broken-cron-se/,
    `${path} should identify the investigated orphan branch`
  );
  assert.match(
    JSON.stringify(report),
    /1392|1546/,
    `${path} should cite the merged superseding PR evidence`
  );
  assert.doesNotMatch(
    JSON.stringify(report),
    /(sk_live_|pk_live_|whsec_|xox[baprs]-|BEGIN [A-Z ]*PRIVATE KEY)/,
    `${path} should not contain hardcoded secret material`
  );
}

console.log(`PASS: validated ${reportFiles.length} PR #1990 orphan-branch report artifacts`);
