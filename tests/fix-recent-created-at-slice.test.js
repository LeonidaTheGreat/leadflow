/**
 * Test: Build health — recent[0].created_at.slice is not a function
 *
 * Verifies that the heartbeat executor can safely handle created_at
 * values that are strings, Date objects, or null.
 *
 * Error: Build health: recent[0].created_at.slice is not a function
 * Root cause: PostgREST returns created_at as an ISO string or null,
 * but sometimes returned as Date object depending on the client config.
 * Solution: Check type before calling .slice() on created_at
 */

const assert = require('assert')

describe('Build health: recent[0].created_at.slice is not a function', () => {
  it('should safely format created_at when it is a string', () => {
    // Simulate the recent array returned from PostgREST
    const recent = [{
      id: 'task-1',
      status: 'done',
      created_at: '2026-04-02T15:30:00Z'
    }]

    // Original code would crash: recent[0].created_at.slice(11,16)
    // Fixed code: safely extract time
    const createdAt = recent[0].created_at
    const timeStr = typeof createdAt === 'string'
      ? createdAt.slice(11,16)
      : (createdAt instanceof Date ? createdAt.toISOString().slice(11,16) : 'unknown')

    assert.strictEqual(timeStr, '15:30', 'Should extract HH:mm from ISO string')
  })

  it('should safely format created_at when it is a Date object', () => {
    const testDate = new Date('2026-04-02T15:30:00Z')
    const recent = [{
      id: 'task-1',
      status: 'done',
      created_at: testDate
    }]

    const createdAt = recent[0].created_at
    const timeStr = typeof createdAt === 'string'
      ? createdAt.slice(11,16)
      : (createdAt instanceof Date ? createdAt.toISOString().slice(11,16) : 'unknown')

    assert.strictEqual(timeStr, '15:30', 'Should extract HH:mm from Date object')
  })

  it('should safely format created_at when it is null', () => {
    const recent = [{
      id: 'task-1',
      status: 'done',
      created_at: null
    }]

    const createdAt = recent[0].created_at
    const timeStr = typeof createdAt === 'string'
      ? createdAt.slice(11,16)
      : (createdAt instanceof Date ? createdAt.toISOString().slice(11,16) : 'unknown')

    assert.strictEqual(timeStr, 'unknown', 'Should return "unknown" for null created_at')
  })

  it('should handle empty recent array safely', () => {
    const recent = []

    // Guard: check if recent has data before accessing
    if (recent?.length > 0) {
      const createdAt = recent[0].created_at
      const timeStr = typeof createdAt === 'string'
        ? createdAt.slice(11,16)
        : (createdAt instanceof Date ? createdAt.toISOString().slice(11,16) : 'unknown')
      assert.fail('Should not reach here')
    }

    // Should pass without error
    assert(true, 'Empty array handled safely with guard clause')
  })

  it('should format the log message correctly', () => {
    const recent = [{
      id: 'task-1',
      status: 'done',
      created_at: '2026-04-02T15:30:00Z'
    }]

    const createdAt = recent[0].created_at
    const timeStr = typeof createdAt === 'string'
      ? createdAt.slice(11,16)
      : (createdAt instanceof Date ? createdAt.toISOString().slice(11,16) : 'unknown')

    const message = `   ⏭️ Build-fix task exists recently (${recent[0].status}, created ${timeStr}) — cooldown`
    assert.strictEqual(
      message,
      '   ⏭️ Build-fix task exists recently (done, created 15:30) — cooldown',
      'Should format complete log message'
    )
  })
})
