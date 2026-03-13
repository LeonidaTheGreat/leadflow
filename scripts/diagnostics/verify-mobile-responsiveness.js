#!/usr/bin/env node

/**
 * Mobile Responsiveness Verification Script
 * Tests the dashboard files for mobile compatibility
 */

const fs = require('fs');
const path = require('path');

const RESULTS = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, condition, details = '') {
  const result = {
    name,
    passed: Boolean(condition),
    details
  };
  RESULTS.tests.push(result);
  if (condition) {
    RESULTS.passed++;
    console.log(`✅ ${name}`);
  } else {
    RESULTS.failed++;
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
  }
  return condition;
}

function runTests() {
  console.log('📱 Mobile Responsiveness Verification');
  console.log('═════════════════════════════════════\n');

  // Test 1: dashboard.html exists and has mobile styles
  const dashboardPath = path.join(__dirname, 'dashboard.html');
  const dashboardExists = fs.existsSync(dashboardPath);
  test('dashboard.html exists', dashboardExists);

  if (dashboardExists) {
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');
    
    // Test mobile viewport meta tag
    test('dashboard.html has viewport meta tag', 
      dashboardContent.includes('viewport') && dashboardContent.includes('width=device-width'),
      'Required for proper mobile scaling'
    );
    
    // Test hamburger menu
    test('dashboard.html has hamburger menu',
      dashboardContent.includes('nav-toggle') && dashboardContent.includes('toggleNav'),
      'Required for mobile navigation'
    );
    
    // Test mobile media query
    test('dashboard.html has mobile media queries',
      dashboardContent.includes('@media (max-width: 768px)'),
      'Required for responsive layout'
    );
    
    // Test table wrapper for horizontal scroll
    test('dashboard.html has table wrapper for scroll',
      dashboardContent.includes('table-wrapper'),
      'Required for horizontal table scrolling on mobile'
    );
    
    // Test grid4 mobile stacking
    test('dashboard.html grid4 stacks on mobile',
      dashboardContent.includes('.grid4 { grid-template-columns: 1fr; }'),
      'Required for card stacking on mobile'
    );
    
    // Test touch-friendly styles
    test('dashboard.html has touch-friendly styles',
      dashboardContent.includes('touch-action: manipulation') || dashboardContent.includes('-webkit-tap-highlight-color'),
      'Required for better touch experience'
    );
  }

  // Test 2: Next.js dashboard layout has mobile nav
  const layoutPath = path.join(__dirname, 'product/lead-response/dashboard/app/dashboard/layout.tsx');
  const layoutExists = fs.existsSync(layoutPath);
  test('dashboard/layout.tsx exists', layoutExists);

  if (layoutExists) {
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    
    // Test hamburger menu in Next.js
    test('layout.tsx has mobile hamburger menu',
      layoutContent.includes('isMenuOpen') && layoutContent.includes('setIsMenuOpen'),
      'Required for mobile navigation'
    );
    
    // Test hidden md:flex pattern
    test('layout.tsx uses responsive hidden classes',
      layoutContent.includes('hidden md:flex'),
      'Required for responsive nav visibility'
    );
    
    // Test mobile menu
    test('layout.tsx has mobile menu panel',
      layoutContent.includes('md:hidden') && layoutContent.includes('MobileNavLink'),
      'Required for mobile menu'
    );
  }

  // Test 3: globals.css has mobile styles
  const globalsPath = path.join(__dirname, 'product/lead-response/dashboard/app/globals.css');
  const globalsExists = fs.existsSync(globalsPath);
  test('globals.css exists', globalsExists);

  if (globalsExists) {
    const globalsContent = fs.readFileSync(globalsPath, 'utf-8');
    
    // Test table wrapper styles
    test('globals.css has table wrapper styles',
      globalsContent.includes('table-wrapper'),
      'Required for horizontal table scrolling'
    );
    
    // Test mobile scrollbar styling
    test('globals.css has mobile scrollbar styles',
      globalsContent.includes('-webkit-scrollbar'),
      'Required for styled scrollbars on mobile'
    );
    
    // Test touch manipulation
    test('globals.css has touch manipulation styles',
      globalsContent.includes('touch-action: manipulation') || globalsContent.includes('touch-manipulation'),
      'Required for touch-friendly interactions'
    );
  }

  // Test 4: StatsCards component uses responsive grid
  const statsCardsPath = path.join(__dirname, 'product/lead-response/dashboard/components/dashboard/StatsCards.tsx');
  const statsCardsExists = fs.existsSync(statsCardsPath);
  test('StatsCards.tsx exists', statsCardsExists);

  if (statsCardsExists) {
    const statsCardsContent = fs.readFileSync(statsCardsPath, 'utf-8');
    
    // Test responsive grid classes
    test('StatsCards uses responsive grid classes',
      statsCardsContent.includes('grid-cols-2') && statsCardsContent.includes('md:grid-cols-4'),
      'Required for proper card stacking on mobile'
    );
    
    // Test responsive text sizes
    test('StatsCards uses responsive text sizes',
      statsCardsContent.includes('text-xs') || statsCardsContent.includes('text-sm') || statsCardsContent.includes('sm:text-'),
      'Required for readable text on mobile'
    );
  }

  // Test 5: LeadCard component is mobile-friendly
  const leadCardPath = path.join(__dirname, 'product/lead-response/dashboard/components/dashboard/LeadCard.tsx');
  const leadCardExists = fs.existsSync(leadCardPath);
  test('LeadCard.tsx exists', leadCardExists);

  if (leadCardExists) {
    const leadCardContent = fs.readFileSync(leadCardPath, 'utf-8');
    
    // Test responsive spacing
    test('LeadCard uses responsive spacing',
      leadCardContent.includes('sm:p-4') || leadCardContent.includes('sm:gap-'),
      'Required for proper spacing on mobile'
    );
    
    // Test responsive text sizes
    test('LeadCard uses responsive text sizes',
      leadCardContent.includes('text-xs') && leadCardContent.includes('sm:text-'),
      'Required for readable text on mobile'
    );
  }

  // Test 6: Dashboard page is responsive
  const dashboardPagePath = path.join(__dirname, 'product/lead-response/dashboard/app/dashboard/page.tsx');
  const dashboardPageExists = fs.existsSync(dashboardPagePath);
  test('dashboard/page.tsx exists', dashboardPageExists);

  if (dashboardPageExists) {
    const dashboardPageContent = fs.readFileSync(dashboardPagePath, 'utf-8');
    
    // Test responsive layout
    test('Dashboard page uses responsive layout',
      dashboardPageContent.includes('flex-col') && dashboardPageContent.includes('sm:flex-row'),
      'Required for proper header stacking on mobile'
    );
    
    // Test responsive spacing
    test('Dashboard page uses responsive spacing',
      dashboardPageContent.includes('space-y-4') || dashboardPageContent.includes('sm:space-y-'),
      'Required for proper spacing on mobile'
    );
  }

  // Print summary
  console.log('\n═════════════════════════════════════');
  console.log('📊 Test Summary');
  console.log('═════════════════════════════════════');
  console.log(`Total: ${RESULTS.passed + RESULTS.failed} tests`);
  console.log(`Passed: ${RESULTS.passed} ✅`);
  console.log(`Failed: ${RESULTS.failed} ❌`);
  
  if (RESULTS.failed === 0) {
    console.log('\n✅ ALL TESTS PASSED - Mobile responsiveness verified!');
  } else {
    console.log('\n❌ SOME TESTS FAILED - Review failed items above');
  }
  
  // Save results
  const resultsPath = path.join(__dirname, 'mobile-responsiveness-test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(RESULTS, null, 2));
  console.log(`\nResults saved to: ${resultsPath}`);
  
  process.exit(RESULTS.failed === 0 ? 0 : 1);
}

runTests();
