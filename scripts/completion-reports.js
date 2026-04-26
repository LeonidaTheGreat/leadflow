'use strict'

/*
taskSpec:
What:
- Add /Users/clawdbot/projects/leadflow/scripts/completion-reports.js with a gate command that enforces a maximum count of completion report files by archiving oldest overflow files and revalidating the remaining count.
- Update /Users/clawdbot/projects/leadflow/package.json scripts to add completion_reports -> node scripts/completion-reports.js.

Verify:
- Run `npm run completion_reports` and expect exit code 0 plus a final log line confirming completion report count is <= 500.
- Run `node -e "const fs=require('fs');const n=fs.readdirSync('completion-reports').filter(f=>/^COMPLETION-.*\\.json$/i.test(f)).length;console.log(n)"` and expect output <= 500.
- Run `ls -1 .completion-reports-archive | head` and confirm archived files exist when overflow was present.

Boundaries:
- Do not modify report generation code (`subagent-completion-report.js`) or heartbeat/orchestration logic.
- Do not change database schema, runtime services, routes, or product behavior.
- Do not delete completion report data; archive overflow files instead of removing them.
*/

const fs = require('fs/promises')
const path = require('path')

const MAX_COMPLETION_REPORTS = 500
const REPORT_FILE_PATTERN = /^COMPLETION-.*\.json$/i
const REPORTS_DIR = path.resolve(__dirname, '..', 'completion-reports')
const ARCHIVE_DIR = path.resolve(__dirname, '..', '.completion-reports-archive')

async function listCompletionReports() {
  const entries = await fs.readdir(REPORTS_DIR, { withFileTypes: true })
  const reportNames = entries
    .filter((entry) => entry.isFile() && REPORT_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)

  const reportsWithTimes = await Promise.all(
    reportNames.map(async (name) => {
      const fullPath = path.join(REPORTS_DIR, name)
      const stats = await fs.stat(fullPath)
      return {
        name,
        fullPath,
        mtimeMs: stats.mtimeMs
      }
    })
  )

  reportsWithTimes.sort((a, b) => a.mtimeMs - b.mtimeMs)
  return reportsWithTimes
}

async function ensureArchiveDir() {
  await fs.mkdir(ARCHIVE_DIR, { recursive: true })
}

async function archiveOverflowReports(reports) {
  const overflowCount = reports.length - MAX_COMPLETION_REPORTS
  if (overflowCount <= 0) {
    return 0
  }

  await ensureArchiveDir()
  const overflow = reports.slice(0, overflowCount)
  let archived = 0

  for (const report of overflow) {
    const destinationPath = path.join(ARCHIVE_DIR, report.name)
    await fs.rename(report.fullPath, destinationPath)
    archived += 1
  }

  return archived
}

async function run() {
  const initialReports = await listCompletionReports()
  const archivedCount = await archiveOverflowReports(initialReports)
  const finalReports = await listCompletionReports()

  if (archivedCount > 0) {
    console.log(`Archived ${archivedCount} completion reports to ${ARCHIVE_DIR}`)
  }

  if (finalReports.length > MAX_COMPLETION_REPORTS) {
    throw new Error(
      `${finalReports.length} completion reports remain (max ${MAX_COMPLETION_REPORTS})`
    )
  }

  console.log(`${finalReports.length} completion reports (max ${MAX_COMPLETION_REPORTS})`)
}

run().catch((error) => {
  console.error(`[completion_reports] ${error.message}`)
  process.exit(1)
})
