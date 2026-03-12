/**
 * E2E Test: fix-brokerage-tier-missing-from-pricing-page
 * Verifies the Brokerage tier is correctly displayed on the landing page
 */

const assert = require('assert');
const { renderToString } = require('react-dom/server');
const React = require('react');

// Mock next/link for server rendering
const mockLink = ({ href, children, className }) => {
  return React.createElement('a', { href, className }, children);
};

// Simple test runner
async function runTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    return { passed: true, name };
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${error.message}`);
    return { passed: false, name, error: error.message };
  }
}

async function main() {
  console.log('\n=== E2E Test: Brokerage Tier on Landing Page ===\n');
  
  const results = [];
  
  // Test 1: Verify page.tsx contains Brokerage tier
  results.push(await runTest('page.tsx contains Brokerage tier', () => {
    const fs = require('fs');
    const path = require('path');
    const pagePath = path.join(__dirname, '../app/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    
    assert(content.includes('name="Brokerage"'), 'Brokerage tier name not found');
    assert(content.includes('price="$999+"'), 'Brokerage price not found');
    assert(content.includes('For large brokerages'), 'Brokerage description not found');
  }));
  
  // Test 2: Verify grid layout supports 4 columns
  results.push(await runTest('Grid layout uses lg:grid-cols-4 for 4 tiers', () => {
    const fs = require('fs');
    const path = require('path');
    const pagePath = path.join(__dirname, '../app/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    
    assert(content.includes('lg:grid-cols-4'), 'Grid layout should use lg:grid-cols-4');
    assert(content.includes('max-w-6xl'), 'Container should use max-w-6xl for 4 cards');
  }));
  
  // Test 3: Verify all 4 tiers are present
  results.push(await runTest('All 4 pricing tiers are present', () => {
    const fs = require('fs');
    const path = require('path');
    const pagePath = path.join(__dirname, '../app/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    
    assert(content.includes('name="Starter"'), 'Starter tier not found');
    assert(content.includes('name="Pro"'), 'Pro tier not found');
    assert(content.includes('name="Team"'), 'Team tier not found');
    assert(content.includes('name="Brokerage"'), 'Brokerage tier not found');
  }));
  
  // Test 4: Verify correct prices for all tiers
  results.push(await runTest('All tier prices are correct', () => {
    const fs = require('fs');
    const path = require('path');
    const pagePath = path.join(__dirname, '../app/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    
    assert(content.includes('price="$49"'), 'Starter price not found');
    assert(content.includes('price="$149"'), 'Pro price not found');
    assert(content.includes('price="$399"'), 'Team price not found');
    assert(content.includes('price="$999+"'), 'Brokerage price not found');
  }));
  
  // Test 5: Verify Brokerage tier has Contact Sales CTA
  results.push(await runTest('Brokerage tier has Contact Sales CTA', () => {
    const fs = require('fs');
    const path = require('path');
    const pagePath = path.join(__dirname, '../app/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    
    assert(content.includes('cta="Contact Sales"'), 'Contact Sales CTA not found');
    assert(content.includes('mailto:sales@leadflow.ai'), 'Sales email link not found');
  }));
  
  // Test 6: Verify Brokerage tier features
  results.push(await runTest('Brokerage tier has correct features', () => {
    const fs = require('fs');
    const path = require('path');
    const pagePath = path.join(__dirname, '../app/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    
    assert(content.includes('Unlimited leads'), 'Unlimited leads feature not found');
    assert(content.includes('Unlimited agents'), 'Unlimited agents feature not found');
    assert(content.includes('White-label options'), 'White-label options feature not found');
    assert(content.includes('Admin dashboard'), 'Admin dashboard feature not found');
    assert(content.includes('Dedicated account manager'), 'Dedicated account manager feature not found');
    assert(content.includes('SLA guarantees'), 'SLA guarantees feature not found');
    assert(content.includes('Custom integrations'), 'Custom integrations feature not found');
  }));
  
  // Test 7: Verify PricingCard component supports cta prop
  results.push(await runTest('PricingCard component supports cta prop', () => {
    const fs = require('fs');
    const path = require('path');
    const pagePath = path.join(__dirname, '../app/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    
    assert(content.includes('cta?: string'), 'cta prop type definition not found');
    assert(content.includes("cta = 'Get Started'"), 'cta prop default value not found');
  }));
  
  // Test 8: Verify Brokerage tier hides trial link
  results.push(await runTest('Brokerage tier hides trial link', () => {
    const fs = require('fs');
    const path = require('path');
    const pagePath = path.join(__dirname, '../app/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    
    assert(content.includes('!isBrokerage'), 'isBrokerage conditional not found');
    assert(content.includes('const isBrokerage = name === \'Brokerage\''), 'isBrokerage check not found');
  }));
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Pass Rate: ${(passed/total * 100).toFixed(0)}%`);
  
  if (passed === total) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
