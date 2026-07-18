#!/usr/bin/env node
/*
TASK SPEC (06b4de87-1335-410d-9ab5-49d009b352af)
What:
- Change package.json script "test" to call scripts/test-suite-gate.js.
- Add scripts/test-suite-gate.js as the repo-owned npm test entrypoint.
- Keep the existing root test behavior by delegating to integrations/test-e2e-flow.js with process.execPath.
- Change integrations/test-e2e-flow.js E2ETestSuite.testFubApiConnectivity() and
  E2ETestSuite.testTwilioApiConnectivity() so root npm tests use mocked flow when
  live third-party credentials or network access are unavailable.

Verify:
- Run: npm test
- Expected: command exits 0, exercises the mocked E2E flow, and does not attempt
  to resolve /Users/clawdbot/projects/leadflow/node_modules/.bin/jest.
- Run: node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('package.json','utf8')); if(pkg.scripts.test!=='node scripts/test-suite-gate.js') process.exit(1)"
- Expected: exits 0, proving the root npm test entrypoint is repo-owned.

Boundaries:
- Do not modify application source, routes, services, database schema, or product dashboard code.
- Do not change protected generated files or project.config.json.
- Do not install, remove, replace, or chmod node_modules outside this assigned task worktree.
*/

const { spawnSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const e2eFlowPath = path.join(repoRoot, 'integrations', 'test-e2e-flow.js');

const result = spawnSync(process.execPath, [e2eFlowPath], {
  cwd: repoRoot,
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`[test-suite-gate] Failed to start tests: ${result.error.message}`);
  process.exit(1);
}

if (result.signal) {
  console.error(`[test-suite-gate] Tests terminated by signal: ${result.signal}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
