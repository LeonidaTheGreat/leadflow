'use strict';

/**
 * taskSpec
 * What:
 * - Add /Users/clawdbot/projects/leadflow/scripts/tasks/completion-reports-retention.js
 *   with enforceCompletionReportRetention(), listCompletionReportFiles(), and runCli()
 *   to cap COMPLETION-* files under completion-reports/ at 500 by archiving oldest files.
 * - Update /Users/clawdbot/projects/leadflow/package.json scripts to add
 *   "completion_reports": "node scripts/tasks/completion-reports-retention.js".
 * - Add /Users/clawdbot/projects/leadflow/tests/unit/completion-reports-retention.test.js
 *   to verify overflow files are archived and newest files are retained.
 * Verify:
 * - npm run completion_reports exits 0 and prints post-run count <= 500.
 * - node tests/unit/completion-reports-retention.test.js exits 0.
 * - npm run build exits 0.
 * - npm run lint exits 0.
 * - npm test exits 0.
 * - npm audit --audit-level=high exits 0.
 * Boundaries:
 * - Do not modify routes/, lib/services/, database schema, or runtime business logic.
 * - Do not delete completion reports; only move overflow reports to .completion-reports-archive/.
 * - Do not change orchestration engine code under ~/.openclaw/genome/.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_REPORTS = 500;
const DEFAULT_REPORTS_DIR = 'completion-reports';
const DEFAULT_ARCHIVE_DIR = '.completion-reports-archive';
const REPORT_PREFIX = 'COMPLETION-';

function listCompletionReportFiles(reportsDir) {
  if (!fs.existsSync(reportsDir)) {
    return [];
  }

  return fs
    .readdirSync(reportsDir)
    .filter((name) => name.startsWith(REPORT_PREFIX))
    .map((name) => {
      const fullPath = path.join(reportsDir, name);
      const stat = fs.statSync(fullPath);
      return {
        name,
        fullPath,
        mtimeMs: stat.mtimeMs,
        isFile: stat.isFile()
      };
    })
    .filter((entry) => entry.isFile)
    .sort((a, b) => b.mtimeMs - a.mtimeMs || a.name.localeCompare(b.name));
}

function moveToArchive(fullPath, archiveDir) {
  const baseName = path.basename(fullPath);
  let targetPath = path.join(archiveDir, baseName);

  if (fs.existsSync(targetPath)) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    targetPath = path.join(archiveDir, `${baseName}.${suffix}`);
  }

  fs.renameSync(fullPath, targetPath);
  return targetPath;
}

function enforceCompletionReportRetention(options = {}) {
  const projectDir = options.projectDir || process.cwd();
  const maxReports = options.maxReports || DEFAULT_MAX_REPORTS;
  const reportsDir = path.join(projectDir, options.reportsDir || DEFAULT_REPORTS_DIR);
  const archiveDir = path.join(projectDir, options.archiveDir || DEFAULT_ARCHIVE_DIR);

  const reports = listCompletionReportFiles(reportsDir);
  const overflow = reports.slice(maxReports);

  if (overflow.length === 0) {
    return {
      reportsDir,
      archiveDir,
      beforeCount: reports.length,
      archivedCount: 0,
      afterCount: reports.length,
      archivedFiles: []
    };
  }

  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  const archivedFiles = [];
  for (const report of overflow) {
    const archivedPath = moveToArchive(report.fullPath, archiveDir);
    archivedFiles.push({
      source: report.fullPath,
      archivedPath
    });
  }

  const remainingCount = listCompletionReportFiles(reportsDir).length;

  return {
    reportsDir,
    archiveDir,
    beforeCount: reports.length,
    archivedCount: overflow.length,
    afterCount: remainingCount,
    archivedFiles
  };
}

function runCli() {
  const result = enforceCompletionReportRetention();
  const message = [
    `completion_reports: before=${result.beforeCount}`,
    `archived=${result.archivedCount}`,
    `after=${result.afterCount}`,
    `limit=${DEFAULT_MAX_REPORTS}`
  ].join(' ');

  console.log(message);

  if (result.afterCount > DEFAULT_MAX_REPORTS) {
    console.error(`completion_reports failed: ${result.afterCount} reports remain (max ${DEFAULT_MAX_REPORTS})`);
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  DEFAULT_MAX_REPORTS,
  listCompletionReportFiles,
  enforceCompletionReportRetention
};
