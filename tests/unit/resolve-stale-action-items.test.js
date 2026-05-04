'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function createQueryBuilder(waitingItems, calls, updateErrorById = {}) {
  return {
    select() {
      const selectIndex = calls.selectIndex++;
      return {
        eq(column, value) {
          if (selectIndex === 0) {
            calls.waitingFilters.push([column, value]);
            if (column === 'status' && value === 'WAITING') {
              return Promise.resolve({ data: waitingItems, error: null });
            }
            return this;
          }

          calls.remainingFilters.push([column, value]);
          if (column === 'status' && value === 'WAITING') {
            return Promise.resolve({ data: [], error: null });
          }
          return this;
        }
      };
    },
    update(payload) {
      return {
        eq(column, value) {
          calls.updates.push({ column, value, payload });
          return Promise.resolve({ error: updateErrorById[value] || null });
        }
      };
    }
  };
}

test('resolveStaleActionItems scopes to leadflow and resolves stale rows as RESOLVED', async () => {
  const calls = { waitingFilters: [], remainingFilters: [], updates: [], selectIndex: 0 };
  const staleCreatedAt = new Date(Date.now() - (50 * 60 * 60 * 1000)).toISOString();
  const freshCreatedAt = new Date(Date.now() - (2 * 60 * 60 * 1000)).toISOString();
  const waitingItems = [
    { id: 'old-1', title: 'Old waiting', status: 'WAITING', created_at: staleCreatedAt },
    { id: 'new-1', title: 'New waiting', status: 'WAITING', created_at: freshCreatedAt }
  ];

  const queryBuilder = createQueryBuilder(waitingItems, calls);
  const mockStore = { supabase: { from: () => queryBuilder } };

  const { resolveStaleActionItems } = require('../../scripts/db/resolve-stale-action-items.js');
  const result = await resolveStaleActionItems({ store: mockStore });

  assert.equal(result.success, true);
  assert.equal(result.resolved, 1);
  assert.deepEqual(calls.waitingFilters, [['project_id', 'leadflow'], ['status', 'WAITING']]);
  assert.deepEqual(calls.remainingFilters, [['project_id', 'leadflow'], ['status', 'WAITING']]);
  assert.equal(calls.updates.length, 1);
  assert.equal(calls.updates[0].value, 'old-1');
  assert.equal(calls.updates[0].payload.status, 'RESOLVED');
});

test('resolveStaleActionItems reports failure when update returns error', async () => {
  const calls = { waitingFilters: [], remainingFilters: [], updates: [], selectIndex: 0 };
  const staleCreatedAt = new Date(Date.now() - (72 * 60 * 60 * 1000)).toISOString();
  const waitingItems = [{ id: 'old-err', title: 'Broken update', status: 'WAITING', created_at: staleCreatedAt }];
  const queryBuilder = createQueryBuilder(waitingItems, calls, { 'old-err': { message: 'permission denied' } });
  const mockStore = { supabase: { from: () => queryBuilder } };

  const { resolveStaleActionItems } = require('../../scripts/db/resolve-stale-action-items.js');
  const result = await resolveStaleActionItems({ store: mockStore });

  assert.equal(result.success, false);
  assert.equal(result.resolved, 0);
});
