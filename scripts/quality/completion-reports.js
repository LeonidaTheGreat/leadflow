'use strict'

/*
Task Spec:
- What:
  - Add `scripts/quality/completion-reports.js` with a bounded retention routine that enforces the quality gate limit by keeping only the newest 500 `COMPLETION-*.json` files in `completion-reports/` and archiving older files under `completion-reports/archive/`.
  - Update `package.json` scripts to expose this check as `npm run completion_reports`.
  - Add `tests/unit/completion-reports.test.js` to verify the retention/archive behavior using a temporary directory.
- Verify:
  - `npm run completion_reports` exits 0 and prints that completion report count is within limit.
  - `node tests/unit/completion-reports.test.js` exits 0 with assertions passing.
  - `find completion-reports -maxdepth 1 -type f -name 'COMPLETION-*.json' | wc -l` reports <= 500.
- Boundaries:
  - Do not modify application routes, services, database schema, or business logic.
  - Do not change how completion reports are generated (`subagent-completion-report.js` remains untouched).
  - Do not alter Tailscale/dashboard/system-level configuration.
*/

const fs = require('fs')
const path = require('path')

const MAX_COMPLETION_REPORTS = 500
const REPORT_DIR_NAME = 'completion-reports'
const ARCHIVE_DIR_NAME = 'archive'
const REPORT_NAME_RE = /^COMPLETION-.*\.json$/

function isCompletionReport(filename) {
  return REPORT_NAME_RE.test(filename)
}

function listCompletionReports(directory) {
  if (!fs.existsSync(directory)) {
    return []
  }

  return fs.readdirSync(directory)
    .filter(isCompletionReport)
    .map((filename) => {
      const filepath = path.join(directory, filename)
      const stat = fs.statSync(filepath)
      return {
        filename,
        filepath,
        mtimeMs: stat.mtimeMs
      }
    })
}

function ensureDirectory(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true })
  }
}

function moveWithCollisionAvoidance(sourcePath, destinationDir) {
  const parsed = path.parse(sourcePath)
  let destinationPath = path.join(destinationDir, parsed.base)

  if (!fs.existsSync(destinationPath)) {
    fs.renameSync(sourcePath, destinationPath)
    return destinationPath
  }

  let attempt = 1
  while (true) {
    const candidate = path.join(destinationDir, `${parsed.name}-${Date.now()}-${attempt}${parsed.ext}`)
    if (!fs.existsSync(candidate)) {
      fs.renameSync(sourcePath, candidate)
      return candidate
    }
    attempt += 1
  }
}

function enforceCompletionReportCap(baseDir, maxReports = MAX_COMPLETION_REPORTS) {
  const reportDir = path.join(baseDir, REPORT_DIR_NAME)
  const archiveDir = path.join(reportDir, ARCHIVE_DIR_NAME)

  ensureDirectory(reportDir)

  const reports = listCompletionReports(reportDir)
  if (reports.length <= maxReports) {
    return {
      archivedCount: 0,
      remainingCount: reports.length,
      maxReports,
      reportDir,
      archiveDir
    }
  }

  ensureDirectory(archiveDir)

  const sortedDescending = reports.sort((a, b) => b.mtimeMs - a.mtimeMs)
  const toArchive = sortedDescending.slice(maxReports)

  for (const report of toArchive) {
    moveWithCollisionAvoidance(report.filepath, archiveDir)
  }

  const remainingCount = listCompletionReports(reportDir).length

  return {
    archivedCount: toArchive.length,
    remainingCount,
    maxReports,
    reportDir,
    archiveDir
  }
}

function run(argv = process.argv.slice(2)) {
  const targetDirArg = argv[0]
  const baseDir = targetDirArg ? path.resolve(targetDirArg) : process.cwd()

  const result = enforceCompletionReportCap(baseDir)

  if (result.archivedCount > 0) {
    console.log(`[completion_reports] Archived ${result.archivedCount} old reports to ${result.archiveDir}`)
  }

  if (result.remainingCount > result.maxReports) {
    console.error(`[completion_reports] ${result.remainingCount} completion reports (max ${result.maxReports})`)
    return 1
  }

  console.log(`[completion_reports] ${result.remainingCount} completion reports (max ${result.maxReports})`)
  return 0
}

if (require.main === module) {
  process.exit(run())
}

module.exports = {
  ARCHIVE_DIR_NAME,
  MAX_COMPLETION_REPORTS,
  REPORT_DIR_NAME,
  enforceCompletionReportCap,
  isCompletionReport,
  listCompletionReports,
  run
}
