#!/usr/bin/env node
/**
 * Verify Resend API Key is Live
 * 
 * This script tests the production RESEND_API_KEY by sending a test email
 * from hello@leadflow.ai to a real inbox.
 * 
 * Usage: node scripts/verify-resend-api-key.js [test-email-address]
 */

const https = require('https');

// Get the Resend API key from environment
const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const FROM_EMAIL = (process.env.FROM_EMAIL || 'hello@leadflow.ai').trim();
const TO_EMAIL = process.argv[2] || 'stojan@leadflow.ai';

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is not set in environment');
  process.exit(1);
}

console.log('🔑 RESEND_API_KEY is present');
console.log(`   Key prefix: ${RESEND_API_KEY.substring(0, 10)}...`);
console.log(`   Key length: ${RESEND_API_KEY.length} characters`);
console.log(`   From: ${FROM_EMAIL}`);
console.log(`   To: ${TO_EMAIL}`);
console.log('');

// Test email payload
const emailData = {
  from: `LeadFlow AI <${FROM_EMAIL}>`,
  to: TO_EMAIL,
  subject: 'Resend API Key Verification Test',
  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Resend API Key Test</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <h1 style="color: #10b981; margin-top: 0;">✅ Resend API Key is Live!</h1>
    <p style="font-size: 16px; color: #374151;">
      This is a test email to verify that the RESEND_API_KEY in Vercel production is working correctly.
    </p>
  </div>
  
  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #111;">Test Details:</h3>
    <ul style="color: #4b5563;">
      <li><strong>Sent at:</strong> ${new Date().toISOString()}</li>
      <li><strong>From:</strong> ${FROM_EMAIL}</li>
      <li><strong>To:</strong> ${TO_EMAIL}</li>
      <li><strong>Environment:</strong> Production</li>
    </ul>
  </div>

  <p style="font-size: 14px; color: #6b7280;">
    If you received this email, the Resend API key is live and emails can be sent from hello@leadflow.ai.
  </p>
</body>
</html>
  `
};

// Make the API request to Resend
const postData = JSON.stringify(emailData);

const options = {
  hostname: 'api.resend.com',
  port: 443,
  path: '/emails',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('📤 Sending test email via Resend API...');
console.log('');

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`📥 Response Status: ${res.statusCode}`);
    
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('✅ SUCCESS! Email sent successfully');
        console.log(`   Email ID: ${response.id}`);
        console.log(`   From: ${response.from}`);
        console.log(`   To: ${response.to?.join(', ')}`);
        console.log('');
        console.log('🎉 RESEND_API_KEY is LIVE and working in production!');
        process.exit(0);
      } else {
        console.error('❌ FAILED! Email could not be sent');
        console.error(`   Error: ${response.message || response.error || 'Unknown error'}`);
        if (response.name) {
          console.error(`   Error Type: ${response.name}`);
        }
        process.exit(1);
      }
    } catch (err) {
      console.error('❌ Failed to parse response:', err.message);
      console.error('   Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();
