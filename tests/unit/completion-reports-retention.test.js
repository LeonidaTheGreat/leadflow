'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  DEFAULT_MAX_TOTAL_FILES,
  enforceCompletionReportRetention,
  listCompletionReportFiles,
  listAllFiles,
  resolveProjectDir
} = require('../../scripts/tasks/completion-reports-retention');

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'completion-retention-'));
}

function writeCompletionFile(dir, index) {
  const name = `COMPLETION-test-${String(index).padStart(4, '0')}.json`;
  const fullPath = path.join(dir, name);
  fs.writeFileSync(fullPath, JSON.stringify({ index }), 'utf8');
  const mtime = new Date(Date.now() - index * 1000);
  fs.utimesSync(fullPath, mtime, mtime);
  return fullPath;
}

(function run() {
  console.log('\n=== completion-reports retention tests ===\n');

  const projectDir = createTempDir();
  const reportsDir = path.join(projectDir, 'completion-reports');
  const archiveDir = path.join(projectDir, '.completion-reports-archive');

  fs.mkdirSync(reportsDir, { recursive: true });

  for (let i = 0; i < 6; i += 1) {
    writeCompletionFile(reportsDir, i);
  }

  fs.writeFileSync(path.join(reportsDir, 'ORCHESTRATOR-DECISIONS.json'), '{}', 'utf8');

  const before = listCompletionReportFiles(reportsDir);
  assert.strictEqual(before.length, 6, 'should count only COMPLETION-* files before retention');

  const result = enforceCompletionReportRetention({
    projectDir,
    maxReports: 3,
    reportsDir: 'completion-reports',
    archiveDir: '.completion-reports-archive'
  });

  assert.strictEqual(result.beforeCount, 6, 'beforeCount should include all completion reports');
  assert.strictEqual(result.archivedCount, 3, 'should archive overflow files only');
  assert.strictEqual(result.afterCount, 3, 'should keep maxReports files in completion-reports');
  assert.ok(fs.existsSync(archiveDir), 'archive directory should be created');

  const remainingNames = listCompletionReportFiles(reportsDir).map((entry) => entry.name);
  assert.deepStrictEqual(
    remainingNames,
    [
      'COMPLETION-test-0000.json',
      'COMPLETION-test-0001.json',
      'COMPLETION-test-0002.json'
    ],
    'should retain the newest reports'
  );

  const archiveCount = fs
    .readdirSync(archiveDir)
    .filter((name) => name.startsWith('COMPLETION-test-'))
    .length;
  assert.strictEqual(archiveCount, 3, 'archive should contain overflow files');

  assert.ok(
    fs.existsSync(path.join(reportsDir, 'ORCHESTRATOR-DECISIONS.json')),
    'non-completion reports should remain untouched'
  );

  const unrelatedCwd = createTempDir();
  const originalCwd = process.cwd();
  try {
    process.chdir(unrelatedCwd);

    const resolvedDir = resolveProjectDir({
      projectDirResolver: () => projectDir
    });
    assert.strictEqual(resolvedDir, projectDir, 'resolver should prefer injected canonical project directory');

    const resolverResult = enforceCompletionReportRetention({
      projectDirResolver: () => projectDir,
      maxReports: 3,
      reportsDir: 'completion-reports',
      archiveDir: '.completion-reports-archive'
    });
    assert.strictEqual(
      resolverResult.afterCount,
      3,
      'retention should still target the canonical project directory when cwd differs'
    );
  } finally {
    process.chdir(originalCwd);
  }

  const gateProjectDir = createTempDir();
  const gateReportsDir = path.join(gateProjectDir, 'completion-reports');
  fs.mkdirSync(gateReportsDir, { recursive: true });

  for (let i = 0; i < 400; i += 1) {
    writeCompletionFile(gateReportsDir, i);
  }
  for (let i = 0; i < 120; i += 1) {
    fs.writeFileSync(path.join(gateReportsDir, `TASK-note-${String(i).padStart(3, '0')}.md`), 'note', 'utf8');
  }

  const gateResult = enforceCompletionReportRetention({
    projectDir: gateProjectDir,
    maxReports: 400,
    maxTotalFiles: DEFAULT_MAX_TOTAL_FILES,
    reportsDir: 'completion-reports',
    archiveDir: '.completion-reports-archive'
  });
  assert.strictEqual(gateResult.beforeCount, 400, 'completion count starts at configured cap');
  assert.strictEqual(gateResult.beforeTotalCount, 520, 'total file count starts above gate max');
  assert.strictEqual(gateResult.archivedCount, 20, 'retention archives oldest completion reports to satisfy total cap');
  assert.strictEqual(gateResult.afterCount, 380, 'completion count is reduced to satisfy total-file gate');
  assert.strictEqual(gateResult.afterTotalCount, 500, 'total file count should satisfy max total file gate');
  assert.strictEqual(listAllFiles(gateReportsDir).length, 500, 'reports directory total files should be capped at 500');

  console.log('PASS: completion report retention archives overflow and preserves newest files');
})();
