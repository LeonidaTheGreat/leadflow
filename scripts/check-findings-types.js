require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: reviews, error } = await sb.from('product_reviews').select('id, findings, status');
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${reviews.length} reviews`);
  
  const issues = [];
  reviews.forEach((review) => {
    if (!Array.isArray(review.findings)) {
      issues.push({ id: review.id, findings: review.findings });
    }
  });
  
  if (issues.length > 0) {
    console.log(`\n❌ Found ${issues.length} reviews with malformed findings:`);
    issues.forEach(i => {
      console.log(`  - ${i.id}: ${typeof i.findings}`);
    });
  } else {
    console.log(`\n✅ All findings are properly formatted as arrays`);
  }
}

run().catch(console.error);
