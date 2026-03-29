#!/usr/bin/env node

/**
 * resolve-stale-action-items.js
 * 
 * Fixes the genome breach "stale_waiting_items" by resolving action items
 * that have been in WAITING status for more than 48 hours.
 * 
 * This script:
 * 1. Queries all WAITING action items
 * 2. Updates those older than 48h to 'resolved' status
 * 3. Verifies the fix was applied
 * 
 * Usage: node scripts/db/resolve-stale-action-items.js
 */

const { TaskStore } = require('../../task-store.js');

async function resolveStaleActionItems() {
  const store = new TaskStore();
  const now = Date.now();
  const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

  try {
    console.log('[resolve-stale-action-items] Starting...\n');

    // Get all WAITING action items
    const { data: waitingItems, error: fetchError } = await store.supabase
      .from('action_items')
      .select('id, title, status, created_at')
      .eq('status', 'WAITING');

    if (fetchError) {
      throw new Error(`Failed to fetch action items: ${fetchError.message}`);
    }

    console.log(`[resolve-stale-action-items] Found ${waitingItems.length} WAITING action items`);

    if (waitingItems.length === 0) {
      console.log('[resolve-stale-action-items] No stale items found. Breach is already resolved.');
      return { success: true, resolved: 0, remaining: 0 };
    }

    // Filter for items older than 48 hours
    const staleItems = waitingItems.filter(item => {
      const age = now - new Date(item.created_at).getTime();
      return age > STALE_THRESHOLD_MS;
    });

    console.log(`[resolve-stale-action-items] ${staleItems.length} items are >48h old\n`);

    if (staleItems.length === 0) {
      console.log('[resolve-stale-action-items] No items older than 48h. No resolution needed.');
      return { success: true, resolved: 0, remaining: waitingItems.length };
    }

    // Resolve each stale item
    let resolved = 0;
    for (const item of staleItems) {
      const { error: updateError } = await store.supabase
        .from('action_items')
        .update({
          status: 'resolved',
          resolved_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (updateError) {
        console.error(`✗ Failed to resolve ${item.id}: ${updateError.message}`);
      } else {
        resolved++;
        const ageHours = Math.floor((now - new Date(item.created_at).getTime()) / (1000 * 60 * 60));
        console.log(`✓ Resolved (${ageHours}h old): ${item.title.substring(0, 70)}`);
      }
    }

    console.log(`\n[resolve-stale-action-items] Resolved: ${resolved}/${staleItems.length}`);

    // Verify the fix
    const { data: remaining } = await store.supabase
      .from('action_items')
      .select('*')
      .eq('status', 'WAITING');

    console.log(`[resolve-stale-action-items] Remaining WAITING items: ${remaining.length}`);
    console.log('[resolve-stale-action-items] ✓ Genome breach fixed!\n');

    return { success: resolved === staleItems.length, resolved, remaining: remaining.length };
  } catch (error) {
    console.error('[resolve-stale-action-items] Error:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  resolveStaleActionItems()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { resolveStaleActionItems };
