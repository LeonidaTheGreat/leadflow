#!/usr/bin/env node

/**
 * Test: Verify all from('agents') references have been migrated to from('real_estate_agents')
 * Task: fix-remaining-agents-table-references
 * Task ID: 6dd45e69-1e98-4b9f-b156-71afd644f8ef
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'product/lead-response/dashboard/app/api/agents/check-email/route.ts',
  'product/lead-response/dashboard/app/api/agents/profile/route.ts',
  'product/lead-response/dashboard/app/api/agents/satisfaction-ping/route.ts',
  'product/lead-response/dashboard/app/api/onboarding/check-email/route.ts',
  'product/lead-response/dashboard/app/api/onboarding/submit/route.ts',
  'product/lead-response/dashboard/app/api/satisfaction/stats/route.ts',
  'product/lead-response/dashboard/app/api/stripe/portal-session/route.ts',
  'product/lead-response/dashboard/app/api/webhook/route.ts',
  'product/lead-response/dashboard/app/api/webhook/fub/route.ts',
  'product/lead-response/dashboard/app/api/webhook/twilio/route.ts',
  'product/lead-response/dashboard/app/api/webhooks/stripe/route.ts',
  'product/lead-response/dashboard/lib/supabase.ts',
];

let passed = 0;
let failed = 0;
const failures = [];

console.log('🧪 Testing agents table migration...\n');

requiredFiles.forEach((filePath) => {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ MISSING: ${filePath}`);
    failed++;
    failures.push(`File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  
  // Count occurrences
  const oldPatternMatches = content.match(/from\(['"]agents['"]\)/g) || [];
  const newPatternMatches = content.match(/from\(['"]real_estate_agents['"]\)/g) || [];
  
  // Filter out false positives (e.g., in comments, import paths, etc.)
  // We only care about actual Supabase .from() calls
  const actualOldMatches = oldPatternMatches.filter(match => {
    // This is imperfect but works for our case
    const index = content.indexOf(match);
    const contextStart = Math.max(0, index - 100);
    const context = content.substring(contextStart, index + 50);
    return context.includes('.from(');
  });

  const hasOldReferences = actualOldMatches.length > 0;
  const hasNewReferences = newPatternMatches.length > 0;

  if (hasOldReferences) {
    console.log(`❌ FAILED: ${filePath}`);
    console.log(`   Still has ${actualOldMatches.length} references to from('agents')`);
    failed++;
    failures.push(`${filePath}: Still has old from('agents') references`);
  } else if (!hasNewReferences) {
    console.log(`⚠️  WARNING: ${filePath}`);
    console.log(`   No from('real_estate_agents') references found`);
    // This might be OK for some files, so just warn
  } else {
    console.log(`✅ PASSED: ${filePath}`);
    console.log(`   Found ${newPatternMatches.length} correct from('real_estate_agents') references`);
    passed++;
  }
});

console.log(`\n📊 Results:`);
console.log(`   ✅ Passed: ${passed}/${requiredFiles.length}`);
console.log(`   ❌ Failed: ${failed}/${requiredFiles.length}`);

if (failures.length > 0) {
  console.log(`\n🔴 Failures:`);
  failures.forEach(f => console.log(`   - ${f}`));
  process.exit(1);
}

if (passed > 0) {
  console.log(`\n✅ All critical files migrated successfully!`);
  process.exit(0);
}
