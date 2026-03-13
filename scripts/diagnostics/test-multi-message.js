const axios = require('axios');

const AGENT_URL = 'https://real-estate-kuvdxo94z-stojans-projects-7db98187.vercel.app/webhook/message';
const TEST_PHONE = '+14165557777';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testMultiMessageConversation() {
  console.log('🧪 Multi-Message Conversation Test\n');
  console.log('=' .repeat(60));
  
  const messages = [
    { body: "Hi there!", desc: "Greeting" },
    { body: "I'm Sarah Johnson", desc: "Name" },
    { body: "I'm looking for a house in Toronto", desc: "Interest" },
    { body: "My phone is 416-555-8888", desc: "Phone + Complete" }
  ];
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    console.log(`\n📨 Message ${i + 1}/4: ${msg.desc}`);
    console.log(`   User: "${msg.body}"`);
    
    try {
      const response = await axios.post(AGENT_URL, {
        From: TEST_PHONE,
        Body: msg.body
      }, { timeout: 15000 });
      
      // Parse TwiML
      const twiml = response.data;
      const match = twiml.match(/<Message>([^<]+)<\/Message>/);
      const aiReply = match ? match[1].replace(/&apos;/g, "'") : 'No response';
      
      console.log(`   AI: "${aiReply.substring(0, 100)}${aiReply.length > 100 ? '...' : ''}"`);
      
      if (aiReply.includes('passed your info') || aiReply.includes('agent will contact')) {
        console.log('   ✅ LEAD SENT TO FUB!');
      }
      
    } catch (error) {
      console.error('   ❌ Error:', error.message);
    }
    
    // Wait between messages
    if (i < messages.length - 1) {
      console.log('   ⏱️  Waiting 2 seconds...');
      await sleep(2000);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Test complete! Check FUB Dashboard → People');
}

testMultiMessageConversation().catch(console.error);
