const axios = require('axios');

const TEST_PHONE = '+14165559111';
const AGENT_URL = 'https://real-estate-ai-rouge.vercel.app/webhook/message';

async function test() {
  console.log('🧪 Testing with fresh phone number...\n');
  
  const message = "Hi! I'm Emma Thompson. Looking for a 3 bedroom 2 bath house in Seattle. Budget is $650k, I'm pre-approved, and need to move in 6 weeks. My number is 206-555-3333";
  
  console.log('User:', message);
  console.log('');
  
  try {
    const response = await axios.post(AGENT_URL, {
      From: TEST_PHONE,
      Body: message
    }, { timeout: 15000 });
    
    const match = response.data.match(/<Message>([^<]+)<\/Message>/);
    const aiReply = match ? match[1].replace(/&apos;/g, "'") : 'No response';
    
    console.log('AI:', aiReply);
    
    if (aiReply.includes('passed your info')) {
      console.log('\n✅ LEAD SENT TO FUB!');
      console.log('\nCheck FUB Dashboard → People for:');
      console.log('  Name: Emma Thompson');
      console.log('  Phone: +1 206-555-3333');
      console.log('  Tags: ai-qualified, HOT');
      console.log('  Notes: Should have all AI Lead Details');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
