const axios = require('axios');

// Test with a completely new phone number
const TEST_PHONE = '+14165558900';
const AGENT_URL = 'https://real-estate-ai-rouge.vercel.app/webhook/message';

async function testSingleMessage() {
  console.log('🧪 Single Message Test (All Info at Once)\n');
  
  // Send all info in one message
  const message = "Hi, my name is Jennifer Wilson. I'm looking for a 4 bedroom 3 bathroom house in Miami. My budget is $750k and I'm pre-approved. I want to move in 1 month. My number is 305-555-7777";
  
  console.log('User:', message);
  console.log('');
  
  try {
    const response = await axios.post(AGENT_URL, {
      From: TEST_PHONE,
      Body: message
    }, { timeout: 15000 });
    
    const twiml = response.data;
    const match = twiml.match(/<Message>([^<]+)<\/Message>/);
    const aiReply = match ? match[1].replace(/&apos;/g, "'") : 'No response';
    
    console.log('AI:', aiReply);
    
    if (aiReply.includes('passed your info') || aiReply.includes('agent will contact')) {
      console.log('\n✅ LEAD SENT TO FUB!');
      console.log('\nCheck FUB Dashboard → People for:');
      console.log('  Name: Jennifer Wilson');
      console.log('  Phone: +1 305-555-7777');
      console.log('  Background: Should have all details');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSingleMessage();
