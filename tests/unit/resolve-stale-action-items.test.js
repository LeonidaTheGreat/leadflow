'use strict'

jest.mock('../../task-store.js', () => ({
  TaskStore: jest.fn()
}))

const { TaskStore } = require('../../task-store.js')
const { resolveStaleActionItems } = require('../../scripts/db/resolve-stale-action-items.js')

function createSupabaseMock({ awaitingItems, updateErrorsById = {} }) {
  const updates = []
  const statusFilters = []
  let updatePayload = null

  const supabase = {
    from(table) {
      if (table !== 'action_items') throw new Error('Unexpected table')
      return {
        select() {
          return this
        },
        in(field, values) {
          statusFilters.push({ field, values: [...values] })
          if (field !== 'status') {
            return Promise.resolve({ data: [], error: null })
          }
          return Promise.resolve({ data: awaitingItems, error: null })
        },
        update(payload) {
          updatePayload = payload
          return this
        },
        eq(field, id) {
          if (field !== 'id') return Promise.resolve({ error: null })
          updates.push({ id, payload: updatePayload })
          const maybeError = updateErrorsById[id]
          return Promise.resolve({ error: maybeError ? { message: maybeError } : null })
        }
      }
    }
  }

  return { supabase, updates, statusFilters }
}

describe('resolveStaleActionItems', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('resolves stale action items for WAITING/pending/open and keeps fresh awaiting items', async () => {
    const now = Date.now()
    const stale = new Date(now - (49 * 60 * 60 * 1000)).toISOString()
    const fresh = new Date(now - (2 * 60 * 60 * 1000)).toISOString()

    const awaitingItems = [
      { id: 'w1', title: 'waiting stale', status: 'WAITING', created_at: stale },
      { id: 'p1', title: 'pending stale', status: 'pending', created_at: stale },
      { id: 'o1', title: 'open stale', status: 'open', created_at: stale },
      { id: 'p2', title: 'pending fresh', status: 'pending', created_at: fresh },
    ]

    const db = createSupabaseMock({ awaitingItems })
    TaskStore.mockImplementation(() => ({ supabase: db.supabase }))

    const result = await resolveStaleActionItems()

    expect(result.success).toBe(true)
    expect(result.resolved).toBe(3)
    expect(db.updates.map((u) => u.id).sort()).toEqual(['o1', 'p1', 'w1'])
    expect(db.statusFilters[0]).toEqual({
      field: 'status',
      values: ['WAITING', 'pending', 'open']
    })
  })

  test('returns failure when some stale items cannot be updated', async () => {
    const stale = new Date(Date.now() - (50 * 60 * 60 * 1000)).toISOString()
    const awaitingItems = [
      { id: 'w1', title: 'waiting stale', status: 'WAITING', created_at: stale },
      { id: 'p1', title: 'pending stale', status: 'pending', created_at: stale },
    ]
    const db = createSupabaseMock({
      awaitingItems,
      updateErrorsById: { p1: 'write failed' }
    })
    TaskStore.mockImplementation(() => ({ supabase: db.supabase }))

    const result = await resolveStaleActionItems()

    expect(result.success).toBe(false)
    expect(result.resolved).toBe(1)
  })
})
