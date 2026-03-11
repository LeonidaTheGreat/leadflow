/**
 * E2E Test: fix-prd-objective-not-fully-implemented-product-api-ro
 * 
 * This test verifies that all product API routes query the real_estate_agents table
 * instead of the agents table (which is the orchestrator task table).
 * 
 * PRD Objective: Product API routes should use real_estate_agents table
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    passed++;
  } catch (err) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

// Get all TypeScript files in the app/api directory
function getAllTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllTsFiles(fullPath, files);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Check if a line is inside a comment
function isInComment(lines, lineIndex, matchIndex) {
  let inBlockComment = false;
  for (let i = 0; i <= lineIndex; i++) {
    const line = lines[i];
    // Check for block comment start/end before the match position
    if (i === lineIndex) {
      const beforeMatch = line.substring(0, matchIndex);
      if (beforeMatch.includes('/*') && !beforeMatch.includes('*/')) inBlockComment = true;
      if (beforeMatch.includes('//')) return true; // Line comment
    } else {
      // Count block comment openings and closings
      const openCount = (line.match(/\/\*/g) || []).length;
      const closeCount = (line.match(/\*\//g) || []).length;
      if (openCount > closeCount) inBlockComment = true;
      if (closeCount > openCount) inBlockComment = false;
      if (line.includes('//')) continue; // Line comment doesn't affect block state
    }
  }
  return inBlockComment;
}

console.log('\n========================================');
console.log('E2E Test: Product API Routes Table Migration');
console.log('========================================\n');

const dashboardDir = path.join(__dirname, '..');
const apiDir = path.join(dashboardDir, 'app/api');

// Test 1: No direct .from('agents') calls in API routes
test('API routes should not use .from("agents")', () => {
  const files = getAllTsFiles(apiDir);
  const violations = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check for .from('agents') pattern
      const match = line.match(/\.from\(['"]agents['"]\)/);
      if (match) {
        // Check if it's in a comment
        if (!isInComment(lines, i, match.index)) {
          violations.push({
            file: path.relative(dashboardDir, file),
            line: i + 1,
            content: line.trim()
          });
        }
      }
    }
  }
  
  if (violations.length > 0) {
    throw new Error(
      `Found ${violations.length} violation(s):\n` +
      violations.map(v => `  ${v.file}:${v.line} - ${v.content}`).join('\n')
    );
  }
});

// Test 2: Foreign key references should use real_estate_agents
test('Foreign key references should use agent:real_estate_agents', () => {
  const files = getAllTsFiles(apiDir);
  const violations = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check for agent:agents(*) pattern (foreign key reference)
      const match = line.match(/agent:agents\(/);
      if (match) {
        // Check if it's in a comment
        if (!isInComment(lines, i, match.index)) {
          violations.push({
            file: path.relative(dashboardDir, file),
            line: i + 1,
            content: line.trim()
          });
        }
      }
    }
  }
  
  if (violations.length > 0) {
    throw new Error(
      `Found ${violations.length} foreign key violation(s):\n` +
      violations.map(v => `  ${v.file}:${v.line} - ${v.content}`).join('\n')
    );
  }
});

// Test 3: Dashboard pages should also use real_estate_agents
test('Dashboard pages should not use agent:agents foreign key', () => {
  const dashboardAppDir = path.join(dashboardDir, 'app/dashboard');
  if (!fs.existsSync(dashboardAppDir)) {
    console.log('  (Skipping - no dashboard directory found)');
    return;
  }
  
  const files = getAllTsFiles(dashboardAppDir);
  const violations = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/agent:agents\(/);
      if (match) {
        if (!isInComment(lines, i, match.index)) {
          violations.push({
            file: path.relative(dashboardDir, file),
            line: i + 1,
            content: line.trim()
          });
        }
      }
    }
  }
  
  if (violations.length > 0) {
    throw new Error(
      `Found ${violations.length} violation(s) in dashboard pages:\n` +
      violations.map(v => `  ${v.file}:${v.line} - ${v.content}`).join('\n')
    );
  }
});

// Test 4: Verify specific files mentioned in PRD are correctly using real_estate_agents
test('Specific PRD files use real_estate_agents table', () => {
  const filesToCheck = [
    'app/api/agents/satisfaction-ping/route.ts',
    'app/api/satisfaction/stats/route.ts',
    'app/api/debug/test-formdata/route.ts',
    'app/api/debug/test-full-flow/route.ts',
  ];
  
  const violations = [];
  
  for (const relativePath of filesToCheck) {
    const filePath = path.join(dashboardDir, relativePath);
    if (!fs.existsSync(filePath)) {
      continue; // File may not exist
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for direct agents table reference
    if (content.match(/\.from\(['"]agents['"]\)/)) {
      violations.push(`${relativePath}: Uses .from('agents')`);
    }
    
    // Check for foreign key reference
    if (content.match(/agent:agents\(/)) {
      violations.push(`${relativePath}: Uses agent:agents foreign key`);
    }
  }
  
  if (violations.length > 0) {
    throw new Error(
      `PRD files with violations:\n` +
      violations.map(v => `  - ${v}`).join('\n')
    );
  }
});

// Test 5: Verify webhook routes use correct table
test('Webhook routes use real_estate_agents for agent lookups', () => {
  const webhookFiles = [
    'app/api/webhook/fub/route.ts',
    'app/api/webhook/twilio/route.ts',
  ];
  
  const violations = [];
  
  for (const relativePath of webhookFiles) {
    const filePath = path.join(dashboardDir, relativePath);
    if (!fs.existsSync(filePath)) {
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Should use real_estate_agents for agent foreign key
    if (content.match(/agent:agents\(/)) {
      violations.push(`${relativePath}: Uses agent:agents instead of agent:real_estate_agents`);
    }
  }
  
  if (violations.length > 0) {
    throw new Error(
      `Webhook route violations:\n` +
      violations.map(v => `  - ${v}`).join('\n')
    );
  }
});

// Test 6: Verify lead detail page uses correct table
test('Lead detail page uses real_estate_agents foreign key', () => {
  const leadDetailPage = path.join(dashboardDir, 'app/dashboard/leads/[id]/page.tsx');
  
  if (!fs.existsSync(leadDetailPage)) {
    console.log('  (Skipping - lead detail page not found)');
    return;
  }
  
  const content = fs.readFileSync(leadDetailPage, 'utf8');
  
  // Should use real_estate_agents for agent foreign key
  if (content.match(/agent:agents\(/)) {
    throw new Error('Lead detail page uses agent:agents instead of agent:real_estate_agents');
  }
  
  // Should have the correct reference
  if (!content.match(/agent:real_estate_agents\(/)) {
    throw new Error('Lead detail page missing agent:real_estate_agents foreign key reference');
  }
});

// Summary
console.log('\n========================================');
console.log('Test Summary');
console.log('========================================');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}

console.log(`${GREEN}All tests passed!${RESET}\n`);
process.exit(0);
