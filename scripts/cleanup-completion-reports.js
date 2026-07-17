'use strict'
/**
 * Prune completion-reports/ to stay under the quality gate limit (max 500).
 * Keeps newest 450 COMPLETION-* files; deletes by age (>7 days) first,
 * then trims oldest by mtime if still over 500.
 *
 * Usage: node scripts/cleanup-completion-reports.js
 */

const fs = require('fs')
const path = require('path')

const REPORT_DIR = path.join(__dirname, '..', 'completion-reports')
const MAX_KEEP = 450
const MAX_ALLOWED = 500
const AGE_CUTOFF_MS = 7 * 24 * 60 * 60 * 1000

function run() {
  if (!fs.existsSync(REPORT_DIR)) {
    console.log('No completion-reports directory, nothing to do.')
    return
  }

  let deleted = 0

  // Phase 1: delete by age
  for (const f of fs.readdirSync(REPORT_DIR)) {
    if (!f.startsWith('COMPLETION-')) continue
    const fPath = path.join(REPORT_DIR, f)
    try {
      if (fs.statSync(fPath).mtimeMs < Date.now() - AGE_CUTOFF_MS) {
        fs.unlinkSync(fPath)
        deleted++
      }
    } catch { /* skip unreadable */ }
  }

  // Phase 2: trim by count if still over limit
  const remaining = fs.readdirSync(REPORT_DIR).filter(f => f.startsWith('COMPLETION-'))
  if (remaining.length > MAX_ALLOWED) {
    const withMtime = remaining.map(f => {
      try { return { f, mtime: fs.statSync(path.join(REPORT_DIR, f)).mtimeMs } } catch { return null }
    }).filter(Boolean)
    withMtime.sort((a, b) => a.mtime - b.mtime)
    const toDelete = withMtime.slice(0, withMtime.length - MAX_KEEP)
    for (const { f } of toDelete) {
      try { fs.unlinkSync(path.join(REPORT_DIR, f)); deleted++ } catch { /* skip */ }
    }
  }

  const finalCount = fs.readdirSync(REPORT_DIR).filter(f => f.startsWith('COMPLETION-')).length
  console.log(`Deleted ${deleted} reports. Remaining: ${finalCount}`)
}

run()
