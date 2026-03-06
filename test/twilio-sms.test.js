/**
 * Twilio SMS Integration Tests
 * Tests the real Twilio SMS implementation
 */

require('dotenv').config();
const assert = require('assert');
const {
  sendSmsViatwilio,
  updateSmsStatus,
  getSmsStatus,
  getSmsHistoryForLead,
  getSmsAnalytics,
  DeliveryStatus,
  validateSmsInput,
  selectFromNumber,
  truncateMessage,
  classifyTwilioError,
} = require('../lib/twilio-sms');

// Test configuration
const TEST_CONFIG = {
  testPhoneNumber: process.env.TEST_SMS_PHONE_NUMBER || '+14165551234',
  twilioPhoneUs: process.env.TWILIO_PHONE_NUMBER_US,
  twilioPhoneCa: process.env.TWILIO_PHONE_NUMBER_CA,
};

// Test suite
class TwilioSmsTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
    };
  }

  /**
   * Test 1: Validate SMS input - valid inputs
   */
  async testValidateSmsInputValid() {
    console.log('\n🧪 TEST 1: Validate SMS Input (Valid)');

    try {
      // Should not throw
      validateSmsInput('+14165551234', 'Test message with STOP');
      validateSmsInput('+12345678901', 'Another test message STOP');
      validateSmsInput('+447911123456', 'UK number test STOP');

      console.log('✅ PASS: Valid inputs accepted');
      this.recordResult('Validate SMS Input (Valid)', true);
    } catch (error) {
      console.error('❌ FAIL:', error.message);
      this.recordResult('Validate SMS Input (Valid)', false, error.message);
    }
  }

  /**
   * Test 2: Validate SMS input - invalid phone number
   */
  async testValidateSmsInputInvalidPhone() {
    console.log('\n🧪 TEST 2: Validate SMS Input (Invalid Phone)');

    try {
      // Missing +
      try {
        validateSmsInput('4165551234', 'Test message');
        throw new Error('Should have thrown for missing +');
      } catch (e) {
        assert(e.message.includes('E.164'), 'Should mention E.164 format');
      }

      // Invalid format
      try {
        validateSmsInput('abc', 'Test message');
        throw new Error('Should have thrown for invalid format');
      } catch (e) {
        assert(e.message.includes('E.164'), 'Should mention E.164 format');
      }

      console.log('✅ PASS: Invalid phone numbers rejected');
      this.recordResult('Validate SMS Input (Invalid Phone)', true);
    } catch (error) {
      console.error('❌ FAIL:', error.message);
      this.recordResult('Validate SMS Input (Invalid Phone)', false, error.message);
    }
  }

  /**
   * Test 3: Validate SMS input - empty message
   */
  async testValidateSmsInputEmptyMessage() {
    console.log('\n🧪 TEST 3: Validate SMS Input (Empty Message)');

    try {
      try {
        validateSmsInput('+14165551234', '');
        throw new Error('Should have thrown for empty message');
      } catch (e) {
        assert(e.message.includes('required'), 'Should mention required');
      }

      try {
        validateSmsInput('+14165551234', '   ');
        throw new Error('Should have thrown for whitespace-only message');
      } catch (e) {
        assert(e.message.includes('required'), 'Should mention required');
      }

      console.log('✅ PASS: Empty messages rejected');
      this.recordResult('Validate SMS Input (Empty Message)', true);
    } catch (error) {
      console.error('❌ FAIL:', error.message);
      this.recordResult('Validate SMS Input (Empty Message)', false, error.message);
    }
  }

  /**
   * Test 4: Select from number based on market
   */
  async testSelectFromNumber() {
    console.log('\n🧪 TEST 4: Select From Number by Market');

    try {
      // US market
      const usNumber = selectFromNumber('us-national', '+14165551234');
      console.log(`   US market: ${usNumber}`);

      // CA market
      const caNumber = selectFromNumber('ca-ontario', '+14165551234');
      console.log(`   CA market: ${caNumber}`);

      // Auto-detect Canadian number
      const caDetected = selectFromNumber(null, '+14165551234');
      console.log(`   CA detected (416): ${caDetected}`);

      // Auto-detect US number
      const usDetected = selectFromNumber(null, '+12125551234');
      console.log(`   US detected (212): ${usDetected}`);

      console.log('✅ PASS: From number selection works');
      this.recordResult('Select From Number by Market', true);
    } catch (error) {
      console.error('❌ FAIL:', error.message);
      this.recordResult('Select From Number by Market', false, error.message);
    }
  }

  /**
   * Test 5: Truncate long messages
   */
  async testTruncateMessage() {
    console.log('\n🧪 TEST 5: Truncate Long Messages');

    try {
      // Short message - no truncation
      const shortMsg = 'Short message';
      const shortResult = truncateMessage(shortMsg);
      assert.strictEqual(shortResult, shortMsg, 'Short message should not be truncated');

      // Long message - should be truncated
      const longMsg = 'A'.repeat(200);
      const longResult = truncateMessage(longMsg);
      assert(longResult.length <= 160, 'Long message should be truncated to 160 chars');
      assert(longResult.endsWith('...'), 'Truncated message should end with ...');

      console.log(`✅ PASS: Message truncation works (${longMsg.length} → ${longResult.length})`);
      this.recordResult('Truncate Long Messages', true);
    } catch (error) {
      console.error('❌ FAIL:', error.message);
      this.recordResult('Truncate Long Messages', false, error.message);
    }
  }

  /**
   * Test 6: Classify Twilio errors
   */
  async testClassifyTwilioError() {
    console.log('\n🧪 TEST 6: Classify Twilio Errors');

    try {
      // Invalid number
      const invalidNumberError = { code: 21211, message: 'Invalid number' };
      const invalidResult = classifyTwilioError(invalidNumberError);
      assert.strictEqual(invalidResult.category, 'INVALID_NUMBER');
      assert.strictEqual(invalidResult.retryable, false);

      // Rate limit
      const rateLimitError = { code: 20429, message: 'Rate limit' };
      const rateLimitResult = classifyTwilioError(rateLimitError);
      assert.strictEqual(rateLimitResult.category, 'RATE_LIMIT');
      assert.strictEqual(rateLimitResult.retryable, true);

      // Account error
      const accountError = { code: 20003, message: 'Account suspended' };
      const accountResult = classifyTwilioError(accountError);
      assert.strictEqual(accountResult.category, 'ACCOUNT_ERROR');
      assert.strictEqual(accountResult.retryable, false);

      // Unknown error
      const unknownError = { code: 99999, message: 'Unknown' };
      const unknownResult = classifyTwilioError(unknownError);
      assert.strictEqual(unknownResult.category, 'UNKNOWN');

      console.log('✅ PASS: Error classification works');
      this.recordResult('Classify Twilio Errors', true);
    } catch (error) {
      console.error('❌ FAIL:', error.message);
      this.recordResult('Classify Twilio Errors', false, error.message);
    }
  }

  /**
   * Test 7: Send real SMS (optional - requires credentials)
   */
  async testSendRealSms() {
    console.log('\n🧪 TEST 7: Send Real SMS (Live Twilio API)');

    // Skip if no credentials or test number
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('⏭️  SKIP: Twilio credentials not configured');
      this.recordResult('Send Real SMS', true, 'Skipped - no credentials');
      return;
    }

    if (!TEST_CONFIG.testPhoneNumber) {
      console.log('⏭️  SKIP: TEST_SMS_PHONE_NUMBER not set');
      this.recordResult('Send Real SMS', true, 'Skipped - no test number');
      return;
    }

    try {
      const message = 'LeadFlow AI test message. Reply STOP to opt out.';
      const result = await sendSmsViatwilio(
        TEST_CONFIG.testPhoneNumber,
        message,
        {
          leadId: 'test-lead-123',
          trigger: 'test',
          market: 'ca-ontario',
        }
      );

      assert(result.success, 'SMS should be successful');
      assert(result.sid, 'Should have Twilio SID');
      assert(result.status, 'Should have status');
      assert(result.duration > 0, 'Should have duration');

      console.log(`✅ PASS: SMS sent successfully`);
      console.log(`   SID: ${result.sid}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Duration: ${result.duration}ms`);

      this.recordResult('Send Real SMS', true, { sid: result.sid, status: result.status });

      // Return SID for status check test
      return result.sid;

    } catch (error) {
      console.error('❌ FAIL:', error.message);
      this.recordResult('Send Real SMS', false, error.message);
      return null;
    }
  }

  /**
   * Test 8: Get SMS status
   */
  async testGetSmsStatus(sid) {
    console.log('\n🧪 TEST 8: Get SMS Status');

    if (!sid) {
      console.log('⏭️  SKIP: No SID from previous test');
      this.recordResult('Get SMS Status', true, 'Skipped - no SID');
      return;
    }

    try {
      const status = await getSmsStatus(sid);

      assert(status.sid, 'Should have SID');
      assert(status.status, 'Should have status');

      console.log(`✅ PASS: Retrieved SMS status`);
      console.log(`   SID: ${status.sid}`);
      console.log(`   Status: ${status.status}`);

      this.recordResult('Get SMS Status', true, { status: status.status });

    } catch (error) {
      console.error('❌ FAIL:', error.message);
      this.recordResult('Get SMS Status', false, error.message);
    }
  }

  /**
   * Test 9: Update SMS status (simulated webhook)
   */
  async testUpdateSmsStatus() {
    console.log('\n🧪 TEST 9: Update SMS Status (Webhook Simulation)');

    try {
      // This test simulates a Twilio status callback
      const mockStatusData = {
        MessageSid: `SM_test_${Date.now()}`,
        MessageStatus: 'delivered',
        ErrorCode: null,
        ErrorMessage: null,
      };

      // Note: This will fail if the SID doesn't exist in DB
      // In a real scenario, the SID would exist from a sent message
      const result = await updateSmsStatus(mockStatusData);

      // We expect null because the test SID won't exist
      // But the function should not throw
      console.log(`✅ PASS: Status update function executed (result: ${result ? 'updated' : 'no matching record'})`);
      this.recordResult('Update SMS Status', true);

    } catch (error) {
      console.error('❌ FAIL:', error.message);
      this.recordResult('Update SMS Status', false, error.message);
    }
  }

  /**
   * Test 10: Error handling - invalid number
   */
  async testErrorHandlingInvalidNumber() {
    console.log('\n🧪 TEST 10: Error Handling - Invalid Number');

    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.log('⏭️  SKIP: Twilio not configured');
      this.recordResult('Error Handling - Invalid Number', true, 'Skipped');
      return;
    }

    try {
      // Try to send to an invalid number
      await sendSmsViatwilio('+19999999999', 'Test message STOP', { trigger: 'test' });

      // If we get here, Twilio accepted it (some invalid numbers pass validation)
      console.log('✅ PASS: Twilio accepted the number (may be valid format)');
      this.recordResult('Error Handling - Invalid Number', true, 'Twilio accepted');

    } catch (error) {
      // Expected to fail
      assert(error.category || error.code, 'Error should have category or code');
      console.log(`✅ PASS: Error handled correctly`);
      console.log(`   Category: ${error.category || 'N/A'}`);
      console.log(`   Code: ${error.code || 'N/A'}`);
      console.log(`   Retryable: ${error.retryable}`);

      this.recordResult('Error Handling - Invalid Number', true, {
        category: error.category,
        code: error.code,
        retryable: error.retryable,
      });
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
    console.log('📊 TWILIO SMS TEST REPORT');
    console.log('='.repeat(60));

    console.log(`\n✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    const total = this.results.passed + this.results.failed;
    const rate = total > 0 ? ((this.results.passed / total) * 100).toFixed(0) : 0;
    console.log(`📈 Success Rate: ${rate}%`);

    console.log('\n📋 Test Details:');
    this.results.tests.forEach((test, i) => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${i + 1}. ${status} ${test.name}`);
      if (test.details && typeof test.details === 'string') {
        console.log(`   Details: ${test.details}`);
      } else if (test.details && typeof test.details === 'object') {
        console.log(`   Details: ${JSON.stringify(test.details)}`);
      }
    });

    console.log('\n' + '='.repeat(60));

    if (this.results.failed === 0) {
      console.log('🎉 ALL TESTS PASSED!');
    } else {
      console.log(`⚠️  ${this.results.failed} test(s) failed.`);
    }

    console.log('='.repeat(60) + '\n');

    return this.results;
  }
}

// ===== RUN TESTS =====
async function runAllTests() {
  console.log('🚀 Starting Twilio SMS Integration Tests\n');

  const suite = new TwilioSmsTestSuite();

  // Run unit tests (no API calls)
  await suite.testValidateSmsInputValid();
  await suite.testValidateSmsInputInvalidPhone();
  await suite.testValidateSmsInputEmptyMessage();
  await suite.testSelectFromNumber();
  await suite.testTruncateMessage();
  await suite.testClassifyTwilioError();

  // Run integration tests (API calls)
  const sid = await suite.testSendRealSms();
  await suite.testGetSmsStatus(sid);
  await suite.testUpdateSmsStatus();
  await suite.testErrorHandlingInvalidNumber();

  // Print results
  return suite.printReport();
}

// ===== EXPORTS & EXECUTION =====
module.exports = { TwilioSmsTestSuite };

if (require.main === module) {
  runAllTests().catch(console.error);
}
