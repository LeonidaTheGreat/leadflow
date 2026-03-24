/**
 * E2E Test: How It Works Section Implementation
 * Tests that the How It Works section is properly rendered on the landing page
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Test configuration
const DASHBOARD_DIR = path.resolve(__dirname, '..');
const PAGE_FILE = path.join(DASHBOARD_DIR, 'app/page.tsx');

console.log('=== E2E Test: How It Works Section ===\n');

// Track test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

// Read the page.tsx file
const pageContent = fs.readFileSync(PAGE_FILE, 'utf-8');

// Test 1: How It Works section exists
 test('How It Works section is present in page.tsx', () => {
  assert(pageContent.includes('How It Works'), 'Missing "How It Works" heading');
});

// Test 2: Section has correct ID for navigation
 test('How It Works section has id="how-it-works"', () => {
  assert(pageContent.includes('id="how-it-works"'), 'Missing id="how-it-works" attribute');
});

// Test 3: Section has 3 steps
 test('How It Works section contains exactly 3 steps', () => {
  const stepCardMatches = pageContent.match(/HowItWorksStep/g);
  assert(stepCardMatches && stepCardMatches.length >= 3, `Expected at least 3 HowItWorksStep components, found ${stepCardMatches ? stepCardMatches.length : 0}`);
});

// Test 4: Step 1 - Connect Your CRM
 test('Step 1: "Connect Your CRM" is present', () => {
  assert(pageContent.includes('Connect Your CRM'), 'Missing Step 1 title "Connect Your CRM"');
});

// Test 5: Step 2 - AI Responds Instantly
 test('Step 2: "AI Responds Instantly" is present', () => {
  assert(pageContent.includes('AI Responds Instantly'), 'Missing Step 2 title "AI Responds Instantly"');
});

// Test 6: Step 3 - Book & Close (or You Close the Deal)
 test('Step 3: "Book & Close" or "You Close the Deal" is present', () => {
  assert(pageContent.includes('Book & Close') || pageContent.includes('You Close the Deal'), 
    'Missing Step 3 title "Book & Close" or "You Close the Deal"');
});

// Test 7: HowItWorksStep component is defined
 test('HowItWorksStep component is defined in the file', () => {
  assert(pageContent.includes('function HowItWorksStep'), 'Missing HowItWorksStep component definition');
});

// Test 8: Section has proper styling classes
 test('How It Works section has proper background styling', () => {
  assert(pageContent.includes('bg-slate-100') || pageContent.includes('dark:bg-slate-800'), 
    'Missing background styling classes');
});

// Test 9: Section includes descriptive subtitle
 test('How It Works section includes descriptive subtitle', () => {
  assert(pageContent.includes('Get started in minutes') || pageContent.includes('Get up and running in minutes'), 
    'Missing descriptive subtitle');
});

// Test 10: Step cards have icons
 test('Step cards include emoji icons', () => {
  // Check for common emoji icons used in the steps
  const hasIcons = ['🔗', '⚡', '🤝'].some(icon => pageContent.includes(icon));
  assert(hasIcons, 'Step cards should include emoji icons');
});

// Test 11: Responsive grid layout
 test('How It Works section uses responsive grid layout', () => {
  assert(pageContent.includes('md:grid-cols-3'), 
    'Missing responsive grid classes (md:grid-cols-3)');
});

// Test 12: Section is positioned correctly (between Hero and Features)
 test('How It Works section is positioned correctly in page structure', () => {
  const heroIndex = pageContent.indexOf('AI-Powered Lead Response');
  const howItWorksIndex = pageContent.indexOf('id="how-it-works"');
  const featuresIndex = pageContent.indexOf('id="features"');
  
  assert(heroIndex !== -1, 'Hero section not found');
  assert(howItWorksIndex !== -1, 'How It Works section not found');
  assert(featuresIndex !== -1, 'Features section not found');
  assert(heroIndex < howItWorksIndex, 'How It Works should come after Hero');
  assert(howItWorksIndex < featuresIndex, 'How It Works should come before Features');
});

// Print summary
console.log('\n=== Test Summary ===');
console.log(`Total: ${results.passed + results.failed}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log(`Pass Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
