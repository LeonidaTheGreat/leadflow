'use strict';

/*
Task Spec
What:
- Add scripts/ensure-deps.js with ensureRootDependencies() and ensureDashboardDependencies() to install missing dependencies in fresh worktrees before verification commands run.
- Update root package.json scripts to invoke ensure-deps.js before lint/test/build so verification gates stop failing with missing binary/module errors.

Verify:
- npm run lint exits 0 (no "eslint: command not found").
- npm test exits 0 (no "Cannot find module 'dotenv'").
- npm run build exits 0 (no "next: command not found").
- npm audit --audit-level=high exits 0.

Boundaries:
- Do not change business logic in routes/services/integrations.
- Do not modify database schema or migrations.
- Do not change dashboard application code.
*/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DASHBOARD = path.join(ROOT, 'product', 'lead-response', 'dashboard');

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch (_) {
    return false;
  }
}

function ensureRootDependencies() {
  const eslintBin = path.join(ROOT, 'node_modules', '.bin', 'eslint');
  const dotenvPkg = path.join(ROOT, 'node_modules', 'dotenv', 'package.json');
  if (exists(eslintBin) && exists(dotenvPkg)) return;
  run('npm install', ROOT);
}

function ensureDashboardDependencies() {
  const nextBin = path.join(DASHBOARD, 'node_modules', '.bin', 'next');
  if (exists(nextBin)) return;
  run('npm install', DASHBOARD);
}

const mode = process.argv[2] || 'root';
if (mode === 'dashboard') {
  ensureDashboardDependencies();
} else {
  ensureRootDependencies();
}
