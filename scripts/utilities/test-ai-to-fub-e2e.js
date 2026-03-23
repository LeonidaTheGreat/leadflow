/**
 * E2E Test: AI Agent → FUB Integration
 * Tests: Text AI → Extract Info → Create FUB Lead
 */

require('dotenv').config();
const axios = require('axios');

const CONFIG = {
  agentUrl: 'https://real-estate-yx3k1003b-stojans-projects-7db98187.vercel.app/webhook/message',
  fubApiBase: process.env.FUB_API_BASE_URL || 'https://api.followupboss.com/v1',
  fubApiKey: process.env.FUB_API_KEY,
  testPhone: '+14165559999'
};

async function testE2E() {
  console.log('🚀 AI Agent → FUB E2E Test\n');
  console.log('=' .repeat(60));
  
  const results = { passed: 0, failed: 0, tests: [] };
  
  // Test 1: AI Agent Health
  console.log('\n🧪 TEST 1: AI Agent Health Check');
  try {
    const health = await axios.get(CONFIG.agentUrl.replace('/webhook/message', '/health'), { timeout: 5000 });
    console.log('✅ PASS: AI Agent is healthy');
    console.log(`   FUB Webhook: ${health.data.fub}`);
    results.passed++;
  } catch (error) {
    console.log('❌ FAIL:', error.message);
    results.failed++;
  }
  
  // Test 2: Send message to AI (conversation flow)
  console.log('\n🧪 TEST 2: AI Conversation & Lead Extraction');
  const sessionId = 'e2e-test-' + Date.now();
  let leadQualified = false;
  
  const conversation = [
    { body: "Hi, I'm looking for a house in Toronto", desc: "Initial inquiry" },
    { body: "My name is Sarah Johnson", desc: "Name provided" },
    { body: "I want a 3 bedroom house near downtown", desc: "Property interest" },
    { body: "My number is 416-555-8888", desc: "Phone provided" }
  ];
  
  for (const msg of conversation) {
    try {
      console.log(`\n   👤 User: "${msg.body}" (${msg.desc})`);
      
      const response = await axios.post(CONFIG.agentUrl, {
        From: CONFIG.testPhone,
        Body: msg.body
      }, { timeout: 15000 });
      
      // Parse TwiML response
      const twiml = response.data;
      const messageMatch = twiml.match(/<Message>([^<]+)<\/Message>/);
      const aiResponse = messageMatch ? messageMatch[1] : 'No response parsed';
      
      console.log(`   🤖 AI: "${aiResponse.substring(0, 80)}..."`);
      
      // Check if lead was sent to FUB
      if (twiml.includes('passed your info') || twiml.includes('agent will contact you')) {
        console.log('   ✅ Lead qualified and sent to FUB!');
        leadQualified = true;
      }
      
      await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.error('   ❌ Error:', error.response?.data || error.message);
    }
  }
  
  if (leadQualified) {
    console.log('\n✅ PASS: AI qualified lead and sent to FUB');
    results.passed++;
  } else {
    console.log('\n❌ FAIL: Lead not qualified/sent');
    results.failed++;
  }
  
  // Test 3: Verify lead created in FUB
  console.log('\n🧪 TEST 3: Verify Lead Created in FUB');
  await new Promise(r => setTimeout(r, 3000)); // Wait for FUB to process
  
  try {
    const auth = Buffer.from(`${CONFIG.fubApiKey}:`).toString('base64');
    const searchRes = await axios.get(
      `${CONFIG.fubApiBase}/people?phone=${encodeURIComponent(CONFIG.testPhone)}`,
      { headers: { Authorization: `Basic ${auth}` }, timeout: 10000 }
    );
    
    const people = searchRes.data.people;
    if (people && people.length > 0) {
      const person = people[0];
      console.log('✅ PASS: Lead found in FUB!');
      console.log(`   Name: ${person.firstName} ${person.lastName}`);
      console.log(`   ID: ${person.id}`);
      console.log(`   Stage: ${person.stage}`);
      results.passed++;
    } else {
      console.log('❌ FAIL: Lead not found in FUB');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error.response?.data?.message || error.message);
    results.failed++;
  }
  
  // Report
  console.log('\n' + '='.repeat(60));
  console.log('📊 E2E TEST REPORT');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL E2E TESTS PASSED!');
    console.log('   Text your AI agent → Lead appears in FUB ✅');
  }
}

testE2E().catch(console.error);
