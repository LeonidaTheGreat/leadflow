#!/usr/bin/env node
/**
 * Verify no-supabase-env-vars rule
 * Checks that Supabase environment variable references are not present in dashboard code
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectDir = '/Users/clawdbot/projects/leadflow';
const rule = {
  id: 'no-supabase-env-vars',
  name: 'No Supabase env var references in production code',
  pattern: 'NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY',
  scan_dirs: ['product/lead-response/dashboard/app/', 'product/lead-response/dashboard/lib/'],
  exclude_patterns: ['*.test.*', '*.spec.*', '__tests__/'],
};

console.log(`\n✓ Verifying rule: ${rule.id}`);
console.log(`  ${rule.name}`);

const dirs = rule.scan_dirs || [];
const excludes = (rule.exclude_patterns || []).map(p => `--exclude='${p}'`).join(' ');

let matches = '';
let checkedDirs = 0;

for (const dir of dirs) {
  const fullPath = path.join(projectDir, dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠ Directory not found: ${fullPath}`);
    continue;
  }
  checkedDirs++;
  console.log(`  Checking: ${fullPath}`);
  
  try {
    const result = execSync(
      `grep -rn '${rule.pattern}' "${fullPath}" ${excludes} 2>/dev/null || true`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    matches += result;
  } catch (err) {
    console.log(`  Error checking directory: ${err.message}`);
  }
}

matches = matches.trim();

if (matches) {
  const matchCount = matches.split('\n').filter(l => l.trim()).length;
  console.log(`\n❌ RULE VIOLATION: ${matchCount} match(es) found:`);
  console.log(matches.slice(0, 500));
  process.exit(1);
} else {
  console.log(`\n✅ RULE PASSED: No violations found in ${checkedDirs} director(ies)`);
  process.exit(0);
}
