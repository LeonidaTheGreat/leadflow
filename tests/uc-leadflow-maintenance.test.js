const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function git(args) {
  return execSync(`git ${args}`, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

const changedFiles = git('diff main...HEAD --name-only')
  .split('\n')
  .filter(Boolean);

const packageJson = readJson('package.json');
const packageLock = readJson('package-lock.json');

assert.deepStrictEqual(
  changedFiles.sort(),
  ['package-lock.json', 'package.json'].sort(),
  `dependency audit task must only change package.json and package-lock.json; changed: ${changedFiles.join(', ')}`
);

assert.strictEqual(
  packageJson.devDependencies.uuid,
  '^14.0.0',
  'package.json must pin direct dev dependency uuid to ^14.0.0'
);

assert.strictEqual(
  packageLock.packages[''].devDependencies.uuid,
  '^14.0.0',
  'package-lock root devDependency must match package.json uuid version'
);

assert.strictEqual(
  packageLock.packages['node_modules/uuid'].version,
  '14.0.0',
  'package-lock must resolve uuid to 14.0.0'
);

assert.strictEqual(
  packageLock.packages['node_modules/follow-redirects'].version,
  '1.16.0',
  'package-lock must keep follow-redirects at 1.16.0'
);

assert.ok(
  !Object.prototype.hasOwnProperty.call(packageJson, 'testSuiteFloor'),
  'package.json must not add unused top-level metadata outside the audit-fix scope'
);

console.log('uc-leadflow-maintenance scope and dependency checks passed');
