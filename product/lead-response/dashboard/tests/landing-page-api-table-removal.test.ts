/**
 * Landing Page - API Endpoints Table Removal Test
 * Verifies the API Endpoints developer table is removed and How It Works section is present
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const PAGE_FILE_PATH = path.join(__dirname, '../app/page.tsx');

// Test utilities
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ ${message}`);
  }
  console.log(`✅ ${message}`);
}

function assertNot(condition: boolean, message: string) {
  assert(!condition, message);
}

// Tests
async function runTests() {
  console.log('🧪 Testing Landing Page - API Endpoints Table Removal...\n');

  // Read the page file
  const pageContent = fs.readFileSync(PAGE_FILE_PATH, 'utf-8');

  // Test 1: API Endpoints section should NOT be present
  console.log('📋 Test 1: API Endpoints section is absent');
  const hasApiEndpointsHeading = pageContent.includes('API Endpoints');
  assertNot(hasApiEndpointsHeading, 'API Endpoints heading is NOT present in landing page');

  // Test 2: API endpoint documentation should NOT be present
  console.log('📋 Test 2: API endpoint documentation is absent');
  const hasEndpointTable = pageContent.includes('POST /api/webhook') || 
                           pageContent.includes('GET /api/') ||
                           pageContent.includes('<table');
  assertNot(hasEndpointTable, 'API endpoint table is NOT present in landing page');

  // Test 3: How It Works section should be present
  console.log('📋 Test 3: How It Works section is present');
  const hasHowItWorks = pageContent.includes('How It Works') || 
                        pageContent.includes('how-it-works');
  assert(hasHowItWorks, 'How It Works section IS present in landing page');

  // Test 4: All 3 steps should be present
  console.log('📋 Test 4: All 3 How It Works steps are present');
  const hasStep1 = pageContent.includes('Connect Your CRM');
  const hasStep2 = pageContent.includes('AI Responds Instantly');
  const hasStep3 = pageContent.includes('You Close the Deal') || 
                   pageContent.includes('Book & Close');
  
  assert(hasStep1, 'Step 1: "Connect Your CRM" IS present');
  assert(hasStep2, 'Step 2: "AI Responds Instantly" IS present');
  assert(hasStep3, 'Step 3: "You Close the Deal" IS present');

  // Test 5: HowItWorksStep component should be defined
  console.log('📋 Test 5: HowItWorksStep component is defined');
  const hasHowItWorksComponent = pageContent.includes('function HowItWorksStep') ||
                                  pageContent.includes('const HowItWorksStep');
  assert(hasHowItWorksComponent, 'HowItWorksStep component IS defined');

  // Test 6: Testimonials section should be present
  console.log('📋 Test 6: Testimonials section is present');
  const hasTestimonials = pageContent.includes('testimonials') || 
                          pageContent.includes('What Real Estate Agents Are Saying');
  assert(hasTestimonials, 'Testimonials section IS present');

  // Test 7: Pricing section should be present
  console.log('📋 Test 7: Pricing section is present');
  const hasPricing = pageContent.includes('Pricing') && 
                     pageContent.includes('Starter') &&
                     pageContent.includes('Pro');
  assert(hasPricing, 'Pricing section with tiers IS present');

  console.log('\n✨ All landing page tests passed!');
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Test failed:', error.message);
  process.exit(1);
});
