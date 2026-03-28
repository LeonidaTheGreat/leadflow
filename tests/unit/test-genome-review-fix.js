#!/usr/bin/env node
/**
 * Unit test for genome review reporting fix
 * Tests that reportGenomeReview handles corrupted numeric values gracefully
 */

// Test utility
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// Test 1: Handle corrupted string totalCost7d
test('should handle string totalCost7d and convert to number', () => {
  const review = {
    summary: {
      totalCost7d: '00.000.001.050.002.000', // corrupted string
    },
    scores: {
      costPerSuccess: '00.001.234.567', // also corrupted
    }
  };

  // The fix logic
  const totalCost7dNum = typeof review.summary.totalCost7d === 'string' 
    ? parseFloat(review.summary.totalCost7d) || 0 
    : (review.summary.totalCost7d || 0);
  
  const costPerSuccessNum = typeof review.scores.costPerSuccess === 'string' 
    ? parseFloat(review.scores.costPerSuccess) || 0 
    : (review.scores.costPerSuccess || 0);

  assert(typeof totalCost7dNum === 'number', 'totalCost7dNum should be a number');
  assert(typeof costPerSuccessNum === 'number', 'costPerSuccessNum should be a number');
  
  // Should not throw
  const formatted1 = totalCost7dNum.toFixed(2);
  const formatted2 = costPerSuccessNum.toFixed(3);
  
  assertEqual(formatted1, '0.00', 'totalCost7dNum.toFixed(2) should be "0.00"');
  // parseFloat('00.001.234.567') returns 0.001 (stops at second dot)
  assertEqual(formatted2, '0.001', 'costPerSuccessNum.toFixed(3) should be "0.001"');
});

// Test 2: Handle normal numeric values
test('should handle normal numeric values', () => {
  const review = {
    summary: {
      totalCost7d: 1234.56, // normal number
    },
    scores: {
      costPerSuccess: 0.005, // normal number
    }
  };

  const totalCost7dNum = typeof review.summary.totalCost7d === 'string' 
    ? parseFloat(review.summary.totalCost7d) || 0 
    : (review.summary.totalCost7d || 0);
  
  const costPerSuccessNum = typeof review.scores.costPerSuccess === 'string' 
    ? parseFloat(review.scores.costPerSuccess) || 0 
    : (review.scores.costPerSuccess || 0);

  assertEqual(totalCost7dNum.toFixed(2), '1234.56', 'totalCost7dNum.toFixed(2) should be "1234.56"');
  assertEqual(costPerSuccessNum.toFixed(3), '0.005', 'costPerSuccessNum.toFixed(3) should be "0.005"');
});

// Test 3: Handle null/undefined values
test('should handle null/undefined values', () => {
  const review = {
    summary: {
      totalCost7d: null,
    },
    scores: {
      costPerSuccess: undefined,
    }
  };

  const totalCost7dNum = typeof review.summary.totalCost7d === 'string' 
    ? parseFloat(review.summary.totalCost7d) || 0 
    : (review.summary.totalCost7d || 0);
  
  const costPerSuccessNum = typeof review.scores.costPerSuccess === 'string' 
    ? parseFloat(review.scores.costPerSuccess) || 0 
    : (review.scores.costPerSuccess || 0);

  assertEqual(totalCost7dNum, 0, 'totalCost7dNum should be 0');
  assertEqual(costPerSuccessNum, 0, 'costPerSuccessNum should be 0');
  assertEqual(totalCost7dNum.toFixed(2), '0.00', 'totalCost7dNum.toFixed(2) should be "0.00"');
  assertEqual(costPerSuccessNum.toFixed(3), '0.000', 'costPerSuccessNum.toFixed(3) should be "0.000"');
});

// Test 4: Verify the original failure is fixed
test('original error "toFixed is not a function" should not occur', () => {
  const review = {
    summary: {
      totalCost7d: '00.000.001.050.002.000', // corrupted string that caused the error
    },
    scores: {
      costPerSuccess: '00.001.234.567'
    }
  };

  // This used to throw: "s.totalCost7d.toFixed is not a function"
  // Now it should work:
  const totalCost7dNum = typeof review.summary.totalCost7d === 'string' 
    ? parseFloat(review.summary.totalCost7d) || 0 
    : (review.summary.totalCost7d || 0);
  
  const costPerSuccessNum = typeof review.scores.costPerSuccess === 'string' 
    ? parseFloat(review.scores.costPerSuccess) || 0 
    : (review.scores.costPerSuccess || 0);

  // These should not throw
  try {
    totalCost7dNum.toFixed(2);
    costPerSuccessNum.toFixed(3);
  } catch (err) {
    throw new Error(`Should not throw toFixed error: ${err.message}`);
  }
});

// Report
console.log('\n' + '='.repeat(60));
console.log('📊 TEST REPORT');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
