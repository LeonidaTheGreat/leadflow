'use strict'

/*
Task Spec (a1456f39-6420-435c-a294-591b17c946d1)
What:
- Add scripts/build-dashboard.js with buildDashboard() to orchestrate dashboard dependency install and build retry.
- Update package.json scripts.build to call node scripts/build-dashboard.js.

Verify:
- npm run build exits 0 from repo root.
- npm run lint exits 0.
- npm test exits 0.
- npm audit --audit-level=high exits 0.

Boundaries:
- Do not modify application business logic, routes, or database schema.
- Do not modify dashboard source components/pages.
- Do not alter deployment configuration beyond build-command wiring.
*/

const { spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const dashboardDir = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard')

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: dashboardDir,
    stdio: 'pipe',
    encoding: 'utf8',
    ...opts
  })

  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)

  return result
}

function isLockFailure(stderr = '') {
  return stderr.includes('Another next build process is already running')
}

function clearNextLockIfPresent() {
  const lockPath = path.join(dashboardDir, '.next', 'lock')
  if (fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath)
    process.stdout.write(`Removed stale Next.js lock: ${lockPath}\n`)
    return true
  }
  return false
}

function buildDashboard() {
  const install = run('npm', ['ci'])
  if (install.status !== 0) {
    process.exit(install.status || 1)
  }

  const firstBuild = run('npm', ['run', 'build'])
  if (firstBuild.status === 0) {
    return
  }

  if (!isLockFailure(firstBuild.stderr || '')) {
    process.exit(firstBuild.status || 1)
  }

  clearNextLockIfPresent()
  const secondBuild = run('npm', ['run', 'build'])
  if (secondBuild.status !== 0) {
    process.exit(secondBuild.status || 1)
  }
}

if (require.main === module) {
  buildDashboard()
}

module.exports = {
  buildDashboard,
  isLockFailure,
  clearNextLockIfPresent
}
