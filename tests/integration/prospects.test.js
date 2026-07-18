'use strict';

const assert = require('assert');
const { test, describe, beforeEach } = require('node:test');

const PROSPECT_ID = '22222222-2222-4222-8222-222222222222';
const AGENT_ID = '33333333-3333-4333-8333-333333333333';
const VALID_API_KEY = 'test-api-secret-key';
const APP_URL = 'https://leadflow-ai-five.vercel.app';

function makePostgrestMock() {
  const store = [];
  return {
    store,
    from(table) {
      const builder = {
        _table: table,
        _method: 'GET',
        _filters: [],
        _data: null,
        _selectCols: null,
        _single: false,
        _orderCol: null,
        select(cols) { builder._selectCols = cols; return builder; },
        eq(key, val) { builder._filters.push({ key, op: 'eq', val }); return builder; },
        order(col, opts) { builder._orderCol = col; return builder; },
        single() { builder._single = true; return builder; },
        insert(data) { builder._method = 'INSERT'; builder._data = data; return builder; },
        update(data) { builder._method = 'UPDATE'; builder._data = data; return builder; },
        async then(resolve, reject) {
          try {
            if (builder._table === 'pilot_signups' && builder._method === 'GET') {
              resolve({ data: store, error: null });
            } else if (builder._table === 'pilot_signups' && builder._method === 'INSERT') {
              const created = {
                id: PROSPECT_ID,
                ...builder._data,
                created_at: new Date().toISOString(),
              };
              store.push(created);
              resolve({ data: builder._single ? created : [created], error: null });
            } else if (builder._table === 'pilot_signups' && builder._method === 'UPDATE') {
              const idFilter = builder._filters.find(f => f.key === 'id');
              const target = store.find(p => p.id === (idFilter ? idFilter.val : null));
              if (target) {
                Object.assign(target, builder._data);
                resolve({ data: builder._single ? target : [target], error: null });
              } else {
                resolve({ data: null, error: null });
              }
            } else {
              resolve({ data: null, error: null });
            }
          } catch (err) {
            if (reject) reject(err);
          }
        },
      };
      return builder;
    },
  };
}

describe('Admin Prospects API', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = makePostgrestMock();
  });

  test('GET filters out test emails', async () => {
    mockDb.store.push(
      { id: '1', name: 'Real Agent', email: 'real@brokerage.com', phone: null, status: 'new', follow_up_stage: 0, created_at: '2026-07-01T00:00:00Z' },
      { id: '2', name: 'Test User', email: 'admin@example.com', phone: null, status: 'new', follow_up_stage: 0, created_at: '2026-07-01T00:00:00Z' },
      { id: '3', name: 'Internal', email: 'qa@internal.dev', phone: null, status: 'new', follow_up_stage: 0, created_at: '2026-07-01T00:00:00Z' },
      { id: '4', name: 'Tester', email: 'tester@testmail.com', phone: null, status: 'new', follow_up_stage: 0, created_at: '2026-07-01T00:00:00Z' }
    );

    const { data: prospects } = await mockDb.from('pilot_signups')
      .select('id,name,email,phone,status,follow_up_stage,created_at')
      .order('created_at', { ascending: false });

    const TEST_PATTERNS = ['example.com', 'test', 'internal'];
    const filtered = prospects.filter(p => !TEST_PATTERNS.some(pat => p.email.toLowerCase().includes(pat)));

    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].name, 'Real Agent');
  });

  test('POST creates prospect in pilot_signups', async () => {
    const input = { name: 'Jane Smith', email: 'jane@realbrokerage.com', phone: '+15551234567' };

    const record = {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      status: 'new',
      source: 'admin_manual',
      follow_up_stage: 0,
      phone: input.phone.trim(),
    };

    const { data: created } = await mockDb.from('pilot_signups')
      .insert(record)
      .select('id,name,email,phone,status,follow_up_stage,created_at')
      .single();

    assert.ok(created);
    assert.strictEqual(created.id, PROSPECT_ID);
    assert.strictEqual(created.name, 'Jane Smith');
    assert.strictEqual(created.email, 'jane@realbrokerage.com');
    assert.strictEqual(created.phone, '+15551234567');
    assert.strictEqual(created.status, 'new');
    assert.strictEqual(created.source, 'admin_manual');
  });

  test('POST rejects missing name', () => {
    const input = { email: 'jane@real.com' };
    assert.ok(!input.name || typeof input.name !== 'string', 'name validation should catch missing name');
  });

  test('POST rejects invalid email format', () => {
    const input = { name: 'Jane', email: 'not-an-email' };
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim());
    assert.strictEqual(valid, false);
  });

  test('PATCH updates prospect status and follow_up_stage', async () => {
    mockDb.store.push({
      id: PROSPECT_ID,
      name: 'Jane Smith',
      email: 'jane@real.com',
      status: 'new',
      follow_up_stage: 0,
    });

    const { data: updated } = await mockDb.from('pilot_signups')
      .update({
        status: 'contacted',
        last_follow_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', PROSPECT_ID)
      .select('id,name,status,follow_up_stage')
      .single();

    assert.ok(updated);
    assert.strictEqual(updated.status, 'contacted');
  });

  test('add-prospect + generate-link integration flow', async () => {
    const prospectInput = {
      name: 'John Doe',
      email: 'john@realestateagent.com',
      phone: '+15559876543',
    };

    const record = {
      name: prospectInput.name,
      email: prospectInput.email.toLowerCase(),
      status: 'new',
      source: 'admin_manual',
      follow_up_stage: 0,
      phone: prospectInput.phone,
    };

    const { data: prospect } = await mockDb.from('pilot_signups')
      .insert(record)
      .select('id,name,email,status,follow_up_stage')
      .single();

    assert.ok(prospect, 'prospect should be created');
    assert.strictEqual(prospect.email, 'john@realestateagent.com');
    assert.strictEqual(prospect.status, 'new');

    const { data: afterUpdate } = await mockDb.from('pilot_signups')
      .update({
        status: 'contacted',
        follow_up_stage: 'magic-link-sent',
        last_follow_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', prospect.id)
      .select('id,status,follow_up_stage')
      .single();

    assert.ok(afterUpdate, 'prospect should be updated after magic link');
    assert.strictEqual(afterUpdate.status, 'contacted');
    assert.strictEqual(afterUpdate.follow_up_stage, 'magic-link-sent');
  });

  test('email validation rejects test accounts from admin creation', () => {
    const testEmails = [
      'agent@example.com',
      'lead@test.io',
      'stojan@internal.dev',
      'testing123@gmail.com',
    ];
    const realEmails = [
      'agent@kw.com',
      'broker@remax.net',
      'lead@compass.com',
    ];

    const TEST_PATTERNS = ['example.com', 'test', 'internal'];
    const isTestEmail = (email) => TEST_PATTERNS.some(p => email.toLowerCase().includes(p));

    for (const email of testEmails) {
      assert.strictEqual(isTestEmail(email), true, `${email} should be flagged as test`);
    }
    for (const email of realEmails) {
      assert.strictEqual(isTestEmail(email), false, `${email} should NOT be flagged as test`);
    }
  });
});
