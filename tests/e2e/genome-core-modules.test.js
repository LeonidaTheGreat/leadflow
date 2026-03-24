/**
 * E2E Test for Genome Core Modules
 * Task: af803d8d-d115-490b-9ff6-bb3c06516aaf
 * 
 * This test verifies the genome core modules are properly tested.
 * It runs the actual jest tests from the genome repository.
 */

const { execSync } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const GENOME_DIR = '/Users/clawdbot/.openclaw/genome';
const TEST_FILES = [
  'tests/local-pg.test.js',
  'tests/workflow-engine.test.js',
  'tests/parseUTC.test.js'
];

console.log('🧪 Genome Core Modules E2E Test');
console.log('================================\n');

// Test 1: Verify test files exist in genome repo
console.log('Test 1: Verify test files exist in genome repo');
for (const file of TEST_FILES) {
  const fullPath = path.join(GENOME_DIR, file);
  assert(fs.existsSync(fullPath), `Test file missing: ${file}`);
  console.log(`  ✅ ${file} exists`);
}
console.log('');

// Test 2: Verify test files exist in leadflow repo
console.log('Test 2: Verify test files exist in leadflow repo (tests/genome/)');
const LEADFLOW_TEST_DIR = path.join(__dirname, '..', 'genome');
for (const file of TEST_FILES.map(f => path.basename(f))) {
  const fullPath = path.join(LEADFLOW_TEST_DIR, file);
  assert(fs.existsSync(fullPath), `Test file missing in leadflow: ${file}`);
  console.log(`  ✅ tests/genome/${file} exists`);
}
console.log('');

// Test 3: Run jest tests and verify they pass
console.log('Test 3: Run jest tests from genome directory');
try {
  const result = execSync('npm test 2>&1', {
    cwd: GENOME_DIR,
    encoding: 'utf-8',
    timeout: 30000
  });
  
  // Check for pass indicator
  if (result.includes('Tests:') && result.includes('passed')) {
    const match = result.match(/Tests:\s+(\d+) passed/);
    if (match) {
      console.log(`  ✅ All ${match[1]} tests passed`);
    } else {
      console.log('  ✅ Tests passed');
    }
  } else if (result.includes('FAIL')) {
    throw new Error('Some tests failed');
  } else {
    console.log('  ✅ Tests executed successfully');
  }
} catch (error) {
  console.error('  ❌ Test execution failed:', error.message);
  process.exit(1);
}
console.log('');

// Test 4: Verify test content covers required functionality
console.log('Test 4: Verify test content coverage');

// Check local-pg.test.js covers required functions
const localPgContent = fs.readFileSync(path.join(GENOME_DIR, 'tests/local-pg.test.js'), 'utf-8');
assert(localPgContent.includes('select()'), 'local-pg.test.js should test select()');
assert(localPgContent.includes('insert()'), 'local-pg.test.js should test insert()');
assert(localPgContent.includes('.not('), 'local-pg.test.js should test .not()');
assert(localPgContent.includes('.contains('), 'local-pg.test.js should test .contains()');
console.log('  ✅ local-pg.test.js covers select, insert, not, contains');

// Check workflow-engine.test.js covers required functions
const workflowContent = fs.readFileSync(path.join(GENOME_DIR, 'tests/workflow-engine.test.js'), 'utf-8');
assert(workflowContent.includes('selectInitialModel'), 'workflow-engine.test.js should test selectInitialModel()');
assert(workflowContent.includes('classifyAreas'), 'workflow-engine.test.js should test classifyAreas()');
console.log('  ✅ workflow-engine.test.js covers selectInitialModel, classifyAreas');

// Check parseUTC.test.js exists and has tests
const parseUtcContent = fs.readFileSync(path.join(GENOME_DIR, 'tests/parseUTC.test.js'), 'utf-8');
assert(parseUtcContent.includes('parseUTC'), 'parseUTC.test.js should test parseUTC()');
assert(parseUtcContent.includes('Date'), 'parseUTC.test.js should test Date handling');
console.log('  ✅ parseUTC.test.js covers parseUTC function');
console.log('');

// Test 5: Verify no hardcoded secrets
console.log('Test 5: Verify no hardcoded secrets in test files');
const secretPatterns = [/sk-[a-zA-Z0-9]{20,}/, /password['"]?\s*[:=]\s*['"][^'"]+/i, /secret['"]?\s*[:=]\s*['"][^'"]+/i];
for (const file of TEST_FILES) {
  const content = fs.readFileSync(path.join(GENOME_DIR, file), 'utf-8');
  for (const pattern of secretPatterns) {
    const matches = content.match(pattern);
    assert(!matches || matches.length === 0, `Potential secret found in ${file}`);
  }
}
console.log('  ✅ No hardcoded secrets detected');
console.log('');

console.log('================================');
console.log('✅ All E2E tests passed!');
console.log('================================');
