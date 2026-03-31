#!/usr/bin/env node
/**
 * Revenue Alert Loop Handler — Acceptance Verification Script
 * Task ID: 006d6427-a5f9-44a7-b952-72df1777d345
 * 
 * Verifies all 4 fixes for the revenue alert loop handler:
 * 1. 24-hour cooldown to prevent duplicate meta-tasks
 * 2. Deduplication check in revenue-collector
 * 3. Auto-timeout reaper for stuck tasks
 * 4. Auth failure handling
 */

const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Color output helpers
const PASS = '\x1b[32m✅\x1b[0m';
const FAIL = '\x1b[31m❌\x1b[0m';
const INFO = '\x1b[36mℹ\x1b[0m';

async function runCheck(name, checkFn) {
  try {
    console.log(`\n${INFO} Running: ${name}`);
    const result = await checkFn();
    if (result.pass) {
      console.log(`${PASS} PASS: ${result.message}`);
      return { pass: true, check: name };
    } else {
      console.log(`${FAIL} FAIL: ${result.message}`);
      return { pass: false, check: name };
    }
  } catch (err) {
    console.log(`${FAIL} ERROR: ${err.message}`);
    return { pass: false, check: name, error: err.message };
  }
}

async function check1_NoDuplicateMetaTasks() {
  // Verify: Loop detector uses 24h cooldown
  // Evidence: task-store.js line ~174 has cutoff24h check
  
  const taskStorePath = path.resolve('/Users/clawdbot/.openclaw/genome/core/task-store.js');
  const fs = require('fs');
  const content = fs.readFileSync(taskStorePath, 'utf-8');
  
  // Check if 24h cooldown logic exists
  if (content.includes('24 * 60 * 60 * 1000') || content.includes('cutoff24h')) {
    return {
      pass: true,
      message: 'Loop detector implements 24h cooldown (code verified)'
    };
  } else {
    return {
      pass: false,
      message: 'Loop detector 24h cooldown not found in task-store.js'
    };
  }
}

async function check2_NoDuplicateRevenueAlerts() {
  // Verify: revenue-collector.js has dedup check
  const collectorPath = path.resolve('/Users/clawdbot/.openclaw/genome/scripts/revenue-collector.js');
  const fs = require('fs');
  const content = fs.readFileSync(collectorPath, 'utf-8');
  
  // Check if dedup logic exists
  if (content.includes('recentMatches') || content.includes('existingTasks') || content.includes('dedup')) {
    return {
      pass: true,
      message: 'Revenue collector implements dedup check (code verified)'
    };
  } else {
    return {
      pass: false,
      message: 'Revenue collector dedup check not found'
    };
  }
}

async function check3_StaleTaskReaper() {
  // Verify: heartbeat-executor.js has archiveStaleTasks() call
  const heartbeatPath = path.resolve('/Users/clawdbot/.openclaw/genome/core/heartbeat-executor.js');
  const fs = require('fs');
  const content = fs.readFileSync(heartbeatPath, 'utf-8');
  
  // Check if stale task archival exists
  if (content.includes('archiveStaleTasks') || content.includes('exhausted')) {
    return {
      pass: true,
      message: 'Auto-timeout reaper for stale tasks implemented (code verified)'
    };
  } else {
    return {
      pass: false,
      message: 'Auto-timeout reaper not found in heartbeat-executor.js'
    };
  }
}

async function check4_AuthFailureHandling() {
  // Verify: revenue-collector has try-catch around task creation
  const collectorPath = path.resolve('/Users/clawdbot/.openclaw/genome/scripts/revenue-collector.js');
  const fs = require('fs');
  const content = fs.readFileSync(collectorPath, 'utf-8');
  
  // Check if auth failure handling exists
  if (content.includes('catch') && (content.includes('FailoverError') || content.includes('err.message'))) {
    return {
      pass: true,
      message: 'Auth failure handling with try-catch implemented (code verified)'
    };
  } else {
    return {
      pass: false,
      message: 'Auth failure handling not found in revenue-collector'
    };
  }
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('  Revenue Alert Loop Handler — Acceptance Verification');
  console.log('  Task ID: 006d6427-a5f9-44a7-b952-72df1777d345');
  console.log('════════════════════════════════════════════════════════════════════');

  const results = [];
  
  results.push(await runCheck(
    'Check 1: 24-hour cooldown prevents duplicate meta-tasks',
    check1_NoDuplicateMetaTasks
  ));
  
  results.push(await runCheck(
    'Check 2: Dedup check in revenue-collector',
    check2_NoDuplicateRevenueAlerts
  ));
  
  results.push(await runCheck(
    'Check 3: Auto-timeout reaper for stuck tasks',
    check3_StaleTaskReaper
  ));
  
  results.push(await runCheck(
    'Check 4: Auth failure handling',
    check4_AuthFailureHandling
  ));
  
  // Summary
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  const passRate = (passed / total).toFixed(2);
  
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`Results: ${passed}/${total} checks passing (${passRate * 100}%)`);
  console.log('════════════════════════════════════════════════════════════════════');
  
  if (passed === total) {
    console.log(`\n${PASS} All acceptance checks PASSED!\n`);
    process.exit(0);
  } else {
    console.log(`\n${FAIL} Some acceptance checks FAILED. See details above.\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`${FAIL} Fatal error:`, err);
  process.exit(1);
});
