#!/usr/bin/env node
/**
 * build-health.js — Dashboard build health checker
 *
 * Runs `next build` in the dashboard directory and returns structured results.
 * Used by heartbeat-executor to catch build regressions before they block deployment.
 *
 * Throttled: only runs when source files have changed since the last successful build,
 * or at most once every 6 hours. This keeps heartbeat fast while catching regressions.
 *
 * Usage:
 *   const { checkBuildHealth } = require('./build-health')
 *   const result = await checkBuildHealth()
 *   // result: { pass: true } | { pass: false, errors: [...] }
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const DASHBOARD_DIR = path.join(__dirname, 'product', 'lead-response', 'dashboard')
const STATE_PATH = path.join(__dirname, '.build-health-state.json')
const MAX_AGE_MS = 6 * 60 * 60 * 1000 // 6 hours

// ── State Management ────────────────────────────────────────────────────────

function loadState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'))
    }
  } catch {}
  return { lastCheck: null, lastPass: null, lastHash: null, lastErrors: [] }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
}

// ── Source Hash ──────────────────────────────────────────────────────────────
// Quick hash of source file mtimes to detect changes without running the build.

function computeSourceHash() {
  const hash = crypto.createHash('md5')
  const dirs = ['app', 'components', 'lib']

  for (const dir of dirs) {
    const fullDir = path.join(DASHBOARD_DIR, dir)
    if (!fs.existsSync(fullDir)) continue
    walkDir(fullDir, (filePath) => {
      if (/\.(ts|tsx|js|jsx|css|json)$/.test(filePath)) {
        try {
          const stat = fs.statSync(filePath)
          hash.update(`${filePath}:${stat.mtimeMs}`)
        } catch {}
      }
    })
  }

  // Also include package.json and tsconfig.json
  for (const file of ['package.json', 'tsconfig.json', 'next.config.ts']) {
    const fullPath = path.join(DASHBOARD_DIR, file)
    if (fs.existsSync(fullPath)) {
      try {
        const stat = fs.statSync(fullPath)
        hash.update(`${fullPath}:${stat.mtimeMs}`)
      } catch {}
    }
  }

  return hash.digest('hex')
}

function walkDir(dir, callback) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next') continue
        walkDir(fullPath, callback)
      } else {
        callback(fullPath)
      }
    }
  } catch {}
}

// ── Build Runner ────────────────────────────────────────────────────────────

/**
 * Parse `next build` stderr/stdout for error messages.
 * Returns an array of { file, line, message } objects.
 */
function parseBuildErrors(output) {
  const errors = []

  // Pattern 1: TypeScript errors — "./path/to/file.ts:LINE:COL\nType error: ..."
  const tsPattern = /\.\/([^\s]+\.\w+):(\d+):\d+\s*\n\s*Type error:\s*(.+)/g
  let match
  while ((match = tsPattern.exec(output)) !== null) {
    errors.push({ file: match[1], line: parseInt(match[2]), message: `Type error: ${match[3].trim()}` })
  }

  // Pattern 2: Module not found (in error context, not warnings)
  // "Module not found: Can't resolve 'xxx'"
  const modulePattern = /Module not found: Can't resolve '([^']+)'/g
  while ((match = modulePattern.exec(output)) !== null) {
    // Find the file reference above it
    const before = output.slice(Math.max(0, match.index - 200), match.index)
    const fileMatch = before.match(/\.\/([^\s]+\.\w+):\d+:\d+/)
    errors.push({
      file: fileMatch ? fileMatch[1] : 'unknown',
      line: 0,
      message: `Module not found: ${match[1]}`
    })
  }

  // Pattern 3: Runtime errors during page collection — "Error: <message>"
  const runtimePattern = /Error: Failed to collect page data for ([^\n]+)\n.*?Error: ([^\n]+)/gs
  while ((match = runtimePattern.exec(output)) !== null) {
    errors.push({ file: match[1], line: 0, message: match[2].trim() })
  }

  // Deduplicate by message
  const seen = new Set()
  return errors.filter(e => {
    const key = `${e.file}:${e.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Check dashboard build health.
 *
 * @param {object} opts
 * @param {boolean} opts.force — Skip throttling, always run the build
 * @returns {{ pass: boolean, errors?: Array, skipped?: boolean, reason?: string }}
 */
async function checkBuildHealth(opts = {}) {
  const state = loadState()
  const now = Date.now()

  // Throttle: skip if source hasn't changed and last check was recent
  if (!opts.force) {
    const currentHash = computeSourceHash()
    const timeSinceLastCheck = state.lastCheck ? now - new Date(state.lastCheck).getTime() : Infinity

    if (state.lastHash === currentHash && timeSinceLastCheck < MAX_AGE_MS) {
      return {
        pass: state.lastErrors.length === 0,
        skipped: true,
        reason: 'No source changes since last check',
        errors: state.lastErrors
      }
    }

    // Even if source changed, don't check more often than every 30 minutes
    if (timeSinceLastCheck < 30 * 60 * 1000) {
      return {
        pass: state.lastErrors.length === 0,
        skipped: true,
        reason: 'Checked less than 30 minutes ago',
        errors: state.lastErrors
      }
    }

    state.lastHash = currentHash
  }

  // Run next build
  try {
    const output = execSync('npx next build 2>&1', {
      cwd: DASHBOARD_DIR,
      timeout: 180000, // 3 minute timeout
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      env: { ...process.env, NODE_ENV: 'production' }
    })

    // Build succeeded
    state.lastCheck = new Date().toISOString()
    state.lastPass = new Date().toISOString()
    state.lastErrors = []
    saveState(state)

    return { pass: true, errors: [] }
  } catch (err) {
    const output = (err.stdout || '') + '\n' + (err.stderr || '')
    const errors = parseBuildErrors(output)

    // If we couldn't parse specific errors, include a generic one
    if (errors.length === 0) {
      errors.push({
        file: 'unknown',
        line: 0,
        message: output.split('\n').filter(l => l.includes('Error')).slice(0, 3).join('; ') || 'Build failed (unknown error)'
      })
    }

    state.lastCheck = new Date().toISOString()
    state.lastErrors = errors
    saveState(state)

    return { pass: false, errors }
  }
}

module.exports = { checkBuildHealth, parseBuildErrors, loadState, saveState, STATE_PATH }
