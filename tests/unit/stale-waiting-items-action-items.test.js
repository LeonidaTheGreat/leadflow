'use strict';

const assert = require('assert');

function createSupabaseMock(waitingItems) {
  const updates = [];

  const client = {
    from(table) {
      assert.strictEqual(table, 'action_items');

      return {
        select() {
          return {
            eq(column, value) {
              assert.strictEqual(column, 'status');
              if (value === 'WAITING') {
                return Promise.resolve({ data: waitingItems, error: null });
              }
              throw new Error(`Unexpected status filter: ${value}`);
            }
          };
        },
        update(payload) {
          return {
            eq(column, value) {
              assert.strictEqual(column, 'id');
              updates.push({ id: value, payload });
              return Promise.resolve({ error: null });
            }
          };
        }
      };
    }
  };

  return { client, updates };
}

async function run() {
  const staleCreatedAt = new Date(Date.now() - (72 * 60 * 60 * 1000)).toISOString();
  const freshCreatedAt = new Date(Date.now() - (2 * 60 * 60 * 1000)).toISOString();
  const waitingItems = [
    { id: 'stale-1', title: 'Old waiting item', status: 'WAITING', created_at: staleCreatedAt },
    { id: 'fresh-1', title: 'Fresh waiting item', status: 'WAITING', created_at: freshCreatedAt }
  ];

  const { client, updates } = createSupabaseMock(waitingItems);

  const taskStorePath = require.resolve('../../task-store.js');
  require.cache[taskStorePath] = {
    id: taskStorePath,
    filename: taskStorePath,
    loaded: true,
    exports: {
      TaskStore: class TaskStore {
        constructor() {
          this.supabase = client;
        }
      }
    }
  };

  const modulePath = require.resolve('../../scripts/db/resolve-stale-action-items.js');
  delete require.cache[modulePath];
  const { resolveStaleActionItems } = require(modulePath);

  const result = await resolveStaleActionItems();

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.resolved, 1);
  assert.strictEqual(updates.length, 1, 'Only stale item should be updated');
  assert.strictEqual(updates[0].id, 'stale-1');
  assert.strictEqual(updates[0].payload.status, 'RESOLVED', 'Status must use canonical uppercase value');
  assert.ok(updates[0].payload.resolved_date, 'resolved_date must be set');

  console.log('PASS stale-waiting-items-action-items');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
