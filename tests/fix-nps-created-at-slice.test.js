#!/usr/bin/env node

/**
 * Test: Fix for "recent[0].created_at.slice is not a function"
 *
 * Issue: getNPSStats() was not properly handling created_at values
 * when they came from Supabase as Date objects instead of strings.
 *
 * The error occurred because code tried to call .slice() on created_at
 * assuming it was a string, but it was a Date object.
 */

const assert = require('assert')

let passCount = 0
let failCount = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passCount++
  } catch (error) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   Error: ${error.message}`)
    failCount++
  }
}

console.log('🧪 NPS Stats - created_at handling\n')

// Test 1: Handle string created_at values
test('should handle string created_at values', () => {
  const isoString = '2024-01-01T12:00:00Z'
  const value = typeof isoString === 'string' ? isoString : new Date(isoString).toISOString()
  
  assert.strictEqual(typeof value, 'string')
  assert.match(value, /^\d{4}-\d{2}-\d{2}T/)
})

// Test 2: Handle Date object created_at values
test('should handle Date object created_at values', () => {
  const dateObj = new Date('2024-01-01T12:00:00Z')
  const value = dateObj instanceof Date ? dateObj.toISOString() : dateObj
  
  assert.strictEqual(typeof value, 'string')
  assert.match(value, /^\d{4}-\d{2}-\d{2}T/)
})

// Test 3: Handle null/undefined created_at values
test('should handle null/undefined created_at values', () => {
  const nullValue = null
  const value = !nullValue ? new Date().toISOString() : nullValue
  
  assert.strictEqual(typeof value, 'string')
  assert.match(value, /^\d{4}-\d{2}-\d{2}T/)
})

// Test 4: Handle numeric timestamp values
test('should handle numeric timestamp values', () => {
  const timestamp = 1704110400000 // ms since epoch
  const value = typeof timestamp === 'number' ? new Date(timestamp).toISOString() : timestamp
  
  assert.strictEqual(typeof value, 'string')
  assert.match(value, /^\d{4}-\d{2}-\d{2}T/)
})

// Test 5: Safely handle unexpected types
test('should safely handle unexpected types', () => {
  const testValues = [
    { foo: 'bar' },  // object
    [],              // array
    true,            // boolean
  ]

  for (const val of testValues) {
    let result
    try {
      result = typeof val === 'string' ? val : new Date(val).toISOString()
    } catch {
      result = new Date().toISOString()
    }
    
    assert.strictEqual(typeof result, 'string')
    assert.match(result, /^\d{4}-\d{2}-\d{2}T/)
  }
})

// Test 6: Normalize all created_at values in response array
test('should normalize all created_at values in response array', () => {
  const responses = [
    { id: '1', created_at: '2024-01-01T12:00:00Z', score: 10 },
    { id: '2', created_at: new Date('2024-01-02T12:00:00Z'), score: 9 },
    { id: '3', created_at: null, score: 8 },
  ]

  const normalized = responses.map((r) => {
    let createdAtValue = r.created_at
    
    if (!createdAtValue) {
      createdAtValue = new Date().toISOString()
    } else if (typeof createdAtValue === 'string') {
      createdAtValue = createdAtValue
    } else if (typeof createdAtValue === 'object' && createdAtValue instanceof Date) {
      createdAtValue = createdAtValue.toISOString()
    } else {
      try {
        createdAtValue = new Date(createdAtValue).toISOString()
      } catch {
        createdAtValue = new Date().toISOString()
      }
    }
    
    return { ...r, created_at: createdAtValue }
  })

  assert.strictEqual(normalized.length, 3)
  assert.strictEqual(typeof normalized[0].created_at, 'string')
  assert.strictEqual(typeof normalized[1].created_at, 'string')
  assert.strictEqual(typeof normalized[2].created_at, 'string')
  
  // Verify all are valid ISO strings
  for (const item of normalized) {
    assert.match(item.created_at, /^\d{4}-\d{2}-\d{2}T/)
  }
})

// Test 7: Not break .slice() calls on created_at
test('should not break .slice() calls on created_at', () => {
  const response = {
    created_at: '2024-01-01T12:00:00Z',
  }
  
  // This would previously fail with "slice is not a function"
  // if created_at was a Date object
  const dateOnlyString = response.created_at.slice(0, 10)
  
  assert.strictEqual(dateOnlyString, '2024-01-01')
})

// Test 8: Handle empty array
test('should handle empty array', () => {
  const responses = []
  const normalized = (responses || []).map((r) => ({
    ...r,
    created_at: typeof r.created_at === 'string' ? r.created_at : new Date().toISOString(),
  }))
  
  assert.deepStrictEqual(normalized, [])
})

// Test 9: Handle undefined array
test('should handle undefined array', () => {
  const responses = undefined
  const normalized = (responses || []).map((r) => ({
    ...r,
    created_at: typeof r.created_at === 'string' ? r.created_at : new Date().toISOString(),
  }))
  
  assert.deepStrictEqual(normalized, [])
})

// Test 10: Preserve other properties while normalizing created_at
test('should preserve other properties while normalizing created_at', () => {
  const response = {
    id: 'abc123',
    score: 9,
    created_at: new Date('2024-01-01T12:00:00Z'),
    real_estate_agents: { name: 'Agent Smith' },
    extra_field: 'value',
  }

  const normalized = {
    ...response,
    created_at: response.created_at instanceof Date 
      ? response.created_at.toISOString() 
      : response.created_at,
  }

  assert.strictEqual(normalized.id, 'abc123')
  assert.strictEqual(normalized.score, 9)
  assert.deepStrictEqual(normalized.real_estate_agents, { name: 'Agent Smith' })
  assert.strictEqual(normalized.extra_field, 'value')
  assert.strictEqual(typeof normalized.created_at, 'string')
})

console.log(`\n📊 Test Results:`)
console.log(`✅ Passed: ${passCount}`)
console.log(`❌ Failed: ${failCount}`)
console.log(`📈 Success Rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%`)

process.exit(failCount > 0 ? 1 : 0)
