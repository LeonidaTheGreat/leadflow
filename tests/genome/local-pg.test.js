/**
 * tests/local-pg.test.js
 * Unit tests for the LocalPgClient / QueryBuilder in core/local-pg.js
 *
 * Uses a mock pg.Pool so no live database is required.
 */

const path = require('path')

// ── Mock pg.Pool before requiring local-pg ───────────────────────────────────

let mockQueryFn = jest.fn()

jest.mock('pg', () => {
  const mockPool = jest.fn().mockImplementation(() => ({
    query: mockQueryFn,
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn()
  }))
  return { Pool: mockPool }
})

const { createLocalClient } = require('/Users/clawdbot/.openclaw/genome/core/local-pg')

// ── Helper ───────────────────────────────────────────────────────────────────

function makeClient() {
  return createLocalClient('postgresql://test@localhost/test')
}

// Reset mock before each test
beforeEach(() => {
  mockQueryFn.mockReset()
})

// ── SELECT ────────────────────────────────────────────────────────────────────

describe('select()', () => {
  test('returns rows from a SELECT query', async () => {
    const rows = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
    mockQueryFn.mockResolvedValue({ rows })

    const client = makeClient()
    const { data, error } = await client.from('users').select('id, name')

    expect(error).toBeNull()
    expect(data).toEqual(rows)

    const call = mockQueryFn.mock.calls[0]
    // Columns are individually quoted by _parseSelectCols
    expect(call[0]).toMatch(/SELECT "id", "name" FROM "users"/)
  })
})

// ── INSERT ───────────────────────────────────────────────────────────────────

describe('insert()', () => {
  test('returns the inserted row when .select().single() is chained', async () => {
    const inserted = { id: 42, name: 'Charlie' }
    mockQueryFn.mockResolvedValue({ rows: [inserted] })

    const client = makeClient()
    const { data, error } = await client
      .from('users')
      .insert({ name: 'Charlie' })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).toEqual(inserted)

    const call = mockQueryFn.mock.calls[0]
    expect(call[0]).toMatch(/INSERT INTO "users"/)
    expect(call[0]).toMatch(/RETURNING/)
  })

  test('.select() after .insert() does NOT override op to select', async () => {
    const inserted = { id: 7, status: 'ready' }
    mockQueryFn.mockResolvedValue({ rows: [inserted] })

    const client = makeClient()
    const { data, error } = await client
      .from('tasks')
      .insert({ status: 'ready' })
      .select('id, status')
      .single()

    expect(error).toBeNull()
    expect(data).toEqual(inserted)

    const call = mockQueryFn.mock.calls[0]
    // Must be an INSERT, not a SELECT
    expect(call[0]).toMatch(/^INSERT INTO/)
    expect(call[0]).not.toMatch(/^SELECT/)
  })
})

// ── UPDATE ───────────────────────────────────────────────────────────────────

describe('update()', () => {
  test('modifies a row and returns updated data', async () => {
    const updated = { id: 1, status: 'complete' }
    mockQueryFn.mockResolvedValue({ rows: [updated] })

    const client = makeClient()
    // _execUpdate always returns result.rows (array); .single()/.select() don't affect update
    const { data, error } = await client
      .from('tasks')
      .update({ status: 'complete' })
      .eq('id', 1)

    expect(error).toBeNull()
    // data is an array from RETURNING *
    expect(data).toEqual([updated])

    const call = mockQueryFn.mock.calls[0]
    expect(call[0]).toMatch(/UPDATE "tasks"/)
    expect(call[0]).toMatch(/WHERE/)
  })
})

// ── FILTER OPERATORS ─────────────────────────────────────────────────────────

describe('.not(col, is, null) / .is(col, null) / .contains() / .in()', () => {
  test('.not(col, is, null) generates IS NOT NULL', async () => {
    mockQueryFn.mockResolvedValue({ rows: [] })

    const client = makeClient()
    await client.from('tasks').select('*').not('completed_at', 'is', null)

    const sql = mockQueryFn.mock.calls[0][0]
    expect(sql).toMatch(/IS NOT NULL/)
  })

  test('.not(col, is, string null) generates IS NOT NULL', async () => {
    mockQueryFn.mockResolvedValue({ rows: [] })
    const client = makeClient()
    await client.from('action_items').select('*').not('response', 'is', 'null')  // string "null" not JS null
    const sql = mockQueryFn.mock.calls[0][0]
    expect(sql).toMatch(/IS NOT NULL/)
  })

  test('.is(col, null) generates IS NULL', async () => {
    mockQueryFn.mockResolvedValue({ rows: [] })

    const client = makeClient()
    await client.from('tasks').select('*').is('completed_at', null)

    const sql = mockQueryFn.mock.calls[0][0]
    expect(sql).toMatch(/IS NULL/)
  })

  test('.contains(col, array) generates @> operator', async () => {
    mockQueryFn.mockResolvedValue({ rows: [] })

    const client = makeClient()
    await client.from('tasks').select('*').contains('tags', ['genome', 'phase1'])

    const sql = mockQueryFn.mock.calls[0][0]
    expect(sql).toMatch(/@>/)
  })

  test('.in(col, array) generates IN clause', async () => {
    mockQueryFn.mockResolvedValue({ rows: [] })

    const client = makeClient()
    await client.from('tasks').select('*').in('status', ['ready', 'in_progress'])

    const sql = mockQueryFn.mock.calls[0][0]
    expect(sql).toMatch(/IN \(/)
  })
})
