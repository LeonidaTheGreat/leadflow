'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/pilots/outreach-manager.js');
const DB_URL = process.env.LOCAL_PG_URL || process.env.DATABASE_URL;

function runPsql(sql) {
  const result = spawnSync('psql', [DB_URL, '-Atc', sql], { encoding: 'utf8' });
  assert.equal(result.status, 0, `psql failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

test('outreach manager accepts short target id prefix for contact command', () => {
  assert.ok(DB_URL, 'LOCAL_PG_URL or DATABASE_URL must be set');

  const targetId = runPsql("SELECT id::text FROM pilot_recruitment_targets ORDER BY created_at ASC LIMIT 1;");
  assert.ok(targetId, 'expected at least one pilot_recruitment_targets record');
  const shortId = targetId.slice(0, 8);

  // Reset this target to baseline before test execution.
  runPsql(`
    DELETE FROM pilot_recruitment_touchpoints WHERE target_id = '${targetId}'::uuid;
    UPDATE pilot_recruitment_targets
    SET status = 'identified', updated_at = NOW()
    WHERE id = '${targetId}'::uuid;
  `);

  const command = spawnSync('node', [SCRIPT, 'contact', shortId, 'email', 'initial'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_PATH: process.env.NODE_PATH || '/Users/clawdbot/projects/leadflow/node_modules'
    }
  });

  assert.equal(command.status, 0, `contact command failed: ${command.stderr}\n${command.stdout}`);
  assert.match(command.stdout, /Marked as contacted:/);

  const status = runPsql(`SELECT status FROM pilot_recruitment_targets WHERE id = '${targetId}'::uuid;`);
  assert.equal(status, 'contacted');

  const touchCount = Number(runPsql(`SELECT COUNT(*) FROM pilot_recruitment_touchpoints WHERE target_id = '${targetId}'::uuid;`));
  assert.ok(touchCount >= 1, 'expected at least one touchpoint row after contact command');
});
