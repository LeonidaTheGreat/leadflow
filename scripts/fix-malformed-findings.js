require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('../lib/db-client');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('🔍 Checking for malformed findings...\n');
  
  const { data: reviews, error } = await sb.from('product_reviews').select('id, findings, status');
  
  if (error) {
    console.error('Error fetching reviews:', error);
    return;
  }

  const issues = [];
  reviews.forEach((review) => {
    if (!Array.isArray(review.findings)) {
      issues.push(review);
    }
  });

  if (issues.length === 0) {
    console.log('✅ All findings are properly formatted as arrays');
    return;
  }

  console.log(`❌ Found ${issues.length} reviews with malformed findings:\n`);

  // Fix each issue
  for (const review of issues) {
    console.log(`  Fixing review ${review.id}...`);
    
    let fixedFindings;
    if (typeof review.findings === 'string') {
      try {
        fixedFindings = JSON.parse(review.findings);
        if (!Array.isArray(fixedFindings)) {
          fixedFindings = [fixedFindings];
        }
      } catch (e) {
        console.log(`    ⚠️ Could not parse: ${e.message}. Setting to empty array.`);
        fixedFindings = [];
      }
    } else {
      fixedFindings = Array.isArray(review.findings) ? review.findings : [];
    }

    const { error: updateError } = await sb
      .from('product_reviews')
      .update({ findings: fixedFindings })
      .eq('id', review.id);

    if (updateError) {
      console.log(`    ❌ Update failed: ${updateError.message}`);
    } else {
      console.log(`    ✅ Fixed! Findings is now: ${JSON.stringify(fixedFindings).substring(0, 80)}...`);
    }
  }

  console.log('\n✅ All malformed findings have been fixed!');
}

run().catch(console.error);
