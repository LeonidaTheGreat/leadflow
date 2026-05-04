'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  enforceCompletionReportRetention,
  listCompletionReportFiles,
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

  const collisionSource = path.join(reportsDir, 'COMPLETION-collision-test.json');
  fs.writeFileSync(collisionSource, JSON.stringify({ collision: true }), 'utf8');
  fs.writeFileSync(path.join(archiveDir, 'COMPLETION-collision-test.json'), JSON.stringify({ existing: true }), 'utf8');

  const originalRandom = Math.random;
  Math.random = () => {
    throw new Error('Math.random should not be called');
  };

  try {
    const collisionResult = enforceCompletionReportRetention({
      projectDir,
      maxReports: 2,
      reportsDir: 'completion-reports',
      archiveDir: '.completion-reports-archive'
    });
    assert.strictEqual(collisionResult.afterCount, 2, 'retention should still complete when archive name collision occurs');
  } finally {
    Math.random = originalRandom;
  }

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
      2,
      'retention should still target the canonical project directory when cwd differs'
    );
  } finally {
    process.chdir(originalCwd);
  }

  console.log('PASS: completion report retention archives overflow and preserves newest files');
})();
