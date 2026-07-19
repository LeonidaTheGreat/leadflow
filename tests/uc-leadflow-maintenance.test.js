const assert = require('assert');
const { execFileSync } = require('child_process');

const prRef = process.env.PR_REF || 'origin/dev/271c2e05-investigate-orphan-branch-dev-0ba43dd6-f';
const baseRef = process.env.BASE_REF || 'main';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const changedFiles = git(['diff', '--name-only', `${baseRef}...${prRef}`])
  .split('\n')
  .filter(Boolean);

const allowedFiles = new Set(['package.json', 'package-lock.json']);
const unexpectedFiles = changedFiles.filter((file) => !allowedFiles.has(file));

assert.deepStrictEqual(
  unexpectedFiles,
  [],
  `maintenance dependency PR must not change unrelated files: ${unexpectedFiles.join(', ')}`
);

assert(
  changedFiles.includes('package-lock.json'),
  'maintenance dependency PR must refresh package-lock.json'
);

const packageJson = JSON.parse(git(['show', `${prRef}:package.json`]));
assert.strictEqual(
  packageJson.devDependencies.uuid,
  '^14.0.0',
  'uuid devDependency must be ^14.0.0'
);
assert.strictEqual(
  packageJson.testSuiteFloor,
  undefined,
  'package.json must not add top-level numeric testSuiteFloor metadata'
);

console.log('uc-leadflow-maintenance scope checks passed');
