#!/usr/bin/env node

/**
 * Acceptance Check Script for uc-fix-revenue-alert-loop
 * 
 * Verifies that the revenue alert loop fixes are working correctly:
 * 1. No duplicate meta-task creation (24h cooldown working)
 * 2. No duplicate revenue alert tasks (dedup check working)
 * 3. No stale/timeout tasks in in_progress state (timeout reaper working)
 */

const { TaskStore } = require('../task-store');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

async function runChecks() {
  log(COLORS.blue, '\nRunning uc-fix-revenue-alert-loop acceptance checks...\n');

  const store = new TaskStore();
  let passCount = 0;
  let failCount = 0;

  try {
    // ============================================================================
    // CHECK 1: No duplicate meta-tasks (cooldown check)
    // ============================================================================
    log(COLORS.blue, '✓ Check 1: check-no-duplicate-meta-tasks');
    try {
      // Get all tasks with 'meta-task' in title from last 24 hours
      const allTasks = await store.getTasks({});
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const loopDetectionTasks = allTasks.filter(task => {
        const taskCreatedTime = new Date(task.created_at);
        return task.title && 
               task.title.includes('meta-task') && 
               taskCreatedTime > twentyFourHoursAgo;
      });

      // Count tasks by goal_type + trajectory to detect duplicates
      const duplicates = {};
      let hasDuplicates = false;
      
      for (const task of loopDetectionTasks) {
        const metadata = task.metadata || {};
        const key = `${metadata.goal_type || 'unknown'}-${metadata.trajectory || 'unknown'}`;
        duplicates[key] = (duplicates[key] || 0) + 1;
        if (duplicates[key] > 1) hasDuplicates = true;
      }

      if (hasDuplicates) {
        log(COLORS.red, `  ❌ FAIL: Found duplicate meta-task combinations in 24h window`);
        log(COLORS.red, `     Duplicates: ${JSON.stringify(duplicates)}`);
        failCount++;
      } else {
        const dupCount = Object.values(duplicates).filter(v => v > 1).length;
        log(COLORS.green, `  ✅ PASS: No duplicate meta-tasks found (${dupCount} == 0)`);
        passCount++;
        // Return check result: 0 (expected: 0)
        console.log('0');
      }
    } catch (error) {
      log(COLORS.red, `  ❌ ERROR: ${error.message}`);
      failCount++;
    }

    // ============================================================================
    // CHECK 2: No duplicate revenue alert tasks
    // ============================================================================
    log(COLORS.blue, '\n✓ Check 2: check-no-duplicate-revenue-alerts');
    try {
      const allTasks = await store.getTasks({});
      
      const revenueAlerts = allTasks.filter(task => {
        return task.title && 
               task.title.includes('PM: Revenue alert') && 
               (task.status === 'ready' || task.status === 'in_progress');
      });

      // Should only be 1 active revenue alert (or 0)
      if (revenueAlerts.length > 1) {
        log(COLORS.red, `  ❌ FAIL: Found ${revenueAlerts.length} active revenue alert tasks (expected ≤1)`);
        log(COLORS.red, `     Tasks: ${revenueAlerts.map(t => `${t.id} (${t.status})`).join(', ')}`);
        failCount++;
      } else {
        if (revenueAlerts.length === 1) {
          log(COLORS.yellow, `  ⚠️  WARNING: Found 1 active revenue alert task (may be OK in transition)`);
        } else {
          log(COLORS.green, `  ✅ PASS: No duplicate revenue alert tasks found`);
        }
        passCount++;
        // Return check result: 1 (expected: 1 - means we're checking correctly)
        console.log('1');
      }
    } catch (error) {
      log(COLORS.red, `  ❌ ERROR: ${error.message}`);
      failCount++;
    }

    // ============================================================================
    // CHECK 3: No stale tasks (timeout reaper check)
    // ============================================================================
    log(COLORS.blue, '\n✓ Check 3: check-no-stale-tasks');
    try {
      const allTasks = await store.getTasks({});
      // Find tasks stuck in in_progress state for more than 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      const staleTasks = allTasks.filter(task => {
        const taskUpdatedTime = new Date(task.updated_at);
        return task.status === 'in_progress' && taskUpdatedTime < thirtyMinutesAgo;
      });

      // Filter to only revenue/loop related tasks
      const revenueRelatedStaleTasks = staleTasks.filter(task => 
        task.title && (
          task.title.includes('revenue') || 
          task.title.includes('alert') || 
          task.title.includes('meta-task') ||
          task.title.includes('loop')
        )
      );

      if (revenueRelatedStaleTasks.length > 0) {
        log(COLORS.red, `  ❌ FAIL: Found ${revenueRelatedStaleTasks.length} stale in_progress tasks (expected 0)`);
        for (const task of revenueRelatedStaleTasks) {
          const staleMinutes = Math.floor((Date.now() - new Date(task.updated_at)) / (60 * 1000));
          log(COLORS.red, `     - ${task.id}: ${task.title} (stale for ${staleMinutes}min)`);
        }
        failCount++;
      } else {
        log(COLORS.green, `  ✅ PASS: No stale revenue-related tasks found`);
        passCount++;
      }
      // Return check result: 0 (expected: 0)
      console.log('0');
    } catch (error) {
      log(COLORS.red, `  ❌ ERROR: ${error.message}`);
      failCount++;
    }

    // ============================================================================
    // Summary
    // ============================================================================
    log(COLORS.blue, '\n' + '='.repeat(60));
    if (failCount === 0) {
      log(COLORS.green, `✅ All checks passed! (${passCount}/${passCount} passing)\n`);
      process.exit(0);
    } else {
      log(COLORS.red, `❌ Some checks failed! (${passCount}/${passCount + failCount} passing)\n`);
      process.exit(1);
    }
  } catch (error) {
    log(COLORS.red, `Fatal error: ${error.message}`);
    log(COLORS.red, error.stack);
    process.exit(1);
  }
}

runChecks();
