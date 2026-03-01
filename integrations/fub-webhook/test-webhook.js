// Test script for FUB webhook
const axios = require('axios');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/webhook/fub-lead';

const testLead = {
  name: "Test Lead",
  phone: "+15555555555",
  email: "test@example.com",
  source: "AI Test",
  property_interest: "2BR condo downtown",
  urgency: "hot",
  ai_summary: "First-time buyer, pre-approved, looking to move in 60 days",
  ai_qualified: true
};

async function testWebhook() {
  console.log('Testing FUB webhook...');
  console.log('URL:', WEBHOOK_URL);
  console.log('Payload:', JSON.stringify(testLead, null, 2));
  console.log('---');

  try {
    const response = await axios.post(WEBHOOK_URL, testLead, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log('✅ SUCCESS');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ FAILED');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

testWebhook();
