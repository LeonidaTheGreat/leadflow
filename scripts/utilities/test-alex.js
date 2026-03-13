const axios = require('axios');

const TEST_PHONE = '+14165559333';
const AGENT_URL = 'https://real-estate-ai-rouge.vercel.app/webhook/message';

async function test() {
  console.log('🧪 Testing with native FUB fields (Price, Background, Tags)...\n');
  
  const message = "Hi, I'm Alex Johnson. Looking for a 3 bedroom 2 bath condo in Miami. Budget is $550k, I'm pre-approved, need to move in 1 month. Call me at 305-555-7777";
  
  console.log('User:', message);
  console.log('');
  
  try {
    const response = await axios.post(AGENT_URL, {
      From: TEST_PHONE,
      Body: message
    }, { timeout: 15000 });
    
    const match = response.data.match(/<Message>([^<]+)<\/Message>/);
    const aiReply = match ? match[1].replace(/&apos;/g, "'") : 'No response';
    
    console.log('AI:', aiReply.substring(0, 150) + '...');
    
    if (aiReply.includes('passed your info')) {
      console.log('\n✅ LEAD SENT TO FUB!');
      console.log('\nCheck FUB Dashboard → People for:');
      console.log('  Name: Alex Johnson');
      console.log('  Price: $550,000');
      console.log('  Background: Full AI Lead Details');
      console.log('  Tags: ai-qualified, HOT');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
