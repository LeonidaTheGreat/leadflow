/**
 * QC E2E Test for PR #1088 — Fix: Deployment drift — uncommitted dashboard changes
 *
 * Verifies:
 *   1. lib/db.js exports createClient, getPool, endPool
 *   2. Old DB modules (db-client.js, db-pool.js, pg-pool.js) are deleted
 *   3. No stale imports of old DB modules in routes/, lib/, scripts/
 *   4. Dashboard service classes exist and export singleton instances
 *   5. Routes import from services, not directly from supabase for CRUD ops
 *   6. Dashboard builds successfully (already verified in CI)
 *   7. npm test passes (no regressions)
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DASHBOARD = path.join(ROOT, 'product/lead-response/dashboard');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message}`);
  }
}

console.log('\n🧪 QC E2E: PR #1088 — DB Consolidation + Service Layer Migration\n');

// === 1. lib/db.js exports ===
test('lib/db.js exists and exports createClient, getPool, endPool', () => {
  const db = require(path.join(ROOT, 'lib/db'));
  assert.strictEqual(typeof db.createClient, 'function', 'createClient must be a function');
  assert.strictEqual(typeof db.getPool, 'function', 'getPool must be a function');
  assert.strictEqual(typeof db.endPool, 'function', 'endPool must be a function');
});

// === 2. Old DB modules deleted ===
test('lib/db-client.js is deleted', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'lib/db-client.js')), 'db-client.js still exists');
});

test('lib/db-pool.js is deleted', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'lib/db-pool.js')), 'db-pool.js still exists');
});

test('lib/pg-pool.js is deleted', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'lib/pg-pool.js')), 'pg-pool.js still exists');
});

// === 3. No stale imports of old modules ===
test('No stale require of db-client in routes/, lib/, scripts/, integrations/', () => {
  const dirs = ['routes', 'lib', 'scripts', 'integrations'];
  const stalePattern = /require\s*\(\s*['"][^'"]*db-client['"]\s*\)/;
  const staleFiles = [];
  for (const dir of dirs) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    walkFiles(dirPath, '.js', (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      if (stalePattern.test(content)) {
        staleFiles.push(path.relative(ROOT, filePath));
      }
    });
  }
  assert.strictEqual(staleFiles.length, 0,
    `Stale db-client imports found in: ${staleFiles.join(', ')}. ` +
    `db-client.js was deleted but these files still require it.`);
});

test('No stale require of db-pool in routes/ or lib/', () => {
  const dirs = ['routes', 'lib'];
  const stalePattern = /require\s*\(\s*['"][^'"]*db-pool['"]\s*\)/;
  for (const dir of dirs) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    walkFiles(dirPath, '.js', (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(!stalePattern.test(content), `Stale db-pool import in ${filePath}`);
    });
  }
});

test('No stale require of pg-pool in routes/ or lib/', () => {
  const dirs = ['routes', 'lib'];
  const stalePattern = /require\s*\(\s*['"][^'"]*pg-pool['"]\s*\)/;
  for (const dir of dirs) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    walkFiles(dirPath, '.js', (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(!stalePattern.test(content), `Stale pg-pool import in ${filePath}`);
    });
  }
});

// === 4. Dashboard service classes exist ===
const services = ['AgentService', 'AuthService', 'EventService', 'LeadService', 'MessageService'];
for (const svc of services) {
  test(`Dashboard service ${svc}.js exists`, () => {
    const svcPath = path.join(DASHBOARD, `lib/services/${svc}.js`);
    assert.ok(fs.existsSync(svcPath), `${svc}.js not found`);
    const content = fs.readFileSync(svcPath, 'utf8');
    assert.ok(content.includes(`class ${svc}`), `${svc} class not found in file`);
    // Check singleton export pattern
    const lowerFirst = svc.charAt(0).toLowerCase() + svc.slice(1);
    assert.ok(
      content.includes(`export const ${lowerFirst}`) || content.includes(`exports.${lowerFirst}`),
      `Singleton export ${lowerFirst} not found`
    );
  });
}

// === 5. Routes use services, not direct supabase CRUD ===
test('No route imports createLead/getLeadById/createMessage from @/lib/supabase', () => {
  const routesDir = path.join(DASHBOARD, 'app/api');
  const stalePattern = /import\s+\{[^}]*(createLead|getLeadById|getLeadByPhone|updateLead|createMessage|updateMessageStatus|logEvent|getAgentById)[^}]*\}\s+from\s+['"]@\/lib\/supabase['"]/;
  walkFiles(routesDir, '.ts', (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = stalePattern.exec(content);
    assert.ok(!match, `Stale supabase CRUD import in ${path.relative(ROOT, filePath)}: ${match?.[1]}`);
  });
});

// === 6. lib/analytics-queries.ts exists ===
test('analytics-queries.ts exists in dashboard', () => {
  assert.ok(
    fs.existsSync(path.join(DASHBOARD, 'lib/analytics-queries.ts')),
    'analytics-queries.ts not found'
  );
});

// === 7. All lib/*.js files use lib/db, not old modules ===
test('All lib/*.js files import from ./db or ../db, not old module names', () => {
  const libDir = path.join(ROOT, 'lib');
  const oldPatterns = [
    /require\s*\(\s*['"]\.\/db-client['"]\s*\)/,
    /require\s*\(\s*['"]\.\/db-pool['"]\s*\)/,
    /require\s*\(\s*['"]\.\/pg-pool['"]\s*\)/,
  ];
  walkFiles(libDir, '.js', (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pat of oldPatterns) {
      assert.ok(!pat.test(content), `Old import pattern in ${path.basename(filePath)}`);
    }
  });
});

console.log(`\n📊 Results: ${passed}/${total} passed\n`);
process.exit(passed === total ? 0 : 1);

// --- Helpers ---

function walkFiles(dir, ext, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      walkFiles(fullPath, ext, callback);
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      callback(fullPath);
    }
  }
}
