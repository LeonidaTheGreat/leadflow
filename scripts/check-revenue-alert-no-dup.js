#!/usr/bin/env node

/**
 * scripts/check-revenue-alert-no-dup.js
 * 
 * Acceptance check for UC "Revenue Alert Idempotency & Loop Prevention"
 * 
 * Verifies that the revenue-collector implementation maintains idempotency:
 * - No multiple ACTIVE revenue alert tasks with the same title
 * - No rapid-fire task creation patterns (loop symptom)
 * 
 * Exit code: 0 = pass, 1 = fail
 * Output: "pass" or "fail"
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

async function checkRevenueAlertNoDup() {
  try {
    // Get database URL from environment
    const dbUrl = process.env.LOCAL_PG_URL;
    if (!dbUrl) {
      console.error('[ERROR] LOCAL_PG_URL not set');
      console.log('fail');
      process.exit(1);
    }

    // Parse PostgreSQL connection string
    const url = new URL(dbUrl);
    const client = require('pg').Client;
    const pg = new client({
      connectionString: dbUrl
    });

    await pg.connect();

    try {
      // Query for revenue alert tasks created in the last 2 hours
      const query = `
        SELECT 
          id,
          title,
          status,
          created_at,
          EXTRACT(EPOCH FROM created_at) as created_epoch
        FROM tasks
        WHERE title LIKE '%Revenue alert%'
          AND created_at > NOW() - INTERVAL '2 hours'
        ORDER BY title, created_at DESC
      `;

      const result = await pg.query(query);
      const tasks = result.rows;

      if (tasks.length === 0) {
        console.log('[OK] No revenue alert tasks found');
        console.log('pass');
        await pg.end();
        return true;
      }

      // Group tasks by title
      const tasksByTitle = {};
      for (const task of tasks) {
        if (!tasksByTitle[task.title]) {
          tasksByTitle[task.title] = [];
        }
        tasksByTitle[task.title].push(task);
      }

      // Check for violations
      const violations = [];

      for (const title in tasksByTitle) {
        const titleTasks = tasksByTitle[title];

        // Check 1: Multiple ACTIVE tasks with same title
        const activeTasks = titleTasks.filter(t => 
          ['ready', 'in_progress', 'spawned'].includes(t.status)
        );

        if (activeTasks.length > 1) {
          violations.push(
            `Multiple ACTIVE tasks with same title: "${title}" (count: ${activeTasks.length})`
          );
        }

        // Check 2: Rapid-fire creation pattern (loop detection)
        // If 3+ tasks created within 15 minutes, it's a loop symptom
        if (titleTasks.length >= 3) {
          const sortedByTime = titleTasks.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          );

          // Check the time gaps between consecutive tasks
          for (let i = 0; i < sortedByTime.length - 1; i++) {
            const gapSeconds = 
              (sortedByTime[i].created_epoch - sortedByTime[i + 1].created_epoch);
            
            if (gapSeconds < 900) { // 900 seconds = 15 minutes
              violations.push(
                `Rapid-fire task creation detected: "${title}" ` +
                `created ${gapSeconds}s apart (tasks: ${sortedByTime[i].id} and ${sortedByTime[i + 1].id})`
              );
              break; // Report once per title group
            }
          }
        }
      }

      await pg.end();

      if (violations.length === 0) {
        console.log('[OK] No duplicate patterns detected');
        console.log('pass');
        return true;
      } else {
        console.log('[FAIL] Violations found:');
        for (const v of violations) {
          console.log(`  - ${v}`);
        }
        console.log('fail');
        return false;
      }

    } finally {
      await pg.end();
    }

  } catch (error) {
    console.error('[ERROR]', error.message);
    console.log('fail');
    process.exit(1);
  }
}

// Run the check
checkRevenueAlertNoDup().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(err => {
  console.error('[FATAL]', err);
  console.log('fail');
  process.exit(1);
});
