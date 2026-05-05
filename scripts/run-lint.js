'use strict';

/*
Task Spec
What:
- Add /scripts/run-lint.js with runLint() to execute eslint reliably when devDependencies are omitted.
- Update /package.json lint script to execute this runner instead of directly calling eslint.
- Add /tests/unit/scripts/run-lint.test.js to validate local-binary and npx fallback execution paths.
Verify:
- npm run lint exits 0 with full install and with --omit=dev install (fallback path).
- node --test tests/unit/scripts/run-lint.test.js passes.
- npm run build, npm test, npm audit --audit-level=high are executed and results recorded.
Boundaries:
- Do not modify application/business logic under routes/, lib/services/, integrations/, or database schema.
- Do not change unrelated scripts, generated docs, or deployment configuration.
- Keep scope limited to lint execution reliability for quality gate compliance.
*/

const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  return result.status === null ? 1 : result.status;
}

function runLint() {
  const eslintBin = path.join(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'eslint.cmd' : 'eslint');

  if (existsSync(eslintBin)) {
    return run(eslintBin, ['.']);
  }

  return run('npx', ['--yes', 'eslint', '.']);
}

if (require.main === module) {
  process.exit(runLint());
}

module.exports = {
  runLint,
};
