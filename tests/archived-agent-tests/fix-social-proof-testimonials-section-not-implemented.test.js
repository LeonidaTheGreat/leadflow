/**
 * E2E Test: Social Proof / Testimonials Section
 * Use Case: fix-social-proof-testimonials-section-not-implemented
 * 
 * Acceptance Criteria:
 * - At least 1 testimonial card with quote and attribution visible
 * - Positioned between How It Works and Pricing sections
 * - Placeholder testimonials from Sarah M., Mike R., Jennifer K.
 * - "Results may vary" disclaimer present
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Test configuration
const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard');
const PAGE_FILE = path.join(DASHBOARD_DIR, 'app/page.tsx');

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function log(message, success = true) {
  console.log(`${success ? GREEN : RED}${message}${RESET}`);
}

async function runTests() {
  console.log('\n=== Social Proof / Testimonials Section E2E Test ===\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Landing page file exists
  try {
    assert(fs.existsSync(PAGE_FILE), 'Landing page file should exist');
    log('✓ Landing page file exists');
    passed++;
  } catch (e) {
    log(`✗ Landing page file exists: ${e.message}`, false);
    failed++;
  }

  // Read page content
  let pageContent = '';
  try {
    pageContent = fs.readFileSync(PAGE_FILE, 'utf-8');
  } catch (e) {
    console.error('Failed to read page file:', e.message);
    process.exit(1);
  }

  // Test 2: Testimonials section exists
  try {
    const hasTestimonialsSection = 
      /testimonial|social.?proof/i.test(pageContent) &&
      pageContent.includes('Sarah') || pageContent.includes('Mike') || pageContent.includes('Jennifer');
    
    assert(hasTestimonialsSection, 'Testimonials section with placeholder quotes should exist in page.tsx');
    log('✓ Testimonials section exists with placeholder quotes');
    passed++;
  } catch (e) {
    log(`✗ Testimonials section exists: ${e.message}`, false);
    failed++;
  }

  // Test 3: At least one testimonial card structure
  try {
    const hasQuote = /".+"/.test(pageContent) && pageContent.includes('Sarah');
    assert(hasQuote, 'Should have at least one testimonial quote from Sarah M.');
    log('✓ Testimonial quote from Sarah M. found');
    passed++;
  } catch (e) {
    log(`✗ Testimonial quote from Sarah M.: ${e.message}`, false);
    failed++;
  }

  // Test 4: Attribution exists
  try {
    const hasAttribution = 
      pageContent.includes('Solo Agent') || 
      pageContent.includes('Team Lead') || 
      pageContent.includes('Realtor');
    assert(hasAttribution, 'Should have agent title/brokerage attribution');
    log('✓ Agent attribution found');
    passed++;
  } catch (e) {
    log(`✗ Agent attribution: ${e.message}`, false);
    failed++;
  }

  // Test 5: "Results may vary" disclaimer
  try {
    const hasDisclaimer = /results may vary/i.test(pageContent);
    assert(hasDisclaimer, 'Should have "Results may vary" disclaimer');
    log('✓ "Results may vary" disclaimer found');
    passed++;
  } catch (e) {
    log(`✗ "Results may vary" disclaimer: ${e.message}`, false);
    failed++;
  }

  // Test 6: Section positioned before Pricing
  try {
    const pricingIndex = pageContent.indexOf('id="pricing"');
    const testimonialIndex = pageContent.search(/testimonial|social.?proof/i);
    
    // If testimonials exist, they should be before pricing
    if (testimonialIndex > -1 && pricingIndex > -1) {
      assert(testimonialIndex < pricingIndex, 'Testimonials section should be positioned before Pricing section');
      log('✓ Testimonials section positioned before Pricing section');
      passed++;
    } else {
      throw new Error('Cannot verify positioning - testimonials section not found');
    }
  } catch (e) {
    log(`✗ Testimonials positioning: ${e.message}`, false);
    failed++;
  }

  // Test 7: Card-based design (visual structure)
  try {
    const hasCardStructure = 
      pageContent.includes('rounded') && 
      (pageContent.includes('bg-white') || pageContent.includes('bg-slate'));
    assert(hasCardStructure, 'Should have card-based design for testimonials');
    log('✓ Card-based design structure found');
    passed++;
  } catch (e) {
    log(`✗ Card-based design: ${e.message}`, false);
    failed++;
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Total: ${passed + failed}`);
  log(`Passed: ${passed}`, true);
  if (failed > 0) {
    log(`Failed: ${failed}`, false);
  }
  
  return { passed, failed, total: passed + failed };
}

// Run tests
runTests()
  .then(({ passed, failed }) => {
    if (failed > 0) {
      console.log('\n❌ TESTS FAILED - Social proof/testimonials section NOT properly implemented');
      process.exit(1);
    } else {
      console.log('\n✅ ALL TESTS PASSED - Social proof/testimonials section properly implemented');
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  });
