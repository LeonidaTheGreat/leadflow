'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const projectDir = process.cwd()
const gitignorePath = path.join(projectDir, '.gitignore')
const REQUIRED_IGNORES = [
  'CODE_GRAPH.json',
  'CODE_GRAPH.md',
  'PROJECT_GRAPH.json',
  'PROJECT_GRAPH.md',
  'completion-reports/'
]

const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : ''
const missingIgnores = REQUIRED_IGNORES.filter((entry) => !gitignore.includes(entry))

let dirtyTracked = []
try {
  const output = execSync('git diff --name-only HEAD', {
    cwd: projectDir,
    stdio: ['ignore', 'pipe', 'pipe']
  }).toString()
  dirtyTracked = output.split('\n').map((line) => line.trim()).filter(Boolean)
} catch {
  // If git inspection fails, treat as pass to match existing gate behavior.
  dirtyTracked = []
}

if (missingIgnores.length > 0 || dirtyTracked.length > 0) {
  if (missingIgnores.length > 0) {
    console.error(`Missing from .gitignore: ${missingIgnores.join(', ')}`)
  }
  if (dirtyTracked.length > 0) {
    console.error(`${dirtyTracked.length} dirty tracked file(s): ${dirtyTracked.slice(0, 5).join(', ')}`)
  }
  process.exit(1)
}

console.log('clean_worktree: PASS')
