'use strict';

/**
 * taskSpec
 * What:
 * - Update /Users/clawdbot/projects/leadflow/scripts/tasks/completion-reports-retention.js
 *   enforceCompletionReportRetention() so it enforces both completion-report retention and
 *   the quality gate requirement that total files in completion-reports/ stay <= 500.
 * - Update /Users/clawdbot/projects/leadflow/tests/unit/completion-reports-retention.test.js
 *   to verify retention enforces the total-file gate by archiving oldest completion reports
 *   when non-completion files push the directory over the limit.
 * Verify:
 * - npm run completion_reports exits 0 and reports totalAfter<=500.
 * - node tests/unit/completion-reports-retention.test.js exits 0.
 * - npm run build exits 0.
 * - npm run lint exits 0.
 * - npm test exits 0.
 * - npm audit --audit-level=high exits 0.
 * Boundaries:
 * - Do not modify routes/, lib/services/, schema, or runtime product business logic.
 * - Do not change report file naming or archival behavior beyond project-directory resolution.
 * - Do not modify orchestration engine code under ~/.openclaw/genome/.
 */

const fs = require('fs');
const path = require('path');
const { getProjectDir } = require('../../project-config-loader');

const DEFAULT_MAX_REPORTS = 400;
const DEFAULT_MAX_TOTAL_FILES = 500;
const DEFAULT_REPORTS_DIR = 'completion-reports';
const DEFAULT_ARCHIVE_DIR = '.completion-reports-archive';
const REPORT_PREFIX = 'COMPLETION-';

function resolveProjectDir(options = {}) {
  if (options.projectDir) {
    return options.projectDir;
  }

  if (typeof options.projectDirResolver === 'function') {
    const resolvedDir = options.projectDirResolver();
    if (resolvedDir) {
      return resolvedDir;
    }
  }

  try {
    const configuredProjectDir = getProjectDir();
    if (configuredProjectDir) {
      return configuredProjectDir;
    }
  } catch (_) {
    // Fall back to cwd when config loader is unavailable.
  }

  return process.cwd();
}

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

function listAllFiles(reportsDir) {
  if (!fs.existsSync(reportsDir)) {
    return [];
  }

  return fs
    .readdirSync(reportsDir)
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
    .filter((entry) => entry.isFile);
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
  const projectDir = resolveProjectDir(options);
  const maxReports = options.maxReports || DEFAULT_MAX_REPORTS;
  const maxTotalFiles = options.maxTotalFiles || DEFAULT_MAX_TOTAL_FILES;
  const reportsDir = path.join(projectDir, options.reportsDir || DEFAULT_REPORTS_DIR);
  const archiveDir = path.join(projectDir, options.archiveDir || DEFAULT_ARCHIVE_DIR);

  const reports = listCompletionReportFiles(reportsDir);
  const totalFilesBefore = listAllFiles(reportsDir).length;
  const overflowByReportCap = Math.max(0, reports.length - maxReports);
  const overflowByTotalCap = Math.max(0, totalFilesBefore - maxTotalFiles);
  const overflowCount = Math.min(reports.length, Math.max(overflowByReportCap, overflowByTotalCap));
  const overflow = overflowCount > 0 ? reports.slice(reports.length - overflowCount) : [];

  if (overflow.length === 0) {
    return {
      reportsDir,
      archiveDir,
      beforeCount: reports.length,
      beforeTotalCount: totalFilesBefore,
      archivedCount: 0,
      afterCount: reports.length,
      afterTotalCount: totalFilesBefore,
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
  const remainingTotalCount = listAllFiles(reportsDir).length;

  return {
    reportsDir,
    archiveDir,
    beforeCount: reports.length,
    beforeTotalCount: totalFilesBefore,
    archivedCount: overflow.length,
    afterCount: remainingCount,
    afterTotalCount: remainingTotalCount,
    archivedFiles
  };
}

function runCli() {
  const result = enforceCompletionReportRetention();
  const message = [
    `completion_reports: before=${result.beforeCount}`,
    `archived=${result.archivedCount}`,
    `after=${result.afterCount}`,
    `totalAfter=${result.afterTotalCount}`,
    `limit=${DEFAULT_MAX_REPORTS}`
  ].join(' ');

  console.log(message);

  if (result.afterCount > DEFAULT_MAX_REPORTS) {
    console.error(`completion_reports failed: ${result.afterCount} reports remain (max ${DEFAULT_MAX_REPORTS})`);
    process.exit(1);
  }

  if (result.afterTotalCount > DEFAULT_MAX_TOTAL_FILES) {
    console.error(
      `completion_reports failed: ${result.afterTotalCount} files remain in completion-reports (max ${DEFAULT_MAX_TOTAL_FILES})`
    );
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  DEFAULT_MAX_REPORTS,
  DEFAULT_MAX_TOTAL_FILES,
  resolveProjectDir,
  listCompletionReportFiles,
  listAllFiles,
  enforceCompletionReportRetention
};
