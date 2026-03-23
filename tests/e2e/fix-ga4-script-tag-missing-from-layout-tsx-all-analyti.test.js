/**
 * E2E Test: GA4 Script Tag in Layout
 * 
 * This test verifies that the GA4 script tag is properly included in the layout.tsx
 * and that the gtag function is properly initialized.
 * 
 * Task: fix-ga4-script-tag-missing-from-layout-tsx-all-analyti
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Test configuration
const LAYOUT_PATH = path.join(__dirname, '../product/lead-response/dashboard/app/layout.tsx');

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function log(message, isError = false) {
  console.log(`${isError ? RED : GREEN}${message}${RESET}`);
}

async function runTests() {
  console.log('\n=== GA4 Script Tag E2E Test ===\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: layout.tsx exists
  try {
    assert.ok(fs.existsSync(LAYOUT_PATH), 'layout.tsx should exist');
    log('✓ layout.tsx exists');
    passed++;
  } catch (error) {
    log(`✗ layout.tsx exists: ${error.message}`, true);
    failed++;
    return { passed, failed }; // Can't continue without layout file
  }

  const layoutContent = fs.readFileSync(LAYOUT_PATH, 'utf-8');

  // Test 2: Script component is imported from next/script
  try {
    assert.ok(
      layoutContent.includes("import Script from \"next/script\";") ||
      layoutContent.includes("import Script from 'next/script';"),
      'Script component should be imported from next/script'
    );
    log('✓ Script component imported from next/script');
    passed++;
  } catch (error) {
    log(`✗ Script component import: ${error.message}`, true);
    failed++;
  }

  // Test 3: GA_ID reads from environment variable
  try {
    assert.ok(
      layoutContent.includes('process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID'),
      'GA_ID should be read from NEXT_PUBLIC_GA4_MEASUREMENT_ID env var'
    );
    log('✓ GA_ID reads from NEXT_PUBLIC_GA4_MEASUREMENT_ID env var');
    passed++;
  } catch (error) {
    log(`✗ GA_ID env var: ${error.message}`, true);
    failed++;
  }

  // Test 4: Google Tag Manager script URL is included
  try {
    assert.ok(
      layoutContent.includes('www.googletagmanager.com/gtag/js'),
      'Google Tag Manager script URL should be present'
    );
    log('✓ Google Tag Manager script URL present');
    passed++;
  } catch (error) {
    log(`✗ GTM script URL: ${error.message}`, true);
    failed++;
  }

  // Test 5: gtag initialization script is present
  try {
    assert.ok(
      layoutContent.includes('window.dataLayer = window.dataLayer || []'),
      'dataLayer initialization should be present'
    );
    assert.ok(
      layoutContent.includes('function gtag(){dataLayer.push(arguments);}'),
      'gtag function should be defined'
    );
    assert.ok(
      layoutContent.includes('window.gtag = gtag'),
      'gtag should be exposed on window'
    );
    log('✓ gtag initialization script present');
    passed++;
  } catch (error) {
    log(`✗ gtag initialization: ${error.message}`, true);
    failed++;
  }

  // Test 6: gtag config with GA_ID is present
  try {
    assert.ok(
      layoutContent.includes("gtag('config', '${GA_ID}'") ||
      layoutContent.includes('gtag("config", `${GA_ID}`') ||
      layoutContent.includes("gtag('config', `${GA_ID}`"),
      'gtag config with GA_ID should be present'
    );
    log('✓ gtag config with GA_ID present');
    passed++;
  } catch (error) {
    log(`✗ gtag config: ${error.message}`, true);
    failed++;
  }

  // Test 7: Script has proper strategy="afterInteractive"
  try {
    assert.ok(
      layoutContent.includes('strategy="afterInteractive"'),
      'Script should have strategy="afterInteractive" for performance'
    );
    log('✓ Script has strategy="afterInteractive"');
    passed++;
  } catch (error) {
    log(`✗ Script strategy: ${error.message}`, true);
    failed++;
  }

  // Test 8: Conditional rendering based on GA_ID presence
  try {
    assert.ok(
      layoutContent.includes('{GA_ID && (') ||
      layoutContent.includes('{GA_ID &&') ||
      layoutContent.includes('GA_ID ?'),
      'GA4 scripts should be conditionally rendered based on GA_ID presence'
    );
    log('✓ Conditional rendering based on GA_ID presence');
    passed++;
  } catch (error) {
    log(`✗ Conditional rendering: ${error.message}`, true);
    failed++;
  }

  // Test 9: send_page_view is enabled
  try {
    assert.ok(
      layoutContent.includes('send_page_view: true'),
      'send_page_view should be enabled in config'
    );
    log('✓ send_page_view enabled in config');
    passed++;
  } catch (error) {
    log(`✗ send_page_view: ${error.message}`, true);
    failed++;
  }

  // Test 10: Metadata is properly set
  try {
    assert.ok(
      layoutContent.includes('LeadFlow AI'),
      'Title should include LeadFlow AI'
    );
    assert.ok(
      layoutContent.includes('AI-powered lead response'),
      'Description should mention AI-powered lead response'
    );
    log('✓ Metadata properly set for LeadFlow AI');
    passed++;
  } catch (error) {
    log(`✗ Metadata: ${error.message}`, true);
    failed++;
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Total: ${passed + failed}`);
  log(`Passed: ${passed}`);
  if (failed > 0) {
    log(`Failed: ${failed}`, true);
  }

  return { passed, failed };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
