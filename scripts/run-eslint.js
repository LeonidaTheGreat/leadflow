'use strict';

/*
Task Spec (8f569cae-5e72-4814-8891-0885147ed21c)
What:
- Add /scripts/run-eslint.js to run eslint via local binary when present, with npm-exec fallback for clean worktrees.
- Update /package.json script "lint" to call this wrapper.
Verify:
- npm run lint exits 0 and executes eslint successfully.
- npm test exits 0.
- npm run build exits 0.
- npm audit --audit-level=high exits 0 (no high/critical).
- rg "\"lint\"" package.json confirms lint script points to node scripts/run-eslint.js.
Boundaries:
- No changes to application routes, services, database schema, or business logic.
- No changes to frontend/dashboard code.
- No dependency additions/removals.
*/

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getCommandForCurrentPlatform() {
  const localBin = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'eslint.cmd' : 'eslint');

  if (fs.existsSync(localBin)) {
    return {
      command: localBin,
      args: ['.']
    };
  }

  return {
    command: 'npm',
    args: ['exec', '--yes', '--package=eslint', '--package=globals', 'eslint', '.']
  };
}

function run(command, args) {
  return spawnSync(command, args, { stdio: 'inherit' });
}

function main() {
  const { command, args } = getCommandForCurrentPlatform();
  const result = run(command, args);

  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  getCommandForCurrentPlatform,
  run,
  main
};
