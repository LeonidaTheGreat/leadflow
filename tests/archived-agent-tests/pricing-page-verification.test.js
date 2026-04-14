/**
 * Pricing Page Verification Test
 * Validates that the landing page and /pricing page show correct tiers and prices
 * matching PMF.md as specified in PRD-LANDING-PRICING-4TIERS
 */

const fs = require('fs');
const path = require('path');

// Expected pricing from PMF.md
const EXPECTED_PRICES = {
  Starter: 49,
  Pro: 149,
  Team: 399,
  Brokerage: 999
};

// Expected features from PRD-LANDING-PRICING-4TIERS
const EXPECTED_FEATURES = {
  Starter: {
    sms: '100/mo',
    aiQuality: 'Basic',
    fubIntegration: true,
    calcomBooking: false,
    analytics: 'Basic',
    leadScoring: false,
    agents: '1',
    leadRouting: false,
    whiteLable: false,
    complianceReporting: false,
  },
  Pro: {
    sms: 'Unlimited',
    aiQuality: 'Full AI (Claude)',
    fubIntegration: true,
    calcomBooking: true,
    analytics: 'Full',
    leadScoring: true,
    agents: '1',
    leadRouting: false,
    whiteLable: false,
    complianceReporting: false,
  },
  Team: {
    sms: 'Unlimited',
    aiQuality: 'Full AI (Claude)',
    fubIntegration: true,
    calcomBooking: true,
    analytics: 'Full',
    leadScoring: true,
    agents: '5',
    leadRouting: true,
    whiteLable: false,
    complianceReporting: false,
  },
  Brokerage: {
    sms: 'Unlimited',
    aiQuality: 'Full + Custom',
    fubIntegration: true,
    calcomBooking: true,
    analytics: 'Full + Admin',
    leadScoring: true,
    agents: 'Unlimited',
    leadRouting: true,
    whiteLable: true,
    complianceReporting: true,
  },
};

async function testLandingPagePricing() {
  console.log('\n🧪 TEST: Landing Page Pricing Section');
  
  const landingPagePath = path.join(__dirname, '../product/lead-response/dashboard/app/page.tsx');
  
  if (!fs.existsSync(landingPagePath)) {
    console.error('❌ FAIL: Landing page not found at', landingPagePath);
    return false;
  }
  
  const content = fs.readFileSync(landingPagePath, 'utf-8');
  
  let allPassed = true;
  
  // Check for each tier
  for (const [tierName, price] of Object.entries(EXPECTED_PRICES)) {
    const priceStr = tierName === 'Brokerage' ? `$999+` : `$${price}`;
    
    if (!content.includes(`name="${tierName}"`) && !content.includes(`name: "${tierName}"`)) {
      console.error(`  ❌ Tier not found: ${tierName}`);
      allPassed = false;
    } else {
      console.log(`  ✓ Tier found: ${tierName}`);
    }
    
    if (!content.includes(`"${priceStr}"`) && !content.includes(`'${priceStr}'`)) {
      console.error(`  ❌ Price mismatch for ${tierName}: expected ${priceStr}`);
      allPassed = false;
    } else {
      console.log(`  ✓ Price correct: ${tierName} = ${priceStr}`);
    }
  }
  
  // Check Pro is marked as "Most Popular"
  if (!content.includes('MOST POPULAR')) {
    console.error(`  ❌ Pro tier not marked as "MOST POPULAR"`);
    allPassed = false;
  } else {
    console.log(`  ✓ Pro tier marked as "MOST POPULAR"`);
  }
  
  // Check for pricing section heading
  if (!content.includes('Simple, Transparent Pricing')) {
    console.error(`  ❌ Missing "Simple, Transparent Pricing" heading`);
    allPassed = false;
  } else {
    console.log(`  ✓ Pricing section heading present`);
  }
  
  return allPassed;
}

async function testPricingPagePricing() {
  console.log('\n🧪 TEST: Dedicated Pricing Page (/pricing)');
  
  const pricingPagePath = path.join(__dirname, '../product/lead-response/dashboard/app/pricing/page.tsx');
  
  if (!fs.existsSync(pricingPagePath)) {
    console.error('❌ FAIL: Pricing page not found at', pricingPagePath);
    return false;
  }
  
  const content = fs.readFileSync(pricingPagePath, 'utf-8');
  
  let allPassed = true;
  
  // Check for each tier
  for (const [tierName, price] of Object.entries(EXPECTED_PRICES)) {
    if (!content.includes(`name: '${tierName}'`) && !content.includes(`"${tierName}"`)) {
      console.error(`  ❌ Tier not found: ${tierName}`);
      allPassed = false;
    } else {
      console.log(`  ✓ Tier found: ${tierName}`);
    }
    
    // Check price in PRICING_PLANS
    if (tierName === 'Brokerage') {
      if (!content.includes('monthlyPrice: 999')) {
        console.error(`  ❌ Price mismatch for ${tierName}: expected monthlyPrice: 999`);
        allPassed = false;
      } else {
        console.log(`  ✓ Price correct: ${tierName} = $999+`);
      }
    } else {
      if (!content.includes(`monthlyPrice: ${price}`)) {
        console.error(`  ❌ Price mismatch for ${tierName}: expected monthlyPrice: ${price}`);
        allPassed = false;
      } else {
        console.log(`  ✓ Price correct: ${tierName} = $${price}`);
      }
    }
  }
  
  // Check for feature comparison table
  if (!content.includes('FEATURE_CATEGORIES') && !content.includes('Feature Comparison Table')) {
    console.error(`  ❌ Feature comparison table not found`);
    allPassed = false;
  } else {
    console.log(`  ✓ Feature comparison table present`);
  }
  
  // Check for Pro highlighted
  if (!content.includes('highlighted: true')) {
    console.error(`  ❌ Pro tier not marked as highlighted`);
    allPassed = false;
  } else {
    console.log(`  ✓ Pro tier marked as highlighted`);
  }
  
  // Check for contact sales button for Brokerage
  if (!content.includes('contact') || !content.includes('sales')) {
    console.error(`  ❌ Contact sales option for Brokerage not found`);
    allPassed = false;
  } else {
    console.log(`  ✓ Contact sales option present`);
  }
  
  return allPassed;
}

async function testNoWrongPrices() {
  console.log('\n🧪 TEST: No Incorrect Prices ($497, $997, $1997)');
  
  const landingPagePath = path.join(__dirname, '../product/lead-response/dashboard/app/page.tsx');
  const pricingPagePath = path.join(__dirname, '../product/lead-response/dashboard/app/pricing/page.tsx');
  
  const wrongPrices = ['$497', '$997', '$1997', '497', '997', '1997'];
  let allPassed = true;
  
  for (const filePath of [landingPagePath, pricingPagePath]) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      for (const wrongPrice of wrongPrices) {
        if (content.includes(wrongPrice)) {
          console.error(`  ❌ Found incorrect price "${wrongPrice}" in ${path.basename(filePath)}`);
          allPassed = false;
        }
      }
    }
  }
  
  if (allPassed) {
    console.log(`  ✓ No incorrect prices found`);
  }
  
  return allPassed;
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('  Pricing Page Verification Test Suite');
  console.log('========================================');
  
  const results = [];
  
  results.push({
    name: 'Landing Page Pricing',
    passed: await testLandingPagePricing()
  });
  
  results.push({
    name: 'Pricing Page (/pricing)',
    passed: await testPricingPagePricing()
  });
  
  results.push({
    name: 'No Incorrect Prices',
    passed: await testNoWrongPrices()
  });
  
  // Summary
  console.log('\n========================================');
  console.log('  TEST SUMMARY');
  console.log('========================================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const passRate = (passed / total).toFixed(2);
  
  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  }
  
  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`📈 Pass Rate: ${passRate}`);
  
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
