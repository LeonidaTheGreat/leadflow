/**
 * Unit Tests: lib/db.js — Consolidated DB Access Module
 * Task: b95a7f54-2cc7-418a-be64-b18ee55d3137
 *
 * Verifies that lib/db.js is the single canonical DB module and
 * that the old modules (db-client, db-pool, pg-pool) no longer exist.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const LIB = path.join(__dirname, '../../lib');

describe('DB Consolidation: lib/db.js', () => {
  test('lib/db.js exists', () => {
    expect(fs.existsSync(path.join(LIB, 'db.js'))).toBe(true);
  });

  test('lib/db.js can be required without error', () => {
    expect(() => require('../../lib/db')).not.toThrow();
  });

  test('exports createClient function', () => {
    const { createClient } = require('../../lib/db');
    expect(typeof createClient).toBe('function');
  });

  test('exports getPool function', () => {
    const { getPool } = require('../../lib/db');
    expect(typeof getPool).toBe('function');
  });

  test('exports endPool function', () => {
    const { endPool } = require('../../lib/db');
    expect(typeof endPool).toBe('function');
  });

  test('createClient returns a client with .from() method', () => {
    const { createClient } = require('../../lib/db');
    const client = createClient('http://test-url', 'test-key');
    expect(typeof client.from).toBe('function');
    expect(typeof client.rpc).toBe('function');
    expect(typeof client.auth).toBe('object');
  });

  test('old db-client.js file no longer exists', () => {
    const oldFile = path.join(LIB, 'db-client.js');
    expect(fs.existsSync(oldFile)).toBe(false);
  });

  test('old db-pool.js file no longer exists', () => {
    const oldFile = path.join(LIB, 'db-pool.js');
    expect(fs.existsSync(oldFile)).toBe(false);
  });

  test('old pg-pool.js file no longer exists', () => {
    const oldFile = path.join(LIB, 'pg-pool.js');
    expect(fs.existsSync(oldFile)).toBe(false);
  });

  test('no production file imports from old DB modules', () => {
    const dirsToCheck = [
      path.join(__dirname, '../../lib'),
      path.join(__dirname, '../../routes'),
      path.join(__dirname, '../../integrations'),
    ];
    const oldImports = [];
    const oldModulePattern = /require\s*\(\s*['"][^'"]*(?:db-client|pg-pool|db-pool)[^'"]*['"]\s*\)/;
    for (const dir of dirsToCheck) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir, { recursive: true })
        .filter(f => typeof f === 'string' && f.endsWith('.js'));
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (!fs.statSync(fullPath).isFile()) continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        if (oldModulePattern.test(content)) {
          oldImports.push(file);
        }
      }
    }
    expect(oldImports).toEqual([]);
  });
});
