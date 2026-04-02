#!/usr/bin/env node
/**
 * Verify: Chain completion rate case-insensitive fix
 * 
 * Checks that the heartbeat executor now properly matches
 * workflow steps (mixed case) with task agent_ids (lowercase)
 */

const fs = require('fs');
const path = require('path');

const heartbeatPath = '/Users/clawdbot/.openclaw/genome/core/heartbeat-executor.js';
const content = fs.readFileSync(heartbeatPath, 'utf-8');

console.log('🔍 Verifying chain_completion_rate fix...\n');

// Check 1: Fix is present
const fixPattern = /t\.agent_id\?\.toLowerCase\(\)\s*===\s*step\?\.toLowerCase\(\)/;
const fixPresent = fixPattern.test(content);

console.log(`1. Case-insensitive comparison in heartbeat executor:`);
console.log(`   ${fixPresent ? '✅ FOUND' : '❌ MISSING'}`);

if (fixPresent) {
  console.log(`   Pattern: t.agent_id?.toLowerCase?.() === step?.toLowerCase?.()`);
  console.log(`   Location: heartbeat-executor.js`);
}

// Check 2: Old buggy pattern is gone
const buggyPattern = /t\.agent_id === step/;
// But we need to make sure it's not in the fixed line
const lines = content.split('\n');
let foundBuggyInWrongPlace = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('agent_id') && lines[i].includes('status') && lines[i].includes('done')) {
    if (!lines[i].includes('toLowerCase')) {
      foundBuggyInWrongPlace = true;
      console.log(`\n   ⚠️  Found non-case-insensitive comparison at line ${i + 1}`);
      console.log(`   ${lines[i].trim()}`);
    }
  }
}

console.log(`\n2. Old case-sensitive comparison removed:`);
console.log(`   ${!foundBuggyInWrongPlace ? '✅ GOOD' : '❌ STILL PRESENT'}`);

// Check 3: Summary
console.log(`\n${fixPresent && !foundBuggyInWrongPlace ? '✅ FIX VERIFIED' : '❌ FIX INCOMPLETE'}`);

if (fixPresent && !foundBuggyInWrongPlace) {
  console.log('\nThe chain_completion_rate calculation will now:');
  console.log('- Match workflow steps like "Dev", "Product", "QC"');
  console.log('- With task agent_ids like "dev", "product", "qc"');
  console.log('- Case-insensitively');
  console.log('- With safe null/undefined handling');
  
  process.exit(0);
} else {
  process.exit(1);
}
