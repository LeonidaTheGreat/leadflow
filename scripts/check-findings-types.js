require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('../lib/db');
const sb = createClient(process.env.NEXT_PUBLIC_API_URL, process.env.API_SECRET_KEY);

async function run() {
  const { data: reviews, error } = await sb.from('product_reviews').select('id, findings, status');
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${reviews.length} reviews`);
  
  const issues = [];
  reviews.forEach((review, i) => {
    console.log(`\n[${i}] Review ${review.id}:`);
    console.log(`  Status: ${review.status}`);
    console.log(`  findings type: ${typeof review.findings}`);
    console.log(`  findings value:`, JSON.stringify(review.findings).substring(0, 100));
    
    if (!Array.isArray(review.findings)) {
      issues.push({ id: review.id, findings: review.findings });
      console.log(`  ⚠️ NOT AN ARRAY!`);
    }
  });
  
  if (issues.length > 0) {
    console.log(`\n\n❌ Found ${issues.length} reviews with malformed findings:`);
    issues.forEach(i => {
      console.log(`  - ${i.id}: ${typeof i.findings}`);
    });
  } else {
    console.log(`\n✅ All findings are properly formatted as arrays`);
  }
}

run().catch(console.error);
