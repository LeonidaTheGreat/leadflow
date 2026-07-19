const assert = require('assert');
const { execFileSync } = require('child_process');

const PR_REF = 'origin/dev/dec4ee35-investigate-orphan-branch-dev-2aee86f1-d';

const reportPaths = [
  'docs/orphan-branch-dec4ee35-verdict.json',
  'docs/reports/orphan-branch-2aee86f1-nps-cron-investigation.json',
  'docs/reports/orphan-branch-2aee86f1-verdict.json',
  'docs/reports/orphan-branch-investigation-2aee86f1.json',
];

function readJsonFromRef(filePath) {
  const raw = execFileSync('git', ['show', `${PR_REF}:${filePath}`], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(raw);
}

for (const filePath of reportPaths) {
  const report = readJsonFromRef(filePath);
  const verdict = report.verdict || report.recommendation;
  const commandsRun = report.commandsRun || [];
  const evidence =
    report.evidence ||
    report.supersededEvidence ||
    report.supersedingMergedWork ||
    report.prHistory;

  assert.ok(verdict, `${filePath} must include a verdict or recommendation`);
  assert.match(verdict, /duplicate\/superseded|safe-delete/, `${filePath} must identify the branch as superseded`);
  assert.ok(evidence, `${filePath} must include investigation evidence`);
  assert.ok(Array.isArray(commandsRun), `${filePath} commandsRun must be an array`);
  assert.ok(commandsRun.length >= 3, `${filePath} must record verification commands`);
}

console.log(`validated ${reportPaths.length} LeadFlow maintenance orphan-branch reports`);
