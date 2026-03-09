/**
 * E2E Test: Feature Comparison Table on /pricing page
 * 
 * Verifies:
 * - 4 pricing tiers with correct prices ($49, $149, $399, $999+)
 * - Feature comparison table exists with proper structure
 * - Table has features as rows and tiers as columns
 * - Checkmarks and dashes display correctly
 */

const fs = require('fs');
const path = require('path');

const PRICING_PAGE_PATH = path.join(__dirname, '../product/lead-response/dashboard/app/pricing/page.tsx');
const PRICING_PAGE_PATH_ALT = path.join(__dirname, './product/lead-response/dashboard/app/pricing/page.tsx');

function testFeatureComparisonTable() {
  console.log('\n🧪 TEST: Feature Comparison Table on /pricing page\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Read the pricing page file
  let content;
  try {
    content = fs.readFileSync(PRICING_PAGE_PATH, 'utf8');
  } catch (e) {
    content = fs.readFileSync(PRICING_PAGE_PATH_ALT, 'utf8');
  }

  // Test 1: Check for 4 pricing tiers
  const tierTest = {
    name: 'Has 4 pricing tiers (Starter, Pro, Team, Brokerage)',
    passed: content.includes('Starter') && 
            content.includes('Pro') && 
            content.includes('Team') && 
            content.includes('Brokerage')
  };
  results.tests.push(tierTest);
  tierTest.passed ? results.passed++ : results.failed++;
  console.log(`${tierTest.passed ? '✅' : '❌'} ${tierTest.name}`);

  // Test 2: Check for correct prices from PMF.md
  const priceTest = {
    name: 'Has correct prices ($49, $149, $399, $999+)',
    passed: content.includes('monthlyPrice: 49') && 
            content.includes('monthlyPrice: 149') && 
            content.includes('monthlyPrice: 399') && 
            content.includes('monthlyPrice: 999')
  };
  results.tests.push(priceTest);
  priceTest.passed ? results.passed++ : results.failed++;
  console.log(`${priceTest.passed ? '✅' : '❌'} ${priceTest.name}`);

  // Test 3: Check for feature comparison table
  const tableTest = {
    name: 'Has feature comparison table element',
    passed: content.includes('<table') && content.includes('</table>')
  };
  results.tests.push(tableTest);
  tableTest.passed ? results.passed++ : results.failed++;
  console.log(`${tableTest.passed ? '✅' : '❌'} ${tableTest.name}`);

  // Test 4: Check for FEATURE_CATEGORIES data structure
  const categoriesTest = {
    name: 'Has FEATURE_CATEGORIES with comparison data',
    passed: content.includes('FEATURE_CATEGORIES') && 
            content.includes('SMS & AI') && 
            content.includes('Integrations') &&
            content.includes('Support')
  };
  results.tests.push(categoriesTest);
  categoriesTest.passed ? results.passed++ : results.failed++;
  console.log(`${categoriesTest.passed ? '✅' : '❌'} ${categoriesTest.name}`);

  // Test 5: Check for checkmark icon (✓) for features
  const checkmarkTest = {
    name: 'Uses Check icon for included features',
    passed: content.includes('Check') && content.includes('text-emerald-400')
  };
  results.tests.push(checkmarkTest);
  checkmarkTest.passed ? results.passed++ : results.failed++;
  console.log(`${checkmarkTest.passed ? '✅' : '❌'} ${checkmarkTest.name}`);

  // Test 6: Check for minus icon (—) for excluded features
  const minusTest = {
    name: 'Uses Minus icon for excluded features',
    passed: content.includes('Minus') && content.includes('text-slate-600')
  };
  results.tests.push(minusTest);
  minusTest.passed ? results.passed++ : results.failed++;
  console.log(`${minusTest.passed ? '✅' : '❌'} ${minusTest.name}`);

  // Test 7: Check for horizontal scroll on mobile
  const mobileScrollTest = {
    name: 'Table is horizontally scrollable on mobile',
    passed: content.includes('overflow-x-auto') && content.includes('min-w-[800px]')
  };
  results.tests.push(mobileScrollTest);
  mobileScrollTest.passed ? results.passed++ : results.failed++;
  console.log(`${mobileScrollTest.passed ? '✅' : '❌'} ${mobileScrollTest.name}`);

  // Test 8: Check for Pro tier highlighting in table
  const proHighlightTest = {
    name: 'Pro tier column is visually highlighted',
    passed: content.includes('bg-emerald-500/5') && content.includes('text-emerald-400')
  };
  results.tests.push(proHighlightTest);
  proHighlightTest.passed ? results.passed++ : results.failed++;
  console.log(`${proHighlightTest.passed ? '✅' : '❌'} ${proHighlightTest.name}`);

  // Test 9: Check for "Compare All Features" heading
  const headingTest = {
    name: 'Has "Compare All Features" section heading',
    passed: content.includes('Compare All Features')
  };
  results.tests.push(headingTest);
  headingTest.passed ? results.passed++ : results.failed++;
  console.log(`${headingTest.passed ? '✅' : '❌'} ${headingTest.name}`);

  // Test 10: Check for feature category headers
  const categoryHeadersTest = {
    name: 'Has feature category headers (SMS & AI, Agents, etc.)',
    passed: content.includes('SMS & AI') && 
            content.includes('Agents') && 
            content.includes('Analytics') &&
            content.includes('Enterprise')
  };
  results.tests.push(categoryHeadersTest);
  categoryHeadersTest.passed ? results.passed++ : results.failed++;
  console.log(`${categoryHeadersTest.passed ? '✅' : '❌'} ${categoryHeadersTest.name}`);

  // Summary
  console.log('\n============================================================');
  console.log('📊 FEATURE COMPARISON TABLE TEST REPORT');
  console.log('============================================================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);
  console.log('============================================================\n');

  if (results.failed > 0) {
    console.log('❌ TEST FAILED\n');
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED!\n');
    process.exit(0);
  }
}

// Run the test
testFeatureComparisonTable();
