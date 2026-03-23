/**
 * E2E Test: fix-remaining-from-agents-refs-satisfaction-debug
 * 
 * Verifies that all 5 from('agents') references have been replaced with from('real_estate_agents')
 * in the satisfaction and debug routes.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DASHBOARD_DIR = path.resolve(__dirname, '..');

const FILES_TO_CHECK = [
  'app/api/agents/satisfaction-ping/route.ts',
  'app/api/satisfaction/stats/route.ts', 
  'app/api/debug/test-formdata/route.ts',
  'app/api/debug/test-full-flow/route.ts'
];

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n=== fix-remaining-from-agents-refs-satisfaction-debug ===\n');

// 1. Verify satisfaction-ping route uses real_estate_agents (line 26)
check('satisfaction-ping/route.ts PATCH uses real_estate_agents', () => {
  const filePath = path.join(DASHBOARD_DIR, 'app/api/agents/satisfaction-ping/route.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Find the .from('agents') or .from('real_estate_agents') in PATCH
  const patchFromIndex = lines.findIndex((line, idx) => 
    idx >= 20 && idx <= 30 && line.includes(".from('")
  );
  assert(patchFromIndex !== -1, 'Could not find .from() in PATCH handler');
  assert(lines[patchFromIndex].includes("from('real_estate_agents')"), 
    `Line ${patchFromIndex + 1} should use real_estate_agents, found: ${lines[patchFromIndex].trim()}`);
});

// 2. Verify satisfaction-ping route uses real_estate_agents (line 63)
check('satisfaction-ping/route.ts GET uses real_estate_agents', () => {
  const filePath = path.join(DASHBOARD_DIR, 'app/api/agents/satisfaction-ping/route.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Find the .from('agents') or .from('real_estate_agents') in GET
  const getFromIndex = lines.findIndex((line, idx) => 
    idx >= 55 && idx <= 70 && line.includes(".from('")
  );
  assert(getFromIndex !== -1, 'Could not find .from() in GET handler');
  assert(lines[getFromIndex].includes("from('real_estate_agents')"), 
    `Line ${getFromIndex + 1} should use real_estate_agents, found: ${lines[getFromIndex].trim()}`);
});

// 3. Verify satisfaction/stats route uses real_estate_agents (line 26)
check('satisfaction/stats/route.ts uses real_estate_agents', () => {
  const filePath = path.join(DASHBOARD_DIR, 'app/api/satisfaction/stats/route.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const fromIndex = lines.findIndex((line, idx) => 
    idx >= 20 && idx <= 30 && line.includes(".from('")
  );
  assert(fromIndex !== -1, 'Could not find .from() in stats route');
  assert(lines[fromIndex].includes("from('real_estate_agents')"), 
    `Line ${fromIndex + 1} should use real_estate_agents, found: ${lines[fromIndex].trim()}`);
});

// 4. Verify debug/test-formdata route uses real_estate_agents (line 9)
check('debug/test-formdata/route.ts uses real_estate_agents', () => {
  const filePath = path.join(DASHBOARD_DIR, 'app/api/debug/test-formdata/route.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const fromIndex = lines.findIndex((line, idx) => 
    idx >= 5 && idx <= 15 && line.includes(".from('")
  );
  assert(fromIndex !== -1, 'Could not find .from() in test-formdata route');
  assert(lines[fromIndex].includes("from('real_estate_agents')"), 
    `Line ${fromIndex + 1} should use real_estate_agents, found: ${lines[fromIndex].trim()}`);
});

// 5. Verify debug/test-full-flow route uses real_estate_agents (line 9)
check('debug/test-full-flow/route.ts uses real_estate_agents', () => {
  const filePath = path.join(DASHBOARD_DIR, 'app/api/debug/test-full-flow/route.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const fromIndex = lines.findIndex((line, idx) => 
    idx >= 5 && idx <= 15 && line.includes(".from('")
  );
  assert(fromIndex !== -1, 'Could not find .from() in test-full-flow route');
  assert(lines[fromIndex].includes("from('real_estate_agents')"), 
    `Line ${fromIndex + 1} should use real_estate_agents, found: ${lines[fromIndex].trim()}`);
});

// 6. Grep sweep - zero from('agents') in product routes
check('Grep sweep: zero from(agents) in app/ and lib/', () => {
  try {
    const result = execSync("grep -rn \"from('agents')\" app/ lib/ 2>/dev/null || echo 'NO_MATCHES'", {
      cwd: DASHBOARD_DIR,
      encoding: 'utf8'
    });
    assert(result.trim() === 'NO_MATCHES' || result.trim() === '', 
      `Found remaining from('agents') references:\n${result}`);
  } catch (e) {
    // grep returns exit code 1 when no matches found, which is what we want
    if (e.status !== 1) {
      throw e;
    }
  }
});

// 7. Build passes
check('npm run build succeeds', () => {
  try {
    execSync('npm run build', { cwd: DASHBOARD_DIR, stdio: 'pipe', timeout: 180000 });
  } catch (e) {
    throw new Error(`Build failed: ${e.stderr ? e.stderr.toString().slice(0, 500) : e.message}`);
  }
});

// 8. No hardcoded secrets in modified files
check('No hardcoded secrets in modified files', () => {
  const secretPatterns = [/sk_live_/, /sk_test_/, /SUPABASE_SERVICE_ROLE/, /password\s*=\s*["'][^"']+/i];
  
  for (const file of FILES_TO_CHECK) {
    const filePath = path.join(DASHBOARD_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of secretPatterns) {
      assert(!pattern.test(content), `${file}: Potential secret found matching ${pattern}`);
    }
  }
});

// Summary
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
console.log('✅ All acceptance criteria met:');
console.log('   1. All 5 from(agents) references replaced with from(real_estate_agents)');
console.log('   2. No remaining from(agents) in product routes');
console.log('   3. Build passes with no TypeScript errors');
console.log('   4. No hardcoded secrets in modified files');
