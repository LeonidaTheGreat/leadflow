/**
 * Onboarding API Integration Tests
 * Tests all onboarding API endpoints
 */

const API_BASE = 'http://localhost:3000/api/onboarding';

// Test configuration
const TEST_CONFIG = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'Agent',
  phoneNumber: '5551234567',
  state: 'California',
  timezone: 'America/Los_Angeles',
  calcomLink: 'https://cal.com/testagent',
  smsPhoneNumber: '5559876543',
};

// Test utilities
async function makeRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const data = await response.json().catch(() => null);
  return { response, data };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ ${message}`);
  }
  console.log(`✅ ${message}`);
}

// Tests
async function testEmailCheck() {
  console.log('\n📧 Testing Email Check API...');
  
  // Test available email
  const { data: availableData } = await makeRequest(`${API_BASE}/check-email`, {
    method: 'POST',
    body: JSON.stringify({ email: TEST_CONFIG.email }),
  });
  
  assert(availableData.success === true, 'Email check API returns success');
  assert(availableData.available === true, 'New email is available');
  assert(availableData.valid === true, 'Email format is valid');
  
  // Test invalid email
  const { data: invalidData } = await makeRequest(`${API_BASE}/check-email`, {
    method: 'POST',
    body: JSON.stringify({ email: 'invalid-email' }),
  });
  
  assert(invalidData.valid === false, 'Invalid email format is rejected');
  
  console.log('Email check tests passed!');
}

async function testValidation() {
  console.log('\n✓ Testing Validation API...');
  
  // Test step validation
  const { data: stepData } = await makeRequest(`${API_BASE}/validate`, {
    method: 'POST',
    body: JSON.stringify({
      step: 'welcome',
      data: {
        email: TEST_CONFIG.email,
        password: TEST_CONFIG.password,
        confirmPassword: TEST_CONFIG.password,
      },
    }),
  });
  
  assert(stepData.success === true, 'Welcome step validation passes');
  assert(stepData.valid === true, 'Welcome step data is valid');
  
  // Test invalid data
  const { data: invalidData } = await makeRequest(`${API_BASE}/validate`, {
    method: 'POST',
    body: JSON.stringify({
      step: 'welcome',
      data: {
        email: 'invalid',
        password: 'short',
      },
    }),
  });
  
  assert(invalidData.valid === false, 'Invalid data fails validation');
  assert(Array.isArray(invalidData.errors), 'Validation errors are returned');
  
  // Test full form validation
  const { data: fullData } = await makeRequest(`${API_BASE}/validate`, {
    method: 'POST',
    body: JSON.stringify({
      validateAll: true,
      data: {
        email: TEST_CONFIG.email,
        password: TEST_CONFIG.password,
        firstName: TEST_CONFIG.firstName,
        lastName: TEST_CONFIG.lastName,
        phoneNumber: TEST_CONFIG.phoneNumber,
        state: TEST_CONFIG.state,
      },
    }),
  });
  
  assert(fullData.valid === true, 'Full form validation passes');
  
  console.log('Validation tests passed!');
}

async function testDraftSave() {
  console.log('\n💾 Testing Draft Save API...');
  
  const draftData = {
    email: TEST_CONFIG.email,
    formData: {
      email: TEST_CONFIG.email,
      password: TEST_CONFIG.password,
      firstName: TEST_CONFIG.firstName,
    },
    currentStep: 'agent-info' as const,
    completedSteps: ['welcome'] as const,
  };
  
  // Create draft
  const { data: saveData } = await makeRequest(`${API_BASE}/draft`, {
    method: 'POST',
    body: JSON.stringify(draftData),
  });
  
  assert(saveData.success === true, 'Draft is saved successfully');
  assert(saveData.data.draftId, 'Draft ID is returned');
  assert(saveData.data.expiresAt, 'Draft expiry is set');
  
  const draftId = saveData.data.draftId;
  
  // Retrieve draft
  const { data: getData } = await makeRequest(
    `${API_BASE}/draft?email=${encodeURIComponent(TEST_CONFIG.email)}`
  );
  
  assert(getData.success === true, 'Draft is retrieved successfully');
  assert(getData.data.email === TEST_CONFIG.email, 'Draft email matches');
  assert(getData.data.currentStep === 'agent-info', 'Draft step is preserved');
  
  // Update draft
  const { data: updateData } = await makeRequest(`${API_BASE}/draft`, {
    method: 'POST',
    body: JSON.stringify({
      ...draftData,
      draftId,
      currentStep: 'calendar',
      completedSteps: ['welcome', 'agent-info'],
    }),
  });
  
  assert(updateData.success === true, 'Draft is updated successfully');
  assert(updateData.data.draftId === draftId, 'Draft ID is preserved');
  
  // Delete draft
  const { response: deleteResponse } = await makeRequest(
    `${API_BASE}/draft?draftId=${draftId}`,
    { method: 'DELETE' }
  );
  
  assert(deleteResponse.ok === true, 'Draft is deleted successfully');
  
  console.log('Draft save tests passed!');
}

async function testSubmit() {
  console.log('\n🚀 Testing Submit API...');
  
  // First save a draft
  const { data: draftData } = await makeRequest(`${API_BASE}/draft`, {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_CONFIG.email,
      formData: {
        email: TEST_CONFIG.email,
        password: TEST_CONFIG.password,
        firstName: TEST_CONFIG.firstName,
        lastName: TEST_CONFIG.lastName,
        phoneNumber: TEST_CONFIG.phoneNumber,
        state: TEST_CONFIG.state,
        timezone: TEST_CONFIG.timezone,
        calcomLink: TEST_CONFIG.calcomLink,
        smsPhoneNumber: TEST_CONFIG.smsPhoneNumber,
      },
      currentStep: 'confirmation',
      completedSteps: ['welcome', 'agent-info', 'calendar', 'sms'],
    }),
  });
  
  // Submit onboarding
  const { data: submitData } = await makeRequest(`${API_BASE}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        email: TEST_CONFIG.email,
        password: TEST_CONFIG.password,
        firstName: TEST_CONFIG.firstName,
        lastName: TEST_CONFIG.lastName,
        phoneNumber: TEST_CONFIG.phoneNumber,
        state: TEST_CONFIG.state,
        timezone: TEST_CONFIG.timezone,
        calcomLink: TEST_CONFIG.calcomLink,
        smsPhoneNumber: TEST_CONFIG.smsPhoneNumber,
        currentStep: 'confirmation',
        completedSteps: ['welcome', 'agent-info', 'calendar', 'sms'],
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      },
      draftId: draftData.data.draftId,
      tracking: {
        completionTimeMs: 45000,
        referrer: 'https://google.com',
      },
    }),
  });
  
  assert(submitData.success === true, 'Onboarding is submitted successfully');
  assert(submitData.data.agentId, 'Agent ID is returned');
  assert(submitData.data.email === TEST_CONFIG.email.toLowerCase(), 'Agent email matches');
  assert(submitData.data.redirectUrl === '/dashboard', 'Redirect URL is correct');
  
  // Test duplicate submission
  const { data: duplicateData } = await makeRequest(`${API_BASE}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        email: TEST_CONFIG.email,
        password: TEST_CONFIG.password,
        firstName: TEST_CONFIG.firstName,
        lastName: TEST_CONFIG.lastName,
        phoneNumber: TEST_CONFIG.phoneNumber,
        state: TEST_CONFIG.state,
        currentStep: 'confirmation',
        completedSteps: ['welcome', 'agent-info', 'calendar', 'sms'],
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      },
    }),
  });
  
  assert(duplicateData.success === false, 'Duplicate submission is rejected');
  
  console.log('Submit tests passed!');
}

async function testErrorHandling() {
  console.log('\n⚠️ Testing Error Handling...');
  
  // Test 404
  const { response: notFoundResponse } = await makeRequest(`${API_BASE}/nonexistent`);
  assert(notFoundResponse.status === 404, 'Non-existent route returns 404');
  
  // Test validation error
  const { response: validationResponse, data: validationData } = await makeRequest(`${API_BASE}/validate`, {
    method: 'POST',
    body: JSON.stringify({
      step: 'invalid-step',
      data: {},
    }),
  });
  
  assert(validationData.valid === false, 'Invalid step returns validation error');
  
  // Test malformed JSON
  const { response: malformedResponse } = await makeRequest(`${API_BASE}/validate`, {
    method: 'POST',
    body: 'not-json',
  });
  
  assert(malformedResponse.status === 400 || malformedResponse.status === 500, 'Malformed JSON is rejected');
  
  console.log('Error handling tests passed!');
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting Onboarding API Integration Tests...');
  console.log('================================================');
  
  try {
    await testEmailCheck();
    await testValidation();
    await testDraftSave();
    await testSubmit();
    await testErrorHandling();
    
    console.log('\n✨ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runTests();
}

export { runTests };
