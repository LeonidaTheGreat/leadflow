const axios = require('axios');

const TEST_PHONE = '+14165559000';
const AGENT_URL = 'https://real-estate-ai-rouge.vercel.app/webhook/message';

async function test() {
  console.log('Testing with fresh phone number...\n');
  
  const message = "Hi, I'm David Smith. I need a 2 bedroom condo in Boston. Budget is $600k and I'm pre-approved. Moving in 3 weeks. Call me at 617-555-1111";
  
  console.log('Sending:', message);
  
  try {
    const response = await axios.post(AGENT_URL, {
      From: TEST_PHONE,
      Body: message
    }, { timeout: 15000 });
    
    const match = response.data.match(/<Message>([^<]+)<\/Message>/);
    const aiReply = match ? match[1].replace(/&apos;/g, "'") : 'No response';
    
    console.log('\nAI Response:', aiReply.substring(0, 200) + '...');
    
    if (aiReply.includes('passed your info')) {
      console.log('\n✅ Lead sent to FUB!');
      console.log('Check Vercel logs for webhook data.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
