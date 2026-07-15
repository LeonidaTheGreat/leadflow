'use strict';

/**
 * Verification: orphan branch investigation for dev/7b59e802-update-mission-metrics
 * Task: f89a45f5 (PR #1855)
 *
 * Confirms the investigation conclusion: the orphan branch's work shipped via PR #1825.
 * Tests run against the current git history, not the pending PR file.
 */

const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

async function runAll() {
  console.log('\n🧪 Orphan branch investigation verification (f89a45f5 / PR #1855)\n');

  await test('commit 72c19bc2 from PR #1825 is present on main', async () => {
    const log = execSync('git log --oneline', { cwd: ROOT }).toString();
    assert.ok(log.includes('72c19bc2'), 'Commit 72c19bc2 (PR #1825) must be on main — this is the superseding implementation');
  });

  await test('PR #1825 commit message references mission_metrics', async () => {
    const show = execSync('git show --no-patch --format="%s" 72c19bc2', { cwd: ROOT }).toString().trim();
    assert.ok(
      show.toLowerCase().includes('mission_metrics') || show.toLowerCase().includes('mission-metrics'),
      `PR #1825 commit subject should reference mission_metrics, got: "${show}"`
    );
  });

  await test('superseding SQL file from PR #1825 ships Weekly New Customers metric', async () => {
    const sqlPath = path.join(ROOT, 'scripts', 'db', 'mission-metrics-weekly-customers-seed.sql');
    assert.ok(fs.existsSync(sqlPath), 'mission-metrics-weekly-customers-seed.sql must exist on main');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    assert.ok(
      sql.toLowerCase().includes('weekly') || sql.toLowerCase().includes('customer'),
      'SQL file must reference weekly customers metric'
    );
  });

  await test('orphan SQL file from orphan branch is NOT on main (superseded)', async () => {
    // The orphan branch had scripts/db/update-mission-metrics-day119.sql
    // Main should not have a file with "day119" in the name
    const dbDir = path.join(ROOT, 'scripts', 'db');
    const files = fs.readdirSync(dbDir);
    const orphanFile = files.find(f => f.includes('day119'));
    assert.ok(!orphanFile, `Orphan file "day119" should NOT be on main — got: ${orphanFile}`);
  });

  await test('orphan branch commits are absent from main log', async () => {
    const orphanCommit = '977e1b4a';
    const log = execSync('git log --oneline', { cwd: ROOT }).toString();
    assert.ok(!log.includes(orphanCommit), `Orphan commit ${orphanCommit} should NOT appear on main (it was never merged)`);
  });

  console.log(`\n📊 Results: ${passed}/${passed + failed} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runAll().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
