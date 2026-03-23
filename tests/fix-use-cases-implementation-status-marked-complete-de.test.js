/**
 * E2E Test: fix-use-cases-implementation-status-marked-complete-de
 * 
 * This test verifies that the agents table reference fix has been properly applied.
 * The issue was that use_cases.implementation_status was marked complete despite
 * the fix not being applied - product code was still querying the 'agents' table
 * (orchestration task table) instead of 'real_estate_agents' (customer table).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// ANSI colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  const color = type === 'pass' ? colors.green : type === 'fail' ? colors.red : colors.yellow;
  console.log(`${color}${message}${colors.reset}`);
}

// Test configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DASHBOARD_DIR = path.join(PROJECT_ROOT, 'product/lead-response/dashboard');
const LIB_DIR = path.join(PROJECT_ROOT, 'lib');

// Files that should have been updated to use real_estate_agents
const CRITICAL_FILES = [
  // Dashboard API routes
  'app/api/webhook/route.ts',
  'app/api/webhook/fub/route.ts',
  'app/api/webhook/twilio/route.ts',
  'app/api/auth/login/route.ts',
  'app/api/auth/pilot-signup/route.ts',
  'app/api/auth/trial-signup/route.ts',
  'app/api/auth/forgot-password/route.ts',
  'app/api/auth/reset-password/route.ts',
  'app/api/agents/check-email/route.ts',
  'app/api/agents/satisfaction-ping/route.ts',
  'app/api/agents/profile/route.ts',
  'app/api/satisfaction/stats/route.ts',
  'app/api/webhooks/stripe/route.ts',
  'app/api/onboarding/check-email/route.ts',
  'app/api/onboarding/submit/route.ts',
  'app/api/stripe/portal-session/route.ts',
  'app/api/health/route.ts',
  // Lib files
  'lib/supabase.ts',
  'lib/subscription-service.js',
  'lib/webhook-processor.js',
  'lib/billing-cycle-manager.js',
  'lib/calcom-webhook-handler.js',
  'lib/booking-link-service.js',
];

// Scripts that should have been updated
const SCRIPT_FILES = [
  'scripts/update-dashboard.ts',
  'scripts/validate-system.ts',
  'auto-create-tables.js',
  'check-agents-table.js',
  'execute-migration.js',
  'e2e-stripe-integration-test.js',
  'stripe-e2e-test-v2.js',
];

function checkFileForPattern(filePath, pattern, shouldExist) {
  const fullPath = filePath.startsWith('lib') || filePath.startsWith('scripts') || filePath.startsWith('auto') || filePath.startsWith('check') || filePath.startsWith('execute') || filePath.startsWith('e2e') || filePath.startsWith('stripe')
    ? path.join(PROJECT_ROOT, filePath)
    : path.join(DASHBOARD_DIR, filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { exists: false, hasPattern: false, error: 'File not found' };
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const hasPattern = pattern.test(content);
  
  return { exists: true, hasPattern, error: null };
}

function runTests() {
  console.log('\n========================================');
  console.log('E2E TEST: Agents Table Reference Fix');
  console.log('========================================\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Verify critical files use 'real_estate_agents'
  console.log('\n📋 Test 1: Critical files use real_estate_agents table');
  const realEstateAgentsPattern = /\.from\(['"]real_estate_agents['"]\)/;
  
  for (const file of CRITICAL_FILES) {
    const result = checkFileForPattern(file, realEstateAgentsPattern, true);
    if (result.exists && result.hasPattern) {
      log(`  ✅ ${file} - uses real_estate_agents`, 'pass');
      passed++;
    } else if (!result.exists) {
      log(`  ⚠️  ${file} - file not found (skipped)`, 'info');
    } else {
      log(`  ❌ ${file} - does NOT use real_estate_agents`, 'fail');
      failed++;
    }
  }
  
  // Test 2: Verify critical files do NOT use 'agents' (except in comments)
  console.log('\n📋 Test 2: Critical files do NOT query agents table');
  const agentsPattern = /\.from\(['"]agents['"]\)/;
  
  for (const file of CRITICAL_FILES) {
    const result = checkFileForPattern(file, agentsPattern, false);
    if (!result.exists) {
      log(`  ⚠️  ${file} - file not found (skipped)`, 'info');
    } else if (!result.hasPattern) {
      log(`  ✅ ${file} - no agents table reference`, 'pass');
      passed++;
    } else {
      // Check if it's just in a comment
      const fullPath = file.startsWith('lib') 
        ? path.join(PROJECT_ROOT, file)
        : path.join(DASHBOARD_DIR, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const badLines = lines.filter(line => 
        line.includes(".from('agents')") && 
        !line.trim().startsWith('//') && 
        !line.trim().startsWith('*') &&
        !line.includes('//') // Simple check for inline comments
      );
      
      if (badLines.length === 0) {
        log(`  ✅ ${file} - agents only in comments`, 'pass');
        passed++;
      } else {
        log(`  ❌ ${file} - has agents table reference in code`, 'fail');
        failed++;
      }
    }
  }
  
  // Test 3: Verify script files use 'real_estate_agents'
  console.log('\n📋 Test 3: Script files use real_estate_agents table');
  for (const file of SCRIPT_FILES) {
    const result = checkFileForPattern(file, realEstateAgentsPattern, true);
    if (result.exists && result.hasPattern) {
      log(`  ✅ ${file} - uses real_estate_agents`, 'pass');
      passed++;
    } else if (!result.exists) {
      log(`  ⚠️  ${file} - file not found (skipped)`, 'info');
    } else {
      log(`  ❌ ${file} - does NOT use real_estate_agents`, 'fail');
      failed++;
    }
  }
  
  // Test 4: Verify specific files that were mentioned in the PR
  console.log('\n📋 Test 4: Specific files from PR description updated');
  const prMentionedFiles = [
    'lib/subscription-service.js',
    'lib/webhook-processor.js',
    'lib/billing-cycle-manager.js',
    'lib/calcom-webhook-handler.js',
    'lib/booking-link-service.js',
  ];
  
  for (const file of prMentionedFiles) {
    const fullPath = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(fullPath)) {
      log(`  ⚠️  ${file} - file not found`, 'info');
      continue;
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    const hasRealEstateAgents = content.includes(".from('real_estate_agents')");
    const hasAgents = content.includes(".from('agents')") && 
      !content.split('\n').some(line => 
        line.includes(".from('agents')") && (line.trim().startsWith('//') || line.trim().startsWith('*'))
      );
    
    if (hasRealEstateAgents && !hasAgents) {
      log(`  ✅ ${file} - properly updated`, 'pass');
      passed++;
    } else if (hasAgents) {
      log(`  ❌ ${file} - still references agents table`, 'fail');
      failed++;
    } else {
      log(`  ⚠️  ${file} - no table references found`, 'info');
    }
  }
  
  // Summary
  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  log(`✅ Passed: ${passed}`, 'pass');
  if (failed > 0) {
    log(`❌ Failed: ${failed}`, 'fail');
  }
  console.log('========================================\n');
  
  if (failed > 0) {
    console.log('❌ TEST SUITE FAILED\n');
    process.exit(1);
  } else {
    console.log('✅ ALL TESTS PASSED\n');
    process.exit(0);
  }
}

// Run tests
runTests();
