#!/usr/bin/env node
/**
 * E2E Test: feat-leadflow-repository-restructuring
 * Tests all 5 E2E specs from PRD-REPOSITORY-STRUCTURE-CONVENTION-LEADFLOW.md
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;
const failures = [];

function check(label, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ FAIL: ${label}`);
    console.log(`     ${e.message}`);
    failed++;
    failures.push({ label, error: e.message });
  }
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function notExists(relPath) {
  return !fs.existsSync(path.join(ROOT, relPath));
}

// ─────────────────────────────────────────────────────
// E2E-1: Repo Structure Audit
// ─────────────────────────────────────────────────────
console.log('\n📁 E2E-1: Repo Structure Audit');

// scripts/ subdirectories
check('scripts/migrations/ exists', () => assert(exists('scripts/migrations'), 'scripts/migrations/ missing'));
check('scripts/diagnostics/ exists', () => assert(exists('scripts/diagnostics'), 'scripts/diagnostics/ missing'));
check('scripts/simulation/ exists', () => assert(exists('scripts/simulation'), 'scripts/simulation/ missing'));
check('scripts/one-off/ exists', () => assert(exists('scripts/one-off'), 'scripts/one-off/ missing'));

// No root-level .sh files
check('No .sh files at root', () => {
  const shFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.sh'));
  assert.strictEqual(shFiles.length, 0, `Root .sh files still present: ${shFiles.join(', ')}`);
});

// No root-level PRD/DESIGN/report docs
check('No PRD-*.md files at root', () => {
  const prdFiles = fs.readdirSync(ROOT).filter(f => f.match(/^PRD-.*\.md$/));
  assert.strictEqual(prdFiles.length, 0, `Root PRD files: ${prdFiles.join(', ')}`);
});
check('No DESIGN-*.md files at root', () => {
  const designFiles = fs.readdirSync(ROOT).filter(f => f.match(/^DESIGN-.*\.md$/));
  assert.strictEqual(designFiles.length, 0, `Root DESIGN files: ${designFiles.join(', ')}`);
});

// docs/ subdirectories
check('docs/prd/ exists', () => assert(exists('docs/prd'), 'docs/prd/ missing'));
check('docs/design/ exists', () => assert(exists('docs/design'), 'docs/design/ missing'));
check('docs/guides/ exists', () => assert(exists('docs/guides'), 'docs/guides/ missing'));
check('docs/reports/ exists', () => assert(exists('docs/reports'), 'docs/reports/ missing'));

// Required docs in subdirs
check('PRD-BILLING.md in docs/prd/', () => assert(exists('docs/prd/PRD-BILLING.md'), 'missing'));
check('PRD-CORE-SMS.md in docs/prd/', () => assert(exists('docs/prd/PRD-CORE-SMS.md'), 'missing'));
check('docs/guides/ has Stripe/CALCOM/Resend guides', () => {
  const guides = fs.readdirSync(path.join(ROOT, 'docs/guides'));
  const hasStripe = guides.some(f => f.includes('STRIPE'));
  const hasCalcom = guides.some(f => f.includes('CALCOM'));
  assert(hasStripe && hasCalcom, `Missing expected guides. Got: ${guides.join(', ')}`);
});

// config/ has 3 JSON files
check('config/ exists', () => assert(exists('config'), 'config/ missing'));
check('config/budget-tracker.json exists', () => assert(exists('config/budget-tracker.json'), 'missing'));
check('config/strategy-config.json exists', () => assert(exists('config/strategy-config.json'), 'missing'));
check('config/swarm-config.json exists', () => assert(exists('config/swarm-config.json'), 'missing'));

// Old test/ dir gone
check('Old test/ directory removed (tests/ only)', () => {
  assert(notExists('test'), 'Legacy test/ directory still exists');
});

// tests/ subdirectories
check('tests/e2e/ exists', () => assert(exists('tests/e2e'), 'tests/e2e/ missing'));
check('tests/integration/ exists', () => assert(exists('tests/integration'), 'tests/integration/ missing'));
check('tests/unit/ exists', () => assert(exists('tests/unit'), 'tests/unit/ missing'));

// Root-level files that should stay
['CLAUDE.md', 'ARCHITECTURE.md', 'README.md', 'PMF.md', 'server.js'].forEach(f => {
  check(`${f} still at root`, () => assert(exists(f), `${f} missing from root`));
});

// PROJECT_STRUCTURE.md exists
check('PROJECT_STRUCTURE.md exists', () => assert(exists('PROJECT_STRUCTURE.md'), 'PROJECT_STRUCTURE.md missing'));

// ─────────────────────────────────────────────────────
// E2E-2: Path Reference Audit (no stale refs to moved config files)
// ─────────────────────────────────────────────────────
console.log('\n🔍 E2E-2: Path Reference Audit');

function findStaleRefs(pattern, exclude = []) {
  try {
    const cmd = `grep -r "${pattern}" ${ROOT} --include="*.js" --include="*.ts" --exclude-dir="node_modules" --exclude-dir=".git" --exclude-dir="completion-reports" -l 2>/dev/null`;
    const output = execSync(cmd, { encoding: 'utf-8' }).trim();
    if (!output) return [];
    return output.split('\n').filter(f => {
      const rel = path.relative(ROOT, f);
      // Exclude canonical location
      if (rel.startsWith('config/')) return false;
      // Exclude this test file
      if (rel === 'tests/feat-leadflow-repository-restructuring.test.js') return false;
      for (const ex of exclude) {
        if (rel === ex) return false;
      }
      return true;
    });
  } catch (e) {
    return []; // grep returns non-zero if no matches
  }
}

// Check for stale __dirname/../budget-tracker.json (points to root)
check('No stale __dirname + budget-tracker.json (outside config/)', () => {
  // Look specifically for __dirname path patterns that point to root
  const cmd = `grep -rn "path.join(__dirname.*budget-tracker.json\\|__dirname.*\\.\\./budget-tracker" ${ROOT}/scripts --include="*.js" 2>/dev/null || true`;
  const output = execSync(cmd, { encoding: 'utf-8' }).trim();
  assert.strictEqual(output, '', `Stale __dirname budget-tracker.json refs found:\n${output}`);
});

check('No stale process.cwd() + budget-tracker.json refs', () => {
  const cmd = `grep -rn "process.cwd().*budget-tracker.json\\|budget-tracker.json.*process.cwd()" ${ROOT}/scripts --include="*.js" 2>/dev/null || true`;
  const output = execSync(cmd, { encoding: 'utf-8' }).trim();
  assert.strictEqual(output, '', `Stale process.cwd() budget-tracker.json refs:\n${output}`);
});

check('No stale strategy-config.json refs outside config/', () => {
  const stale = findStaleRefs('strategy-config.json');
  assert.strictEqual(stale.length, 0, `Stale strategy-config.json refs: ${stale.join(', ')}`);
});

check('No stale swarm-config.json refs outside config/', () => {
  const stale = findStaleRefs('swarm-config.json');
  assert.strictEqual(stale.length, 0, `Stale swarm-config.json refs: ${stale.join(', ')}`);
});

// ─────────────────────────────────────────────────────
// E2E-3: Orchestration Symlink Integrity
// ─────────────────────────────────────────────────────
console.log('\n🔗 E2E-3: Orchestration Symlink Integrity');

['task-store.js', 'project-config-loader.js', 'subagent-completion-report.js'].forEach(sym => {
  check(`${sym} is a valid symlink`, () => {
    const full = path.join(ROOT, sym);
    assert(fs.existsSync(full), `${sym} does not exist`);
    const stat = fs.lstatSync(full);
    assert(stat.isSymbolicLink(), `${sym} is not a symlink`);
    // Verify it resolves
    const target = fs.readlinkSync(full);
    assert(fs.existsSync(target), `${sym} symlink target ${target} does not exist`);
  });
  check(`${sym} is requireable`, () => {
    require(path.join(ROOT, sym));
  });
});

// ─────────────────────────────────────────────────────
// E2E-4: Runtime Smoke
// ─────────────────────────────────────────────────────
console.log('\n🚀 E2E-4: Runtime Smoke');

check('server.js can be loaded (syntax check)', () => {
  const result = execSync(`node --check ${ROOT}/server.js 2>&1`, { encoding: 'utf-8' }).trim();
  // --check exits 0 on success, throws on error
});

check('package.json start script points to server.js', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
  assert(pkg.scripts && pkg.scripts.start, 'No start script');
  assert(pkg.scripts.start.includes('server.js'), `Start script: ${pkg.scripts.start}`);
});

// ─────────────────────────────────────────────────────
// E2E-5: CLAUDE.md Key Directories updated
// ─────────────────────────────────────────────────────
console.log('\n📝 E2E-5: CLAUDE.md Key Directories');

const claudeMd = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf-8');
check('CLAUDE.md mentions config/ dir', () => assert(claudeMd.includes('config/'), 'config/ not in CLAUDE.md'));
check('CLAUDE.md mentions scripts/ dir', () => assert(claudeMd.includes('scripts/'), 'scripts/ not in CLAUDE.md'));
check('CLAUDE.md mentions tests/ dir', () => assert(claudeMd.includes('tests/'), 'tests/ not in CLAUDE.md'));
check('CLAUDE.md mentions docs/ dir', () => assert(claudeMd.includes('docs/'), 'docs/ not in CLAUDE.md'));

// ─────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log(`📊 TEST SUMMARY: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\n❌ FAILURES:');
  failures.forEach((f, i) => console.log(`  ${i+1}. ${f.label}\n     ${f.error}`));
}
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ ALL CHECKS PASSED');
}
