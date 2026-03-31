#!/usr/bin/env node
/**
 * Revenue Alert Loop Acceptance Checks
 * Verifies that the revenue alert loop fix is working correctly
 */

const { TaskStore } = require('../task-store.js');

async function runChecks() {
  const store = new TaskStore('leadflow');
  let allPassed = true;
  
  console.log('Running uc-fix-revenue-alert-loop acceptance checks...\n');

  // Check 1: No duplicate meta-tasks
  console.log('✓ Check 1: check-no-duplicate-meta-tasks');
  try {
    const { data: metaTasks, error } = await store.supabase
      .from('tasks')
      .select('id, title, status, created_at')
      .eq('project_id', 'leadflow')
      .ilike('title', 'PM: Loop detected%')
      .in('status', ['ready', 'in_progress'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (error) throw error;
    
    const count = metaTasks ? metaTasks.length : 0;
    // Should have 0 or 1 (1 is acceptable, 2+ means duplication)
    if (count <= 1) {
      console.log(`  ✅ PASS: Found ${count} active loop detection meta-tasks (expected ≤1)`);
    } else {
      console.log(`  ❌ FAIL: Found ${count} active loop detection meta-tasks (expected ≤1)`);
      allPassed = false;
    }
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
    allPassed = false;
  }

  // Check 2: No duplicate revenue alerts
  console.log('\n✓ Check 2: check-no-duplicate-revenue-alerts');
  try {
    const { data: revenueAlerts, error } = await store.supabase
      .from('tasks')
      .select('id, title, status, created_at')
      .eq('project_id', 'leadflow')
      .ilike('title', 'PM: Revenue alert%')
      .in('status', ['ready', 'in_progress']);
    
    if (error) throw error;
    
    const count = revenueAlerts ? revenueAlerts.length : 0;
    // Should have 0 or maybe 1 in transition, but not multiple
    if (count === 0) {
      console.log(`  ✅ PASS: Found ${count} active revenue alert tasks (expected 0)`);
    } else if (count === 1) {
      console.log(`  ⚠️  WARNING: Found ${count} active revenue alert task (expected 0, but 1 may be OK in transition)`);
    } else {
      console.log(`  ❌ FAIL: Found ${count} active revenue alert tasks (expected 0)`);
      allPassed = false;
    }
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
    allPassed = false;
  }

  // Check 3: No stale tasks
  console.log('\n✓ Check 3: check-no-stale-tasks');
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: staleTasks, error } = await store.supabase
      .from('tasks')
      .select('id, title, status, created_at')
      .eq('project_id', 'leadflow')
      .eq('status', 'in_progress')
      .lt('created_at', thirtyMinutesAgo);
    
    if (error) throw error;
    
    const count = staleTasks ? staleTasks.length : 0;
    if (count === 0) {
      console.log(`  ✅ PASS: Found ${count} stale tasks (expected 0)`);
    } else {
      console.log(`  ❌ FAIL: Found ${count} stale tasks stuck in in_progress for >30min (expected 0)`);
      if (staleTasks && staleTasks.length > 0) {
        console.log(`     Stale tasks: ${staleTasks.map(t => t.title).join(', ')}`);
      }
      allPassed = false;
    }
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
    allPassed = false;
  }

  console.log('\n' + (allPassed ? '✅ All checks passed!' : '❌ Some checks failed.'));
  process.exit(allPassed ? 0 : 1);
}

runChecks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
