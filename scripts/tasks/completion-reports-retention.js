'use strict';

/**
 * taskSpec
 * What:
 * - Update /Users/clawdbot/projects/leadflow/scripts/tasks/completion-reports-retention.js
 *   to apply both retention rules in one pass:
 *   1) delete COMPLETION-* files older than 7 days, then
 *   2) archive oldest overflow files so completion-reports stays <= 500.
 * - Update /Users/clawdbot/projects/leadflow/tests/unit/completion-reports-retention.test.js
 *   to verify old files are deleted first and only remaining overflow files are archived.
 * Verify:
 * - Run `find completion-reports/ -name "COMPLETION-*" -mtime +7 -delete`; if count remains >500,
 *   run `npm run completion_reports` and confirm the script reports `after<=500`.
 * - Run `find completion-reports/ -maxdepth 1 -name "COMPLETION-*" | wc -l` and confirm <=500.
 * - Run `node ~/.openclaw/genome/scripts/quality-audit.js /Users/clawdbot/projects/leadflow --json`
 *   and confirm `completion_reports` gate is `passed: true`.
 * - Run `node tests/unit/completion-reports-retention.test.js` and confirm exit code 0.
 * - Run `npm run build`, `npm run lint`, `npm test`, and `npm audit --audit-level=high`.
 * Boundaries:
 * - Do not modify product routes/services/database schema or runtime business logic.
 * - Do not modify orchestration engine files under ~/.openclaw/genome/.
 * - Keep changes scoped to completion report retention behavior and its unit tests.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_REPORTS = 500;
const DEFAULT_MAX_AGE_DAYS = 7;
const DEFAULT_REPORTS_DIR = 'completion-reports';
const DEFAULT_ARCHIVE_DIR = '.completion-reports-archive';
const REPORT_PREFIX = 'COMPLETION-';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
  const maxAgeDays = options.maxAgeDays || DEFAULT_MAX_AGE_DAYS;
  const reportsDir = path.join(projectDir, options.reportsDir || DEFAULT_REPORTS_DIR);
  const archiveDir = path.join(projectDir, options.archiveDir || DEFAULT_ARCHIVE_DIR);
  const retentionCutoffMs = Date.now() - maxAgeDays * MS_PER_DAY;

  const reportsBefore = listCompletionReportFiles(reportsDir);
  const oldReports = reportsBefore.filter((entry) => entry.mtimeMs < retentionCutoffMs);
  for (const report of oldReports) {
    fs.unlinkSync(report.fullPath);
  }

  const reportsAfterAgeDelete = listCompletionReportFiles(reportsDir);
  const overflow = reportsAfterAgeDelete.slice(maxReports);

  if (oldReports.length === 0 && overflow.length === 0) {
    return {
      reportsDir,
      archiveDir,
      beforeCount: reportsBefore.length,
      deletedOldCount: 0,
      archivedCount: 0,
      afterCount: reportsBefore.length,
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
    beforeCount: reportsBefore.length,
    deletedOldCount: oldReports.length,
    archivedCount: overflow.length,
    afterCount: remainingCount,
    archivedFiles
  };
}

function runCli() {
  const result = enforceCompletionReportRetention();
  const message = [
    `completion_reports: before=${result.beforeCount}`,
    `deleted_old=${result.deletedOldCount}`,
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
  DEFAULT_MAX_AGE_DAYS,
  DEFAULT_MAX_REPORTS,
  listCompletionReportFiles,
  enforceCompletionReportRetention
};
