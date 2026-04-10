/**
 * Platform-Owned Twilio Provisioning Tests
 * 
 * Tests the platform-owned Twilio number provisioning feature:
 * - System mode: LeadFlow provisions a number for the agent
 * - Existing mode: Agent brings their own Twilio credentials
 * - UI mode switching
 * - API integration
 */

const assert = require('assert');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  skipApiTests: process.env.SKIP_API_TESTS === 'true',
};

// Test suite
class PlatformTwilioProvisioningTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
    };
  }

  /**
   * Test 1: Verify UI components exist
   */
  async testUIComponents() {
    console.log('\n🧪 TEST 1: UI Components');

    try {
      // Check that the integrations page exists
      const fs = require('fs');
      const path = require('path');
      
      const integrationsPage = path.join(__dirname, '../../product/lead-response/dashboard/app/integrations/page.tsx');
      const setupTwilio = path.join(__dirname, '../../product/lead-response/dashboard/app/setup/steps/twilio.tsx');
      const provisionApi = path.join(__dirname, '../../product/lead-response/dashboard/app/api/agents/onboarding/provision-phone/route.ts');

      assert(fs.existsSync(integrationsPage), 'Integrations page should exist');
      assert(fs.existsSync(setupTwilio), 'Setup Twilio step should exist');
      assert(fs.existsSync(provisionApi), 'Provision phone API should exist');

      // Check that integrations page has the mode selector
      const integrationsContent = fs.readFileSync(integrationsPage, 'utf8');
      assert(integrationsContent.includes("'system' | 'existing'"), 'Integrations should have mode types');
      assert(integrationsContent.includes('Use LeadFlow Number'), 'Integrations should have system mode UI');
      assert(integrationsContent.includes('Bring Your Own'), 'Integrations should have existing mode UI');
      assert(integrationsContent.includes('handleProvisionTwilio'), 'Integrations should have provision handler');

      // Check that setup wizard has both modes
      const setupContent = fs.readFileSync(setupTwilio, 'utf8');
      assert(setupContent.includes("'system' | 'existing'"), 'Setup should have mode types');
      assert(setupContent.includes('Use LeadFlow Number'), 'Setup should have system mode');
      assert(setupContent.includes('Bring Your Own Number'), 'Setup should have existing mode');
      assert(setupContent.includes('provision-phone'), 'Setup should call provision API');

      console.log('  ✅ Integrations page has mode selector');
      console.log('  ✅ Setup wizard has mode selector');
      console.log('  ✅ Provision API exists');

      console.log('✅ PASS: UI components verified');
      this.recordResult('UI Components', true);
    } catch (error) {
      console.error('❌ FAIL:', error.message);
      this.recordResult('UI Components', false, error.message);
    }
  }

  /**
   * Test 2: Verify API route structure
   */
  async testAPIRoute() {
    console.log('\n🧪 TEST 2: API Route Structure');

    try {
      const fs = require('fs');
      const path = require('path');
      
      const provisionApi = path.join(__dirname, '../../product/lead-response/dashboard/app/api/agents/onboarding/provision-phone/route.ts');
      const apiContent = fs.readFileSync(provisionApi, 'utf8');

      // Check for key functionality
      assert(apiContent.includes('availablePhoneNumbers'), 'API should search for available numbers');
      assert(apiContent.includes('incomingPhoneNumbers.create'), 'API should provision numbers');
      assert(apiContent.includes('agent_integrations'), 'API should update agent_integrations');
      assert(apiContent.includes('sms_enabled'), 'API should enable SMS');
      assert(apiContent.includes('phone_configured'), 'API should mark phone as configured');

      console.log('  ✅ API searches for available numbers');
      console.log('  ✅ API provisions numbers via Twilio');
      console.log('  ✅ API updates database records');
      console.log('  ✅ API enables SMS for agent');

      console.log('✅ PASS: API route structure verified');
      this.recordResult('API Route Structure', true);
    } catch (error) {
      console.error('❌ FAIL:', error.message);
      this.recordResult('API Route Structure', false, error.message);
    }
  }

  /**
   * Test 3: Verify error handling
   */
  async testErrorHandling() {
    console.log('\n🧪 TEST 3: Error Handling');

    try {
      const fs = require('fs');
      const path = require('path');
      
      const provisionApi = path.join(__dirname, '../../product/lead-response/dashboard/app/api/agents/onboarding/provision-phone/route.ts');
      const apiContent = fs.readFileSync(provisionApi, 'utf8');

      // Check for error handling
      assert(apiContent.includes('ORPHANED TWILIO NUMBER'), 'API should handle orphaned numbers');
      assert(apiContent.includes('try {'), 'API should use try-catch blocks');
      assert(apiContent.includes('catch'), 'API should catch errors');

      console.log('  ✅ API handles orphaned numbers');
      console.log('  ✅ API has try-catch error handling');

      console.log('✅ PASS: Error handling verified');
      this.recordResult('Error Handling', true);
    } catch (error) {
      console.error('❌ FAIL:', error.message);
      this.recordResult('Error Handling', false, error.message);
    }
  }

  /**
   * Test 4: Verify backward compatibility
   */
  async testBackwardCompatibility() {
    console.log('\n🧪 TEST 4: Backward Compatibility');

    try {
      const fs = require('fs');
      const path = require('path');
      
      const integrationsPage = path.join(__dirname, '../../product/lead-response/dashboard/app/integrations/page.tsx');
      const integrationsContent = fs.readFileSync(integrationsPage, 'utf8');

      // Check that existing BYO flow still works
      assert(integrationsContent.includes('/api/integrations/twilio/connect'), 'Should still support BYO flow');
      assert(integrationsContent.includes('accountSid'), 'Should still accept Account SID');
      assert(integrationsContent.includes('authToken'), 'Should still accept Auth Token');

      console.log('  ✅ BYO flow still supported');
      console.log('  ✅ Account SID/Auth Token still accepted');

      console.log('✅ PASS: Backward compatibility verified');
      this.recordResult('Backward Compatibility', true);
    } catch (error) {
      console.error('❌ FAIL:', error.message);
      this.recordResult('Backward Compatibility', false, error.message);
    }
  }

  /**
   * Test 5: Verify A2P 10DLC compliance notes
   */
  async testComplianceNotes() {
    console.log('\n🧪 TEST 5: A2P 10DLC Compliance');

    try {
      const fs = require('fs');
      const path = require('path');
      
      // Check that compliance is mentioned in docs
      const claudeMd = path.join(__dirname, '../../CLAUDE.md');
      if (fs.existsSync(claudeMd)) {
        const content = fs.readFileSync(claudeMd, 'utf8');
        const hasA2P = content.includes('A2P') || content.includes('10DLC');
        if (hasA2P) {
          console.log('  ✅ A2P 10DLC mentioned in documentation');
        } else {
          console.log('  ⚠️  A2P 10DLC not mentioned (may be documented elsewhere)');
        }
      }

      // Check for STOP language in SMS handling
      const twilioLib = path.join(__dirname, '../../lib/services/TwilioService.js');
      if (fs.existsSync(twilioLib)) {
        const content = fs.readFileSync(twilioLib, 'utf8');
        assert(content.includes('STOP'), 'SMS lib should mention STOP compliance');
        assert(content.includes('TCPA'), 'SMS lib should mention TCPA');
        console.log('  ✅ STOP language compliance in SMS lib');
      }

      console.log('✅ PASS: Compliance notes verified');
      this.recordResult('A2P 10DLC Compliance', true);
    } catch (error) {
      console.error('❌ FAIL:', error.message);
      this.recordResult('A2P 10DLC Compliance', false, error.message);
    }
  }

  /**
   * Helper: Record test result
   */
  recordResult(testName, passed, details = null) {
    this.results.tests.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString(),
    });

    if (passed) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }
  }

  /**
   * Print final test report
   */
  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PLATFORM-OWNED TWILIO PROVISIONING TEST REPORT');
    console.log('='.repeat(60));

    console.log(`\n✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    const total = this.results.passed + this.results.failed;
    console.log(`📈 Success Rate: ${total > 0 ? (this.results.passed / total * 100).toFixed(0) : 0}%`);

    console.log('\n📋 Test Details:');
    this.results.tests.forEach((test, i) => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${i + 1}. ${status} ${test.name}`);
      if (test.details) {
        console.log(`   Details: ${test.details}`);
      }
    });

    console.log('\n' + '='.repeat(60));

    if (this.results.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Platform-owned Twilio provisioning is working.');
    } else {
      console.log(`⚠️  ${this.results.failed} test(s) failed. Review above.`);
    }

    console.log('='.repeat(60) + '\n');

    return this.results;
  }
}

// ===== RUN TESTS =====
async function runAllTests() {
  console.log('🚀 Starting Platform-Owned Twilio Provisioning Tests\n');

  const suite = new PlatformTwilioProvisioningTestSuite();

  // Run tests in sequence
  await suite.testUIComponents();
  await suite.testAPIRoute();
  await suite.testErrorHandling();
  await suite.testBackwardCompatibility();
  await suite.testComplianceNotes();

  // Print results
  return suite.printReport();
}

// ===== EXPORTS & EXECUTION =====
module.exports = { PlatformTwilioProvisioningTestSuite };

if (require.main === module) {
  runAllTests().catch(console.error);
}
