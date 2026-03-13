const axios = require('axios');

const TEST_PHONE = '+14165559222';
const AGENT_URL = 'https://real-estate-ai-rouge.vercel.app/webhook/message';

async function test() {
  console.log('🧪 Testing with native FUB fields...\n');
  
  const message = "Hello! I'm Robert Martinez. I need a 4 bedroom 3 bathroom house in Denver. My budget is $800k, I'm pre-approved, and I want to close in 2 months. My number is 303-555-4444";
  
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
      console.log('  Name: Robert Martinez');
      console.log('  Price: $800,000');
      console.log('  Custom Fields: AI Qualified, Property Interest, Urgency Level');
      console.log('  Tags: ai-qualified, HOT');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
