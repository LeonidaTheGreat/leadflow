#!/usr/bin/env node

/**
 * Task Cleanup Script
 * Removes duplicates, marks completed tasks, resets stalled tasks
 * 
 * Usage: node cleanup-tasks.js --confirm
 */

const fs = require('fs');
const path = require('path');

const TASKS_FILE = '.local-tasks.json';

function loadTasks() {
  const raw = fs.readFileSync(TASKS_FILE, 'utf8');
  return JSON.parse(raw);
}

function saveTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  console.log(`✅ Saved ${tasks.length} tasks to ${TASKS_FILE}`);
}

function cleanupDuplicates(tasks) {
  const seen = {};
  const toDelete = [];
  
  // Group by title + agent_id
  tasks.forEach(task => {
    const key = `${task.title}:${task.agent_id}`;
    
    if (!seen[key]) {
      seen[key] = task;
    } else {
      // Keep the older one (by creation time), mark newer as duplicate
      const existing = seen[key];
      const isExistingOlder = new Date(existing.created_at) < new Date(task.created_at);
      
      if (isExistingOlder) {
        toDelete.push(task.id);
      } else {
        toDelete.push(existing.id);
        seen[key] = task;
      }
    }
  });
  
  return {
    cleaned: Object.values(seen),
    deleted: toDelete
  };
}

function markCompleted(tasks) {
  const completedUpdates = [
    { title: 'Inbound SMS Handler', status: 'done' },
    { title: 'Cal.com Booking Links', status: 'done' },
    { title: 'Cal.com Booking Links (TASK-002: UC-6)', status: 'done' }
  ];
  
  const updated = [];
  completedUpdates.forEach(update => {
    tasks.forEach(task => {
      if (task.title === update.title && task.status !== 'done') {
        task.status = update.status;
        task.completed_at = new Date().toISOString();
        updated.push(task.title);
        console.log(`  ✅ Marked "${task.title}" as DONE`);
      }
    });
  });
  
  return updated;
}

function resetStalled(tasks) {
  const STALL_THRESHOLD_HOURS = 4;
  const now = new Date();
  const reset = [];
  
  tasks.forEach(task => {
    if (task.status === 'in_progress' && task.started_at) {
      const ageMs = now - new Date(task.started_at);
      const ageHours = ageMs / 3600000;
      
      if (ageHours > STALL_THRESHOLD_HOURS) {
        task.status = 'ready';
        task.started_at = null;
        task.spawn_config = null;
        task.stalled_at = now.toISOString();
        task.stall_age_hours = Math.round(ageHours);
        reset.push(task.title);
        console.log(`  ⚠️  Reset "${task.title}" from in_progress (${Math.round(ageHours)}h) → ready`);
      }
    }
  });
  
  return reset;
}

async function main() {
  const args = process.argv.slice(2);
  const confirm = args.includes('--confirm');
  
  console.log('\n📋 Task Cleanup Report\n');
  
  const tasks = loadTasks();
  console.log(`Loaded ${tasks.length} tasks from ${TASKS_FILE}\n`);
  
  // Step 1: Deduplication
  console.log('Step 1: Deduplication');
  const { cleaned, deleted } = cleanupDuplicates(tasks);
  console.log(`  📌 Found ${deleted.length} duplicate(s)`);
  deleted.forEach(id => {
    const task = tasks.find(t => t.id === id);
    console.log(`    - ${task.title} (${id})`);
  });
  
  // Step 2: Mark completed
  console.log('\nStep 2: Mark Completed Tasks');
  const marked = markCompleted(cleaned);
  console.log(`  ✅ Updated ${marked.length} task(s)`);
  
  // Step 3: Reset stalled
  console.log('\nStep 3: Reset Stalled Tasks (>4h in_progress)');
  const resetTasks = resetStalled(cleaned);
  console.log(`  ⚠️  Reset ${resetTasks.length} task(s)`);
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`  - Duplicates removed: ${deleted.length}`);
  console.log(`  - Marked completed: ${marked.length}`);
  console.log(`  - Stalled tasks reset: ${resetTasks.length}`);
  console.log(`  - Final task count: ${cleaned.length}`);
  
  if (!confirm) {
    console.log('\n⚠️  DRY RUN ONLY. Use --confirm to apply changes.');
    return;
  }
  
  console.log('\n✅ Applying changes...');
  saveTasks(cleaned);
  
  console.log('\n🎉 Cleanup complete!');
  console.log('\nNext steps:');
  console.log('  1. Verify .local-tasks.json looks correct');
  console.log('  2. Run orchestrator heartbeat');
  console.log('  3. Check that stalled tasks are auto-detected');
  console.log('  4. Spawn fresh dev agent for reset tasks');
}

main().catch(err => {
  console.error('❌ Cleanup failed:', err.message);
  process.exit(1);
});
