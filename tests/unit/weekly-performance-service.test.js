/**
 * Weekly Performance Service Tests
 * 
 * Tests for the weekly performance email service functionality.
 * Run with: npm test -- tests/unit/weekly-performance-service.test.js
 */

const assert = require('assert');
const {
  getPreviousWeekRange,
  generateEmailHtml,
  isSupabaseConfigured,
  isResendConfigured
} = require('../../lib/weekly-performance-service');

// Test suite
async function runTests() {
  console.log('Running Weekly Performance Service Tests...\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: getPreviousWeekRange returns correct dates
  try {
    console.log('Test 1: getPreviousWeekRange returns correct structure');
    const range = getPreviousWeekRange();
    
    assert(range.weekStarting, 'weekStarting should exist');
    assert(range.weekEnding, 'weekEnding should exist');
    assert(range.weekStartingDate instanceof Date, 'weekStartingDate should be a Date');
    assert(range.weekEndingDate instanceof Date, 'weekEndingDate should be a Date');
    
    // Week should be ~7 days (allowing for floating point precision and DST)
    const diffTime = range.weekEndingDate - range.weekStartingDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    assert(diffDays >= 6.9 && diffDays <= 7.1, `Week should span ~7 days, got ${diffDays}`);
    
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (error) {
    console.log(`  ✗ FAILED: ${error.message}\n`);
    failed++;
  }

  // Test 2: Email HTML generation for Starter plan
  try {
    console.log('Test 2: generateEmailHtml includes upgrade CTA for Starter users');
    const agent = {
      id: 'test-agent-1',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      plan_tier: 'starter'
    };
    const stats = {
      leadsResponded: 15,
      avgResponseTimeSeconds: 28,
      appointmentsBooked: 3,
      estimatedRevenueImpact: 3375
    };
    const weekRange = {
      weekStarting: '2026-04-07',
      weekEnding: '2026-04-13'
    };
    
    const html = generateEmailHtml(agent, stats, weekRange);
    
    assert(html.includes('John'), 'HTML should include agent first name');
    assert(html.includes('15'), 'HTML should include leads responded count');
    assert(html.includes('28s'), 'HTML should include response time');
    assert(html.includes('3'), 'HTML should include appointments booked');
    assert(html.includes('$3,375'), 'HTML should include revenue impact');
    assert(html.includes('Upgrade to Pro'), 'HTML should include upgrade CTA for Starter');
    assert(html.includes('starter_upgrade'), 'HTML should include starter upgrade tracking');
    
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (error) {
    console.log(`  ✗ FAILED: ${error.message}\n`);
    failed++;
  }

  // Test 3: Email HTML generation for Pro plan (no upgrade CTA)
  try {
    console.log('Test 3: generateEmailHtml excludes upgrade CTA for Pro users');
    const agent = {
      id: 'test-agent-2',
      email: 'pro@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      plan_tier: 'pro'
    };
    const stats = {
      leadsResponded: 25,
      avgResponseTimeSeconds: 22,
      appointmentsBooked: 5,
      estimatedRevenueImpact: 5625
    };
    const weekRange = {
      weekStarting: '2026-04-07',
      weekEnding: '2026-04-13'
    };
    
    const html = generateEmailHtml(agent, stats, weekRange);
    
    assert(html.includes('Jane'), 'HTML should include agent first name');
    assert(html.includes('25'), 'HTML should include leads responded count');
    assert(!html.includes('Upgrade to Pro'), 'HTML should NOT include upgrade CTA for Pro users');
    
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (error) {
    console.log(`  ✗ FAILED: ${error.message}\n`);
    failed++;
  }

  // Test 4: Email HTML handles zero stats gracefully
  try {
    console.log('Test 4: generateEmailHtml handles zero stats gracefully');
    const agent = {
      id: 'test-agent-3',
      email: 'new@example.com',
      first_name: 'New',
      plan_tier: 'trial'
    };
    const stats = {
      leadsResponded: 0,
      avgResponseTimeSeconds: 0,
      appointmentsBooked: 0,
      estimatedRevenueImpact: 0
    };
    const weekRange = {
      weekStarting: '2026-04-07',
      weekEnding: '2026-04-13'
    };
    
    const html = generateEmailHtml(agent, stats, weekRange);
    
    assert(html.includes('0'), 'HTML should show 0 for stats');
    assert(html.includes('$0'), 'HTML should show $0 for revenue');
    assert(html.includes('No leads came in this week'), 'HTML should include encouraging message for zero leads');
    assert(html.includes('Upgrade to Pro'), 'HTML should include upgrade CTA for Trial users');
    
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (error) {
    console.log(`  ✗ FAILED: ${error.message}\n`);
    failed++;
  }

  // Test 5: Response time formatting
  try {
    console.log('Test 5: Response time formatting works correctly');
    const agent = {
      id: 'test-agent-4',
      email: 'speed@example.com',
      first_name: 'Speedy',
      plan_tier: 'pro'
    };
    const stats = {
      leadsResponded: 10,
      avgResponseTimeSeconds: 120, // 2m 0s
      appointmentsBooked: 2,
      estimatedRevenueImpact: 2250
    };
    const weekRange = {
      weekStarting: '2026-04-07',
      weekEnding: '2026-04-13'
    };
    
    const html = generateEmailHtml(agent, stats, weekRange);
    
    assert(html.includes('2m') || html.includes('120'), 'HTML should format response time > 60s');
    
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (error) {
    console.log(`  ✗ FAILED: ${error.message}\n`);
    failed++;
  }

  // Test 6: Email includes benchmark comparison for fast responses
  try {
    console.log('Test 6: Email includes benchmark comparison for fast responses');
    const agent = {
      id: 'test-agent-5',
      email: 'fast@example.com',
      first_name: 'Flash',
      plan_tier: 'pro'
    };
    const stats = {
      leadsResponded: 20,
      avgResponseTimeSeconds: 18, // Very fast
      appointmentsBooked: 4,
      estimatedRevenueImpact: 4500
    };
    const weekRange = {
      weekStarting: '2026-04-07',
      weekEnding: '2026-04-13'
    };
    
    const html = generateEmailHtml(agent, stats, weekRange);
    
    // 540 / 18 = 30x faster than 9-min benchmark
    assert(html.includes('faster than 9-min avg') || html.includes('30') || html.includes('⚡'), 
           'HTML should include benchmark comparison for fast responses');
    
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (error) {
    console.log(`  ✗ FAILED: ${error.message}\n`);
    failed++;
  }

  // Summary
  console.log('========================================');
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
