/**
 * E2E Regression Test: f035a8cc
 *
 * Verifies that product API routes use real_estate_agents table (not the deprecated agents table).
 *
 * Context: The agents table in LeadFlow = AI orchestration agents (Dev, QC, etc.)
 * The real_estate_agents table = paying customers (real estate agents).
 * Product API routes must query real_estate_agents for customer data.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.resolve(__dirname, '../../product/lead-response/dashboard');

const PRODUCT_API_FILES = [
  'app/api/agents/satisfaction-ping/route.ts',
  'app/api/satisfaction/stats/route.ts',
  'app/api/debug/test-formdata/route.ts',
  'app/api/debug/test-full-flow/route.ts',
];

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL: ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n=== f035a8cc: product API routes — real_estate_agents table ===\n');

// Verify each product API route uses real_estate_agents
PRODUCT_API_FILES.forEach((relPath) => {
  const fullPath = path.join(DASHBOARD_DIR, relPath);
  check(`${relPath} — exists`, () => {
    assert(fs.existsSync(fullPath), `File not found: ${fullPath}`);
  });

  check(`${relPath} — no .from('agents') in non-comment lines`, () => {
    if (!fs.existsSync(fullPath)) return; // skip if file doesn't exist
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    const badLines = lines.filter((line) => {
      const trimmed = line.trim();
      const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
      return !isComment && line.includes(".from('agents')");
    });
    assert(badLines.length === 0,
      `Found ${badLines.length} deprecated .from('agents') reference(s):\n${badLines.join('\n')}`);
  });
});

// Broad sweep — zero from('agents') in any product API route
check('Sweep: zero .from(agents) across all product API routes', () => {
  const apiDir = path.join(DASHBOARD_DIR, 'app/api');
  if (!fs.existsSync(apiDir)) return;

  const findings = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          const trimmed = line.trim();
          const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
          if (!isComment && line.includes(".from('agents')")) {
            findings.push(`${fullPath}:${idx + 1}: ${trimmed}`);
          }
        });
      }
    }
  }
  walk(apiDir);
  assert(findings.length === 0,
    `Found .from('agents') in product API routes:\n${findings.join('\n')}`);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
