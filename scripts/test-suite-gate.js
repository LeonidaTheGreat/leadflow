#!/usr/bin/env node
'use strict';

/*
TASK SPEC (ff53febc-83ec-44a0-a71a-db0bc3739163)
What:
- Create scripts/test-suite-gate.js as the root npm test entrypoint.
- Update package.json scripts.test to call node scripts/test-suite-gate.js.
- Update integrations/test-e2e-flow.js: E2ETestSuite constructor,
  isNetworkUnavailable(), testFubApiConnectivity(), testTwilioApiConnectivity(),
  and runAllTests().

Verify:
- Run npm test and expect exit 0, with no lookup for node_modules/.bin/jest.
- Run node scripts/test-suite-gate.js and expect the same pass/fail behavior as npm test.
- Run rg -n "node_modules/.bin/jest|jest-suite-gate|test-suite-gate" package.json scripts integrations tests
  and confirm root test no longer depends on a Jest binary.
- Run npm run build and expect exit 0.

Boundaries:
- Do not touch application routes, services, database schema, migrations, dashboard config,
  or protected generated files.
- Do not add Jest as a root dependency or install/delete node_modules in a live checkout.
- Do not run npm install or npm ci as part of the quality gates.
- Do not change external API behavior; only make the local quality gate deterministic.

Root-cause analysis:
- Failure point: the quality gate attempted to resolve a root Jest executable at
  node_modules/.bin/jest before running tests.
- Why: the root test gate drifted from the actual package state. Root package.json does
  not declare Jest, while Jest only exists in the nested Next.js dashboard package.
- Minimal correct fix: use a root Node-based test gate that checks required runtime
  dependencies and delegates to the maintained standalone E2E runner, avoiding any
  root Jest binary assumption.
*/

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const liveCheckoutRoot = '/Users/clawdbot/projects/leadflow';
const requiredPackages = ['axios', 'dotenv'];

function getCandidateNodeModuleRoots() {
  return [
    path.join(projectRoot, 'node_modules'),
    path.join(liveCheckoutRoot, 'node_modules'),
  ].filter((candidate, index, all) => (
    all.indexOf(candidate) === index && fs.existsSync(candidate)
  ));
}

function resolvePackage(packageName, moduleRoots) {
  for (const moduleRoot of moduleRoots) {
    try {
      return require.resolve(packageName, { paths: [moduleRoot] });
    } catch (_) {
      // Try the next candidate.
    }
  }
  return null;
}

function verifyEnvironment(moduleRoots) {
  const missing = requiredPackages.filter((packageName) => !resolvePackage(packageName, moduleRoots));
  if (missing.length === 0) {
    return;
  }

  console.error(
    `[test-suite-gate] Environment failure before tests: missing packages: ${missing.join(', ')}. ` +
    'Run npm install in the project worktree.'
  );
  process.exit(1);
}

function run(command, args, moduleRoots) {
  const env = {
    ...process.env,
    NODE_PATH: [
      ...moduleRoots,
      process.env.NODE_PATH || '',
    ].filter(Boolean).join(path.delimiter),
  };

  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`[test-suite-gate] Failed to start ${command}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const moduleRoots = getCandidateNodeModuleRoots();
verifyEnvironment(moduleRoots);
run(process.execPath, ['integrations/test-e2e-flow.js'], moduleRoots);
