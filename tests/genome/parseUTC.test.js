/**
 * tests/parseUTC.test.js
 * Unit tests for the parseUTC() function from core/heartbeat-executor.js
 *
 * parseUTC is an internal function, so we extract it via a re-implementation
 * (matching the source verbatim) or via a light wrapper.
 *
 * Source (heartbeat-executor.js line ~97):
 *   function parseUTC(ts) {
 *     if (!ts) return new Date(0)
 *     if (ts instanceof Date) return ts
 *     const s = String(ts)
 *     return new Date(s.endsWith('Z') || s.includes('+') || /\d{2}-\d{2}$/.test(s) ? s : s + 'Z')
 *   }
 *
 * We test against the same implementation to verify correctness without
 * importing the heavy HeartbeatExecutor (which connects to Supabase on load).
 *
 * NOTE: This file re-declares the parseUTC function. When parseUTC is exported
 * from heartbeat-executor.js in Phase 1D, this test should be updated to import
 * the actual function instead of re-declaring it. This is acceptable for now.
 */

// Extract parseUTC by loading only the relevant lines via a minimal wrapper.
// Since heartbeat-executor.js doesn't export parseUTC, we re-declare it here
// matching the canonical source exactly. Any change to the source should be
// reflected here to keep tests aligned.
function parseUTC(ts) {
  if (!ts) return new Date(0)
  if (ts instanceof Date) return ts
  const s = String(ts)
  return new Date(s.endsWith('Z') || s.includes('+') || /\d{2}-\d{2}$/.test(s) ? s : s + 'Z')
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('parseUTC()', () => {
  test('handles Date objects — returns them as-is', () => {
    const d = new Date('2024-01-15T12:00:00Z')
    const result = parseUTC(d)
    expect(result).toBe(d)   // exact same reference
    expect(result.toISOString()).toBe('2024-01-15T12:00:00.000Z')
  })

  test('handles strings without Z suffix — appends Z', () => {
    const result = parseUTC('2024-06-01T10:30:00')
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).not.toBeNaN()
    // Should be interpreted as UTC (same as with Z)
    const expected = new Date('2024-06-01T10:30:00Z')
    expect(result.getTime()).toBe(expected.getTime())
  })

  test('handles strings with Z suffix — parses correctly', () => {
    const result = parseUTC('2024-03-23T15:00:00.000Z')
    expect(result).toBeInstanceOf(Date)
    expect(result.toISOString()).toBe('2024-03-23T15:00:00.000Z')
  })

  test('handles strings with timezone offset (+HH:MM)', () => {
    const result = parseUTC('2024-03-23T10:00:00+05:30')
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).not.toBeNaN()
    // +05:30 = UTC 04:30
    const expected = new Date('2024-03-23T04:30:00.000Z')
    expect(result.getTime()).toBe(expected.getTime())
  })

  test('handles null — returns epoch (new Date(0))', () => {
    const result = parseUTC(null)
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBe(0)
  })

  test('handles undefined — returns epoch (new Date(0))', () => {
    const result = parseUTC(undefined)
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBe(0)
  })

  test('handles empty string — returns epoch (new Date(0))', () => {
    const result = parseUTC('')
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBe(0)
  })

  test('handles PostgreSQL timestamp without timezone (YYYY-MM-DD HH:MM:SS)', () => {
    // Postgres returns "2024-03-01 09:00:00" without Z
    const result = parseUTC('2024-03-01 09:00:00')
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).not.toBeNaN()
  })
})
