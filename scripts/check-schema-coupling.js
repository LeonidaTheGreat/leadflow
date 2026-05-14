'use strict'

/*
Task Spec (WCP-4 / f0a8eb86-baee-40b0-8e21-167457eb894b)
What:
- Create scripts/check-schema-coupling.js (this file) with main() and helpers:
  listSqlFiles(), collectTaskStatusEnum(), collectAllowedLiterals(), scanCodeLiterals(), validateLiterals().
- Validate literals used as status/model/agent_id/project_id in core/ and intelligence/ (*.js/*.ts only) against values from migrations/*.sql + config JSON files.
- Update pre-commit hooks to call this script (in genome and leadflow repos).

Verify:
- node scripts/check-schema-coupling.js exits 0 on current code.
- Deliberate violation: add status: 'in_review' in scanned code, script exits non-zero and prints violation.
- Remove violation: script exits 0.
- npm test and npm run build pass.

Boundaries:
- Do not alter runtime orchestration logic.
- Hook scans only *.js/*.ts under core/ and intelligence/; excludes tests and markdown.
- No schema rewrites in migrations.
*/

const fs = require('fs')
const path = require('path')

const TARGET_KEYS = ['status', 'model', 'agent_id', 'project_id']
const SCAN_DIRS = ['core', 'intelligence']
const SCAN_EXTENSIONS = new Set(['.js', '.ts'])
const CONFIG_FILES = ['project.config.json', 'projects.json', '.project.json', '.spawn-config.json']
const DEFAULT_ALLOWED_MODELS = ['standard', 'codex', 'gpt-pro', 'sonnet', 'opus', 'haiku', 'kimi', 'none', 'qwen3-coder', 'qwen3', 'gemma4', 'gpt', 'gpt-5.3-codex', 'gpt-5.4', 'qwen3:30b', 'gemma4:31b', 'qwen3-coder:30b']
const DEFAULT_ALLOWED_AGENTS = ['orchestrator', 'dev', 'marketing', 'design', 'qc', 'analytics', 'product', 'system']

function extractQuotedLiterals(text) {
  const out = new Set()
  const quoteRegex = /'([^'\\]*(?:\\.[^'\\]*)*)'/g
  let match = quoteRegex.exec(text)
  while (match) {
    if (match[1]) out.add(match[1])
    match = quoteRegex.exec(text)
  }
  return out
}

function listSqlFiles(repoRoot) {
  const sqlDir = path.join(repoRoot, 'migrations')
  if (!fs.existsSync(sqlDir)) return []

  const files = []
  const stack = [sqlDir]
  while (stack.length > 0) {
    const current = stack.pop()
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
        continue
      }
      if (entry.name.endsWith('.sql')) files.push(fullPath)
    }
  }
  return files
}

function listCodeFiles(repoRoot, relativeDir) {
  const rootDir = path.join(repoRoot, relativeDir)
  if (!fs.existsSync(rootDir)) return []

  const out = []
  const stack = [rootDir]
  while (stack.length > 0) {
    const current = stack.pop()
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (/^(__tests__|tests?|coverage|dist|build|node_modules)$/i.test(entry.name)) continue
        stack.push(fullPath)
        continue
      }

      const ext = path.extname(entry.name)
      if (!SCAN_EXTENSIONS.has(ext)) continue
      if (/\.test\.[jt]s$/i.test(entry.name)) continue
      if (/\.spec\.[jt]s$/i.test(entry.name)) continue
      out.push(fullPath)
    }
  }

  return out
}

function collectTaskStatusEnum(repoRoot) {
  const statuses = new Set()
  for (const sqlFile of listSqlFiles(repoRoot)) {
    const sql = fs.readFileSync(sqlFile, 'utf8')

    const tasksConstraintRegex = /(tasks_status_check|ALTER\s+TABLE\s+tasks[\s\S]{0,600}CHECK\s*\(status[\s\S]{0,500}\))/gi
    let constraintMatch = tasksConstraintRegex.exec(sql)
    while (constraintMatch) {
      for (const literal of extractQuotedLiterals(constraintMatch[0])) {
        statuses.add(literal)
      }
      constraintMatch = tasksConstraintRegex.exec(sql)
    }

    const createTableTasksRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+tasks[\s\S]{0,2200}/gi
    let createMatch = createTableTasksRegex.exec(sql)
    while (createMatch) {
      const statusCheckRegex = /status\s+TEXT[\s\S]{0,300}?CHECK\s*\(status\s+IN\s*\(([^)]+)\)\)/gi
      let statusMatch = statusCheckRegex.exec(createMatch[0])
      while (statusMatch) {
        for (const literal of extractQuotedLiterals(statusMatch[1])) {
          statuses.add(literal)
        }
        statusMatch = statusCheckRegex.exec(createMatch[0])
      }
      createMatch = createTableTasksRegex.exec(sql)
    }
  }
  return statuses
}

function collectAllStatusLiterals(repoRoot) {
  const statuses = new Set()
  for (const sqlFile of listSqlFiles(repoRoot)) {
    const sql = fs.readFileSync(sqlFile, 'utf8')
    const statusRegex = /\bstatus\b[\s\S]{0,240}?\b(IN\s*\(|=\s*ANY\s*\(ARRAY\[)/gi
    let statusMatch = statusRegex.exec(sql)
    while (statusMatch) {
      const snippet = sql.slice(statusMatch.index, Math.min(sql.length, statusMatch.index + 340))
      for (const literal of extractQuotedLiterals(snippet)) {
        statuses.add(literal)
      }
      statusMatch = statusRegex.exec(sql)
    }
  }
  return statuses
}

function addProjectConfigLiterals(literalsByKey, absolutePath) {
  if (!fs.existsSync(absolutePath)) return

  let payload = null
  try {
    payload = JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
  } catch (_err) {
    return
  }

  if (!payload || typeof payload !== 'object') return

  if (typeof payload.project_id === 'string') {
    literalsByKey.project_id.add(payload.project_id)
  }

  if (Array.isArray(payload.projects)) {
    for (const project of payload.projects) {
      if (project && typeof project.project_id === 'string') {
        literalsByKey.project_id.add(project.project_id)
      }
    }
  }

  if (payload.agents && typeof payload.agents === 'object') {
    for (const [agentId, value] of Object.entries(payload.agents)) {
      if (agentId) literalsByKey.agent_id.add(agentId)
      if (value && typeof value === 'object' && typeof value.model === 'string') {
        literalsByKey.model.add(value.model)
      }
    }
  }
}

function collectAllowedLiterals(repoRoot) {
  const taskStatuses = collectTaskStatusEnum(repoRoot)
  const allStatuses = collectAllStatusLiterals(repoRoot)
  for (const status of allStatuses) taskStatuses.add(status)

  const literalsByKey = {
    status: taskStatuses,
    model: new Set(DEFAULT_ALLOWED_MODELS),
    agent_id: new Set(DEFAULT_ALLOWED_AGENTS),
    project_id: new Set(['genome', 'leadflow', 'bo2026', 'test'])
  }

  for (const sqlFile of listSqlFiles(repoRoot)) {
    const sql = fs.readFileSync(sqlFile, 'utf8')
    for (const key of ['model', 'agent_id', 'project_id']) {
      const keyRegex = new RegExp(`\\b${key}\\b[\\s\\S]{0,260}?\\b(IN\\s*\\(|=\\s*ANY\\s*\\(ARRAY\\[)`, 'gi')
      let keyMatch = keyRegex.exec(sql)
      while (keyMatch) {
        const snippet = sql.slice(keyMatch.index, Math.min(sql.length, keyMatch.index + 340))
        for (const literal of extractQuotedLiterals(snippet)) {
          literalsByKey[key].add(literal)
        }
        keyMatch = keyRegex.exec(sql)
      }
    }
  }

  for (const fileName of CONFIG_FILES) {
    addProjectConfigLiterals(literalsByKey, path.join(repoRoot, fileName))
  }

  return literalsByKey
}

function isTaskLikeContext(source, matchIndex, value) {
  if (value.includes('${')) return false
  const start = Math.max(0, matchIndex - 220)
  const end = Math.min(source.length, matchIndex + 220)
  const window = source.slice(start, end)
  return /(\.createTask\(|\.updateTask\(|\.getTasks\(|\.updateTasksByFilter\(|\bcreateTask\(|\bupdateTask\(|\bgetTasks\()/m.test(window)
}

function scanCodeLiterals(repoRoot) {
  const findings = []
  const keyRegex = /\b(status|model|agent_id|project_id)\b\s*:\s*(['"])([^'"\\]*(?:\\.[^'"\\]*)*)\2/g

  for (const relativeDir of SCAN_DIRS) {
    for (const filePath of listCodeFiles(repoRoot, relativeDir)) {
      const source = fs.readFileSync(filePath, 'utf8')
      let match = keyRegex.exec(source)
      while (match) {
        if (isTaskLikeContext(source, match.index, match[3])) {
          const before = source.slice(0, match.index)
          const line = before.split('\n').length
          findings.push({ key: match[1], value: match[3], filePath, line })
        }
        match = keyRegex.exec(source)
      }
    }
  }

  return findings
}

function validateLiterals(findings, allowedByKey) {
  const violations = []
  for (const finding of findings) {
    const allowed = allowedByKey[finding.key]
    if (!allowed || !allowed.has(finding.value)) {
      violations.push(finding)
    }
  }
  return violations
}

function main() {
  const repoRoot = process.cwd()
  const allowed = collectAllowedLiterals(repoRoot)
  const findings = scanCodeLiterals(repoRoot)
  const violations = validateLiterals(findings, allowed)

  if (violations.length > 0) {
    console.error('[schema-coupling] Unknown enum/config literals detected:')
    for (const violation of violations) {
      const relativePath = path.relative(repoRoot, violation.filePath)
      console.error(`  - ${relativePath}:${violation.line} ${violation.key}: '${violation.value}'`)
    }
    process.exit(1)
  }

  console.log(`[schema-coupling] OK (${findings.length} literals validated)`)
}

if (require.main === module) {
  main()
}

module.exports = {
  collectAllowedLiterals,
  collectAllStatusLiterals,
  collectTaskStatusEnum,
  scanCodeLiterals,
  validateLiterals
}
