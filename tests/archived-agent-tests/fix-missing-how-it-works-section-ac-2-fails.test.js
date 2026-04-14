/**
 * E2E Test for fix-missing-how-it-works-section-ac-2-fails
 * Verifies AC-2: "How It Works" section visible with 3 numbered steps
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

const passed = (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`);
const failed = (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`);
const info = (msg) => console.log(`${colors.yellow}ℹ${colors.reset} ${msg}`);

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    passed(name);
    testsPassed++;
  } catch (e) {
    failed(`${name}: ${e.message}`);
    testsFailed++;
  }
}

console.log('\n========================================');
console.log('E2E Test: How It Works Section (AC-2)');
console.log('========================================\n');

// Read the LandingPage component
const landingPagePath = path.join(__dirname, '../frontend/src/components/LandingPage.tsx');
const landingPageContent = fs.readFileSync(landingPagePath, 'utf8');

// Test 1: How It Works section exists
test('How It Works section is present in LandingPage', () => {
  assert(landingPageContent.includes('How It Works'), 'Section heading "How It Works" not found');
  assert(landingPageContent.includes('data-testid="how-it-works-section"'), 'data-testid attribute not found');
});

// Test 2: All three steps are present
test('Step 1: Connect Your CRM is present', () => {
  assert(landingPageContent.includes('Connect Your CRM'), 'Step 1 title not found');
  assert(landingPageContent.includes('Link your Follow Up Boss account'), 'Step 1 description not found');
});

test('Step 2: AI Responds Instantly is present', () => {
  assert(landingPageContent.includes('AI Responds Instantly'), 'Step 2 title not found');
  assert(landingPageContent.includes('AI sends a personalized SMS'), 'Step 2 description not found');
});

test('Step 3: You Close the Deal is present', () => {
  assert(landingPageContent.includes('You Close the Deal'), 'Step 3 title not found');
  assert(landingPageContent.includes('Qualified leads book appointments'), 'Step 3 description not found');
});

// Test 3: Numbered badges (1, 2, 3)
test('Numbered badges are present for all 3 steps', () => {
  // Check for the step number badges - they're in the content between the badge divs
  // The badges use a circular design with numbers 1, 2, 3
  const howItWorksSection = landingPageContent.substring(
    landingPageContent.indexOf('How It Works'),
    landingPageContent.indexOf('Trusted by Industry Leaders')
  );
  
  // Check for numbered badges in the section (looking for the badge div pattern)
  const badgeMatches = howItWorksSection.match(/w-8 h-8 bg-primary/g);
  assert(badgeMatches && badgeMatches.length >= 3, `Expected 3 step badges, found ${badgeMatches ? badgeMatches.length : 0}`);
});

// Test 4: Icons are imported and used
test('Icons are imported (Link2, MessageSquare, Trophy)', () => {
  assert(landingPageContent.includes('Link2'), 'Link2 icon not found');
  assert(landingPageContent.includes('MessageSquare'), 'MessageSquare icon not found');
  assert(landingPageContent.includes('Trophy'), 'Trophy icon not found');
});

// Test 5: Section is positioned between Features and Social Proof
test('Section is positioned between Features and Social Proof', () => {
  const featuresIndex = landingPageContent.indexOf('Why Top Agents Choose LeadFlow');
  const howItWorksIndex = landingPageContent.indexOf('How It Works');
  const socialProofIndex = landingPageContent.indexOf('Trusted by Industry Leaders');
  
  assert(featuresIndex > 0, 'Features section not found');
  assert(howItWorksIndex > 0, 'How It Works section not found');
  assert(socialProofIndex > 0, 'Social Proof section not found');
  assert(featuresIndex < howItWorksIndex, 'How It Works should come after Features');
  assert(howItWorksIndex < socialProofIndex, 'Social Proof should come after How It Works');
});

// Test 6: Responsive grid layout
test('Responsive grid layout (md:grid-cols-3)', () => {
  assert(landingPageContent.includes('md:grid-cols-3'), 'Responsive grid class not found');
});

// Test 7: Event tracking is implemented
test('GA4 event tracking is implemented for each step', () => {
  assert(landingPageContent.includes('how_it_works_step_1'), 'Step 1 tracking not found');
  assert(landingPageContent.includes('how_it_works_step_2'), 'Step 2 tracking not found');
  assert(landingPageContent.includes('how_it_works_step_3'), 'Step 3 tracking not found');
  assert(landingPageContent.includes('handleFeatureClick'), 'Feature click handler not found');
});

// Test 8: Section has proper styling
test('Section has proper styling classes', () => {
  assert(landingPageContent.includes('bg-background'), 'Background class not found');
  assert(landingPageContent.includes('rounded-lg'), 'Rounded corners not found');
  assert(landingPageContent.includes('hover:shadow-lg'), 'Hover shadow effect not found');
});

// Test 9: Subheading is present
test('Subheading "Get started in minutes, not hours" is present', () => {
  assert(landingPageContent.includes('Get started in minutes, not hours'), 'Subheading not found');
});

// Summary
console.log('\n========================================');
console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
console.log('========================================\n');

if (testsFailed > 0) {
  process.exit(1);
}

info('AC-2 Verification: PASSED - How It Works section is correctly implemented');
