const assert = require('assert');
const { execFileSync } = require('child_process');

function run(command, args) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

const changedFiles = run('git', ['diff', '--name-only', 'main...HEAD'])
  .split('\n')
  .filter(Boolean)
  .filter((file) => file !== 'tests/uc-leadflow-maintenance.test.js');

const allowedFiles = new Set(['package.json', 'package-lock.json']);
const unexpectedFiles = changedFiles.filter((file) => !allowedFiles.has(file));

assert.deepStrictEqual(
  unexpectedFiles,
  [],
  `maintenance dependency fix must not change unrelated files: ${unexpectedFiles.join(', ')}`
);

assert(
  changedFiles.includes('package-lock.json'),
  'maintenance dependency fix must include package-lock.json in the PR diff'
);

const packageJson = require('../package.json');
const packageLock = require('../package-lock.json');
const rootPackage = packageLock.packages[''];

assert.strictEqual(packageJson.devDependencies.uuid, '^14.0.0');
assert.strictEqual(rootPackage.devDependencies.uuid, '^14.0.0');
assert.strictEqual(packageLock.packages['node_modules/uuid'].version, '14.0.0');
assert.strictEqual(packageLock.packages['node_modules/follow-redirects'].version, '1.16.0');

console.log('uc-leadflow-maintenance acceptance checks passed');
