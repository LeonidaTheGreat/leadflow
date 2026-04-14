/**
 * E2E Test: Production Vercel Deployment - Signup/Trial and Dashboard Routes
 * 
 * Verifies that the fix for testimonial.role → testimonial.title resolves:
 * - /signup/trial returns 200 (not 404)
 * - /dashboard redirects to login (not 404)
 * - Homepage with testimonials renders correctly
 */

const assert = require('assert');
const https = require('https');

const BASE_URL = 'https://leadflow-ai-five.vercel.app';

/**
 * Make an HTTPS request and return status + response body
 */
function makeRequest(path, followRedirects = false) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'leadflow-ai-five.vercel.app',
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (E2E Test)',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Test: /signup/trial route exists and returns 200
 */
async function testSignupTrialRoute() {
  console.log('\n🧪 TEST 1: /signup/trial route accessibility');
  const res = await makeRequest('/signup/trial');
  
  console.log(`   Status: ${res.status}`);
  assert.strictEqual(
    res.status,
    200,
    `Expected /signup/trial to return 200, got ${res.status}`
  );
  
  assert.ok(
    res.body.length > 0,
    'Expected /signup/trial to return HTML content'
  );
  
  console.log('   ✅ PASS: /signup/trial returns 200 with content');
}

/**
 * Test: /dashboard route returns 307 redirect (authenticated users would see dashboard)
 */
async function testDashboardRoute() {
  console.log('\n🧪 TEST 2: /dashboard route accessibility');
  const res = await makeRequest('/dashboard');
  
  console.log(`   Status: ${res.status}`);
  console.log(`   Location: ${res.headers.location || 'N/A'}`);
  
  assert.ok(
    res.status !== 404,
    `Expected /dashboard to NOT return 404, got ${res.status}`
  );
  
  assert.strictEqual(
    res.status,
    307,
    `Expected /dashboard redirect to /login, got ${res.status}`
  );
  
  assert.ok(
    res.headers.location.includes('/login'),
    'Expected redirect to /login'
  );
  
  console.log('   ✅ PASS: /dashboard redirects to login (not 404)');
}

/**
 * Test: Homepage renders without errors (testimonials section)
 */
async function testHomePageTestimonials() {
  console.log('\n🧪 TEST 3: Homepage testimonials section renders');
  const res = await makeRequest('/');
  
  console.log(`   Status: ${res.status}`);
  assert.strictEqual(res.status, 200, 'Expected homepage to return 200');
  
  // Verify testimonials are in the HTML
  assert.ok(
    res.body.includes('What Agents Are Saying'),
    'Expected testimonials section header in HTML'
  );
  
  // Verify at least one testimonial is rendered
  assert.ok(
    res.body.includes('Solo Agent, Austin TX'),
    'Expected testimonial content (title field) in HTML'
  );
  
  assert.ok(
    res.body.includes('Sarah M.'),
    'Expected testimonial name in HTML'
  );
  
  // Verify testimonials use data-testid
  assert.ok(
    res.body.includes('data-testid="testimonials"'),
    'Expected testimonials section to have data-testid'
  );
  
  console.log('   ✅ PASS: Homepage renders testimonials correctly');
}

/**
 * Test: Signup/trial page has expected UI elements
 */
async function testSignupTrialContent() {
  console.log('\n🧪 TEST 4: /signup/trial page is HTML structure (not 404)');
  const res = await makeRequest('/signup/trial');
  
  assert.strictEqual(res.status, 200, 'Expected signup/trial to return 200');
  
  // Check for HTML structure (page loaded, not 404 error)
  assert.ok(
    res.body.includes('<!DOCTYPE html>') || res.body.includes('<html'),
    'Expected valid HTML response (not 404 error page)'
  );
  
  // Check for LeadFlow branding (indicates correct app)
  assert.ok(
    res.body.includes('LeadFlow'),
    'Expected LeadFlow content on signup page'
  );
  
  // Verify it's not a 404 error page
  assert.ok(
    !res.body.includes('Page Not Found') || res.body.includes('LeadFlow AI'),
    'Page should not be a 404 error page'
  );
  
  console.log('   ✅ PASS: /signup/trial page loads successfully (not 404)');
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('E2E TEST SUITE: Production Vercel Deployment Fix');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  const results = [];
  
  const tests = [
    { name: 'Signup/Trial Route', fn: testSignupTrialRoute },
    { name: 'Dashboard Route', fn: testDashboardRoute },
    { name: 'Homepage Testimonials', fn: testHomePageTestimonials },
    { name: 'Signup/Trial Content', fn: testSignupTrialContent },
  ];
  
  for (const test of tests) {
    try {
      await test.fn();
      passed++;
      results.push({ test: test.name, status: '✅ PASS' });
    } catch (error) {
      failed++;
      results.push({ test: test.name, status: '❌ FAIL', error: error.message });
      console.error(`\n   ❌ FAIL: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));
  results.forEach((r) => {
    console.log(`${r.status} ${r.test}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Pass Rate: ${((passed / tests.length) * 100).toFixed(0)}%`);
  console.log('='.repeat(60) + '\n');
  
  return { passed, failed, total: tests.length };
}

// Run tests
runAllTests()
  .then((results) => {
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
