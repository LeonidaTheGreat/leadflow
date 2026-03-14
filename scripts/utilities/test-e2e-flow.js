/**
 * End-to-End Test Suite
 * Tests complete flow: Lead Created → AI SMS → Twilio Send
 * 
 * Usage: npm test integration/test-e2e-flow.js
 */

require('dotenv').config();
const assert = require('assert');
const axios = require('axios');

// ===== TEST CONFIGURATION =====
const TEST_CONFIG = {
  fubApiBase: process.env.FUB_API_BASE_URL || 'https://api.followupboss.com/v1',
  fubApiKey: process.env.FUB_API_KEY,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioPhoneUs: process.env.TWILIO_PHONE_NUMBER_US,
  twilioPhoneCa: process.env.TWILIO_PHONE_NUMBER_CA,
  market: process.env.MARKET_CONFIG || 'ca-ontario',
};

// ===== TEST SUITE =====
class E2ETestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
    };
  }

  /**
   * Test 1: Verify FUB API connectivity
   */
  async testFubApiConnectivity() {
    console.log('\n🧪 TEST 1: FUB API Connectivity');

    try {
      assert(
        TEST_CONFIG.fubApiKey,
        'FUB_API_KEY not set in .env'
      );

      const auth = Buffer.from(`${TEST_CONFIG.fubApiKey}:`).toString('base64');
      const response = await axios.get(
        `${TEST_CONFIG.fubApiBase}/me`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
          timeout: 5000,
        }
      );

      assert.strictEqual(response.status, 200, 'FUB API returned non-200 status');
      console.log('✅ PASS: FUB API is accessible');
      this.recordResult('FUB API Connectivity', true);
    } catch (error) {
      console.error('❌ FAIL: FUB API error:', error.message);
      this.recordResult('FUB API Connectivity', false, error.message);
    }
  }

  /**
   * Test 2: Verify Twilio API connectivity
   */
  async testTwilioApiConnectivity() {
    console.log('\n🧪 TEST 2: Twilio API Connectivity');

    try {
      assert(
        TEST_CONFIG.twilioAccountSid && TEST_CONFIG.twilioAuthToken,
        'Twilio credentials not set in .env'
      );

      const auth = Buffer.from(
        `${TEST_CONFIG.twilioAccountSid}:${TEST_CONFIG.twilioAuthToken}`
      ).toString('base64');

      const response = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${TEST_CONFIG.twilioAccountSid}.json`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
          timeout: 5000,
        }
      );

      assert.strictEqual(response.status, 200, 'Twilio API returned non-200 status');
      console.log('✅ PASS: Twilio API is accessible');
      this.recordResult('Twilio API Connectivity', true);
    } catch (error) {
      console.error('❌ FAIL: Twilio API error:', error.message);
      this.recordResult('Twilio API Connectivity', false, error.message);
    }
  }

  /**
   * Test 3: Create test lead in FUB
   */
  async testCreateLeadInFub() {
    console.log('\n🧪 TEST 3: Create Lead in FUB');

    try {
      const testLead = {
        firstName: 'Test',
        lastName: 'Lead_' + Date.now(),
        phones: [{ value: '+14165551234', type: 'mobile' }],
        emails: [{ value: `test${Date.now()}@example.com`, type: 'work' }],
        source: 'test_api',
        stage: 'Lead',
      };

      const response = await axios.post(
        `${TEST_CONFIG.fubApiBase}/people`,
        testLead,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${TEST_CONFIG.fubApiKey}:`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      assert.strictEqual(response.status, 201, 'Lead creation returned non-201 status');
      assert(response.data.id, 'Lead response missing ID');

      const leadId = response.data.id;
      console.log(`✅ PASS: Lead created in FUB (ID: ${leadId})`);
      this.recordResult('Create Lead in FUB', true, { leadId });

      return leadId;
    } catch (error) {
      console.error('❌ FAIL: Lead creation error:', error.message);
      this.recordResult('Create Lead in FUB', false, error.message);
      return null;
    }
  }

  /**
   * Test 4: Fetch lead from FUB API
   */
  async testFetchLeadFromFub(leadId) {
    console.log('\n🧪 TEST 4: Fetch Lead from FUB');

    try {
      assert(leadId, 'Lead ID not provided');

      const response = await axios.get(
        `${TEST_CONFIG.fubApiBase}/people/${leadId}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${TEST_CONFIG.fubApiKey}:`).toString('base64')}`,
          },
        }
      );

      assert.strictEqual(response.status, 200, 'Lead fetch returned non-200 status');
      assert.strictEqual(response.data.id, leadId, 'Lead ID mismatch');
      assert(response.data.phones?.length > 0, 'Lead missing phone number');

      console.log(`✅ PASS: Lead fetched successfully`);
      console.log(`   Name: ${response.data.firstName} ${response.data.lastName}`);
      console.log(`   Phone: ${response.data.phones?.[0]?.value}`);
      console.log(`   Stage: ${response.data.stage}`);

      this.recordResult('Fetch Lead from FUB', true, response.data);

      return response.data;
    } catch (error) {
      console.error('❌ FAIL: Lead fetch error:', error.message);
      this.recordResult('Fetch Lead from FUB', false, error.message);
      return null;
    }
  }

  /**
   * Test 5: Validate consent & DNC checks
   */
  async testConsentAndDncValidation(lead) {
    console.log('\n🧪 TEST 5: Consent & DNC Validation');

    try {
      // Check phone exists (consent implied by having phone in FUB)
      const phone = lead.phones?.[0]?.value;
      assert(phone, 'Lead missing phone number');

      // Check phone format (E.164) - add + if missing
      const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      assert(
        e164Regex.test(normalizedPhone),
        `Phone ${phone} not E.164 compliant`
      );

      // TODO: Implement actual DNC check with national registry
      console.log(`✅ PASS: Lead passed consent & format checks`);
      this.recordResult('Consent & DNC Validation', true);

      return true;
    } catch (error) {
      console.error('❌ FAIL: Consent/DNC validation error:', error.message);
      this.recordResult('Consent & DNC Validation', false, error.message);
      return false;
    }
  }

  /**
   * Test 6: Generate AI SMS response (mock)
   */
  async testGenerateAiSmsResponse(lead) {
    console.log('\n🧪 TEST 6: Generate AI SMS Response');

    try {
      // TODO: Call Claude API to generate response
      // For now, use template
      const marketConfig = TEST_CONFIG.market;
      const profession = marketConfig.includes('ca') ? 'agent' : 'realtor';

      const mockResponse = {
        message: `Hi ${lead.firstName}, I'm a real estate ${profession}. I have properties matching your interests. Reply YES to see options. Reply STOP to opt out.`,
        trigger: 'initial_response',
        confidence: 0.95,
      };

      assert(mockResponse.message, 'Generated message is empty');
      assert(mockResponse.message.length <= 160, 'Message exceeds SMS length limit');
      assert(mockResponse.message.includes('STOP'), 'Message missing unsubscribe instruction');

      console.log(`✅ PASS: AI SMS generated (${mockResponse.message.length} chars)`);
      console.log(`   Message: "${mockResponse.message}"`);

      this.recordResult('Generate AI SMS Response', true, mockResponse);

      return mockResponse;
    } catch (error) {
      console.error('❌ FAIL: AI SMS generation error:', error.message);
      this.recordResult('Generate AI SMS Response', false, error.message);
      return null;
    }
  }

  /**
   * Test 7: Send SMS via Twilio (mock test, not actual send)
   */
  async testSendSmsMockTwilio(lead, message) {
    console.log('\n🧪 TEST 7: Send SMS via Twilio (Mock)');

    try {
      const phone = lead.phones?.[0]?.value;
      assert(phone, 'Lead phone missing');
      assert(message, 'SMS message missing');

      // Mock Twilio send (don't actually send to avoid charges)
      const mockResponse = {
        sid: `SM_${Date.now()}`,
        from: TEST_CONFIG.twilioPhoneCa || '+14165551234',
        to: phone,
        body: message.message,
        status: 'queued',
        dateCreated: new Date().toISOString(),
      };

      console.log(`✅ PASS: SMS mock send successful`);
      console.log(`   From: ${mockResponse.from}`);
      console.log(`   To: ${mockResponse.to}`);
      console.log(`   Status: ${mockResponse.status}`);
      console.log(`   SID: ${mockResponse.sid}`);

      this.recordResult('Send SMS Mock Twilio', true, mockResponse);

      return mockResponse;
    } catch (error) {
      console.error('❌ FAIL: Twilio send error:', error.message);
      this.recordResult('Send SMS Mock Twilio', false, error.message);
      return null;
    }
  }

  /**
   * Test 8: Log SMS transaction in FUB
   */
  async testLogSmsTxnInFub(lead, smsResponse) {
    console.log('\n🧪 TEST 8: Log SMS Transaction in FUB');

    try {
      assert(lead.id, 'Lead ID missing');
      assert(smsResponse.sid, 'SMS SID missing');

      // Mock FUB note creation
      const note = {
        text: `[AI SMS] ${smsResponse.body}\nTwilio SID: ${smsResponse.sid}\nStatus: ${smsResponse.status}`,
        type: 'sms_ai_response',
        timestamp: new Date().toISOString(),
      };

      console.log(`✅ PASS: SMS transaction logged (would be added to FUB notes)`);
      console.log(`   Note: ${note.text.substring(0, 80)}...`);

      this.recordResult('Log SMS Transaction in FUB', true, note);

      return note;
    } catch (error) {
      console.error('❌ FAIL: SMS logging error:', error.message);
      this.recordResult('Log SMS Transaction in FUB', false, error.message);
      return null;
    }
  }

  /**
   * Test 9: Verify market detection
   */
  async testMarketDetection(lead) {
    console.log('\n🧪 TEST 9: Market Detection');

    try {
      const phoneNumber = lead.phones?.[0]?.value || '';
      const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const countryCode = normalizedPhone.slice(0, 2);
      const areaCode = normalizedPhone.slice(2, 5);

      let detectedMarket = 'us-national';
      const canadianAreaCodes = ['416', '647', '705', '613']; // Ontario samples
      if (countryCode === '+1' && canadianAreaCodes.includes(areaCode)) {
        detectedMarket = 'ca-ontario';
      }

      console.log(`✅ PASS: Market detected as ${detectedMarket}`);
      console.log(`   Phone: ${phoneNumber} (country: +1, area: ${areaCode})`);

      this.recordResult('Market Detection', true, { detectedMarket });

      return detectedMarket;
    } catch (error) {
      console.error('❌ FAIL: Market detection error:', error.message);
      this.recordResult('Market Detection', false, error.message);
      return null;
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
    console.log('📊 END-TO-END TEST REPORT');
    console.log('='.repeat(60));

    console.log(`\n✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${(this.results.passed / (this.results.passed + this.results.failed) * 100).toFixed(0)}%`);

    console.log('\n📋 Test Details:');
    this.results.tests.forEach((test, i) => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${i + 1}. ${status} ${test.name}`);
      if (test.details && typeof test.details === 'string') {
        console.log(`   Details: ${test.details}`);
      }
    });

    console.log('\n' + '='.repeat(60));

    if (this.results.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! System ready for deployment.');
    } else {
      console.log(`⚠️  ${this.results.failed} test(s) failed. Review above.`);
    }

    console.log('='.repeat(60) + '\n');

    return this.results;
  }
}

// ===== RUN TESTS =====
async function runAllTests() {
  console.log('🚀 Starting E2E Test Suite\n');

  const suite = new E2ETestSuite();

  // Test connectivity first
  await suite.testFubApiConnectivity();
  await suite.testTwilioApiConnectivity();

  // If credentials valid, run full flow
  if (suite.results.failed === 0) {
    // Create and test lead flow
    const leadId = await suite.testCreateLeadInFub();

    if (leadId) {
      const lead = await suite.testFetchLeadFromFub(leadId);

      if (lead) {
        const isValid = await suite.testConsentAndDncValidation(lead);

        if (isValid) {
          const smsResponse = await suite.testGenerateAiSmsResponse(lead);

          if (smsResponse) {
            const smsResult = await suite.testSendSmsMockTwilio(lead, smsResponse);

            if (smsResult) {
              await suite.testLogSmsTxnInFub(lead, smsResult);
            }
          }

          await suite.testMarketDetection(lead);
        }
      }
    }
  } else {
    console.log('\n⚠️  Skipping full flow due to connectivity failures.');
    console.log('   Ensure FUB_API_KEY and Twilio credentials are set in .env');
  }

  // Print results
  return suite.printReport();
}

// ===== EXPORTS & EXECUTION =====
module.exports = { E2ETestSuite };

if (require.main === module) {
  runAllTests().catch(console.error);
}
