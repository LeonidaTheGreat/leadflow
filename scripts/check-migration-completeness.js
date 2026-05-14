'use strict'

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const {
  collectTaskStatusEnum,
  scanCodeLiterals
} = require('./check-schema-coupling')

function getStagedMigrationFiles(repoRoot) {
  try {
    const output = execSync('git diff --cached --name-only', { cwd: repoRoot, encoding: 'utf8' })
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('migrations/') && line.endsWith('.sql'))
      .map((relativePath) => path.join(repoRoot, relativePath))
      .filter((absolutePath) => fs.existsSync(absolutePath))
  } catch (_err) {
    return []
  }
}

function extractStagedTaskStatuses(repoRoot, stagedFiles) {
  const allTaskStatuses = collectTaskStatusEnum(repoRoot)
  const stagedTaskStatuses = new Set()

  for (const filePath of stagedFiles) {
    const sql = fs.readFileSync(filePath, 'utf8')
    for (const status of allTaskStatuses) {
      if (status && sql.includes(`'${status}'`)) {
        stagedTaskStatuses.add(status)
      }
    }
  }

  return stagedTaskStatuses
}

function main() {
  const repoRoot = process.cwd()
  const stagedMigrationFiles = getStagedMigrationFiles(repoRoot)

  if (stagedMigrationFiles.length === 0) {
    console.log('[migration-completeness] SKIP (no staged migration SQL files)')
    return
  }

  const declaredStatuses = extractStagedTaskStatuses(repoRoot, stagedMigrationFiles)
  if (declaredStatuses.size === 0) {
    console.log('[migration-completeness] SKIP (no staged task status enum literals)')
    return
  }

  const emittedStatuses = new Set(
    scanCodeLiterals(repoRoot)
      .filter((item) => item.key === 'status')
      .map((item) => item.value)
  )

  const deadStatuses = [...declaredStatuses].filter((status) => !emittedStatuses.has(status))

  if (deadStatuses.length > 0) {
    console.error('[migration-completeness] Dead task enum values detected in staged migrations (not emitted in core/intelligence):')
    for (const status of deadStatuses.sort()) {
      console.error(`  - status: '${status}'`)
    }
    process.exit(1)
  }

  console.log(`[migration-completeness] OK (${declaredStatuses.size} staged task statuses emitted in code)`)
}

if (require.main === module) {
  main()
}

module.exports = { main }
