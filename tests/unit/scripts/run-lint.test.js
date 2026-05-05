'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const childProcess = require('node:child_process');
const fs = require('node:fs');

const originalSpawnSync = childProcess.spawnSync;
const originalExistsSync = fs.existsSync;

function loadRunner() {
  const modulePath = path.resolve(__dirname, '../../../scripts/run-lint.js');
  delete require.cache[modulePath];
  return require(modulePath);
}

test.afterEach(() => {
  childProcess.spawnSync = originalSpawnSync;
  fs.existsSync = originalExistsSync;
});

test('uses local eslint binary when available', () => {
  const calls = [];
  fs.existsSync = () => true;
  childProcess.spawnSync = (command, args) => {
    calls.push({ command, args });
    return { status: 0 };
  };

  const runner = loadRunner();
  const status = runner.runLint();

  assert.equal(status, 0);
  assert.equal(calls.length, 1);
  assert.match(calls[0].command, /node_modules[\\/]\.bin[\\/]eslint(\.cmd)?$/);
  assert.deepEqual(calls[0].args, ['.']);
});

test('falls back to npx eslint when local binary is missing', () => {
  const calls = [];
  fs.existsSync = () => false;
  childProcess.spawnSync = (command, args) => {
    calls.push({ command, args });
    return { status: 0 };
  };

  const runner = loadRunner();
  const status = runner.runLint();

  assert.equal(status, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'npx');
  assert.deepEqual(calls[0].args, ['--yes', 'eslint', '.']);
});
