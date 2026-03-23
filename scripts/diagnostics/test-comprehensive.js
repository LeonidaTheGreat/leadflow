const axios = require('axios');

const AGENT_URL = 'https://real-estate-ai-rouge.vercel.app/webhook/message';
const TEST_PHONE = '+14165558888';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testComprehensiveConversation() {
  console.log('🧪 Comprehensive Multi-Message Test (All Fields)\n');
  console.log('=' .repeat(70));
  
  const messages = [
    { body: "Hello! I'm interested in buying a home", desc: "Initial inquiry" },
    { body: "My name is Michael Chen", desc: "Name" },
    { body: "I'm looking for a 3 bedroom 2 bathroom house in Austin, Texas", desc: "Property specs + location" },
    { body: "My budget is around $500k", desc: "Budget" },
    { body: "Yes, I'm already pre-approved for a mortgage", desc: "Pre-approval status" },
    { body: "I want to move within 2 months", desc: "Timeline" },
    { body: "My phone number is 512-555-9999", desc: "Phone + Complete" }
  ];
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    console.log(`\n📨 Message ${i + 1}/${messages.length}: ${msg.desc}`);
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
      
      console.log(`   AI: "${aiReply.substring(0, 80)}${aiReply.length > 80 ? '...' : ''}"`);
      
      if (aiReply.includes('passed your info') || aiReply.includes('agent will contact')) {
        console.log('   ✅ LEAD SENT TO FUB WITH ALL DETAILS!');
      }
      
    } catch (error) {
      console.error('   ❌ Error:', error.message);
    }
    
    if (i < messages.length - 1) {
      console.log('   ⏱️  Waiting 2 seconds...');
      await sleep(2000);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('Test complete! Check FUB Dashboard → People for:');
  console.log('  • Name: Michael Chen');
  console.log('  • Background: All collected details (beds, baths, budget, pre-approved, timeline)');
  console.log('  • Tags: ai-qualified, hot (because pre-approved + short timeline)');
}

testComprehensiveConversation().catch(console.error);
