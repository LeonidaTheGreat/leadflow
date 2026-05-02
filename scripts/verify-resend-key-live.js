/**
 * Test: Verify RESEND_API_KEY is live in Vercel production
 * Task: 5af04ef5-7b00-46d0-8d41-4ecb2f44ae1b
 * 
 * Verifies the Resend API key is valid and active by sending a test email.
 * A "restricted_api_key" response means the key is valid but sending-only,
 * which is the expected and secure configuration.
 */

const https = require('https');

// Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeResendRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function verifyResendKey() {
  log('\n📧 RESEND_API_KEY Production Verification\n', 'blue');
  log('=' .repeat(60), 'blue');

  // Check if API key is configured
  if (!RESEND_API_KEY) {
    log('\n❌ FAIL: RESEND_API_KEY is not set in environment', 'red');
    log('   Set RESEND_API_KEY environment variable and try again.', 'red');
    process.exit(1);
  }

  // Validate key format (Resend keys start with 're_')
  if (!RESEND_API_KEY.startsWith('re_')) {
    log('\n❌ FAIL: RESEND_API_KEY has invalid format', 'red');
    log('   Expected format: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'red');
    log(`   Actual: ${RESEND_API_KEY.substring(0, 10)}...`, 'red');
    process.exit(1);
  }

  log(`✓ API Key format valid: ${RESEND_API_KEY.substring(0, 20)}...`, 'green');

  // Test 1: Try to fetch API keys (will fail for sending-only keys, which is expected)
  log('\n🔑 Test 1: Checking API key permissions...', 'yellow');
  
  let isSendingOnlyKey = false;
  try {
    const result = await makeResendRequest('/api-keys');
    
    if (result.status === 200) {
      log('✅ PASS: API key has full account access', 'green');
    } else if (result.status === 401 && result.data.name === 'restricted_api_key') {
      log('✅ PASS: API key is valid (sending-only, secure configuration)', 'green');
      isSendingOnlyKey = true;
    } else if (result.status === 401) {
      log('❌ FAIL: API key is invalid or expired', 'red');
      log(`   Response: ${JSON.stringify(result.data)}`, 'red');
      process.exit(1);
    } else {
      log(`⚠️  Unexpected status: ${result.status}`, 'yellow');
    }
  } catch (error) {
    log('⚠️  Error checking API key: ' + error.message, 'yellow');
  }

  // Test 2: Send test email to verify the key can actually send
  log('\n📤 Test 2: Sending test email to verify delivery...', 'yellow');
  
  const testEmail = {
    from: 'onboarding@resend.dev',
    to: 'madzunkov@gmail.com', // Resend test keys can only send to account owner
    subject: 'LeadFlow AI - RESEND_API_KEY Verification Test',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; margin: 0; padding: 40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #0f172a; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; max-width: 600px; width: 100%;">
                <tr>
                  <td style="background: linear-gradient(135deg, #064e3b, #1e293b); padding: 32px; text-align: center; border-bottom: 1px solid #334155;">
                    <span style="color: #10b981; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">▶ LeadFlow AI</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 32px;">
                    <h2 style="color: #f1f5f9; font-size: 22px; margin: 0 0 16px;">✅ RESEND_API_KEY Verification Test</h2>
                    <p style="color: #94a3b8; font-size: 16px; margin: 0 0 24px;">
                      This is a test email to verify that the Resend API key is working correctly in production.
                    </p>
                    <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 20px; margin: 24px 0;">
                      <p style="color: #10b981; font-size: 14px; margin: 0 0 8px;"><strong>Test Results:</strong></p>
                      <ul style="color: #94a3b8; font-size: 14px; margin: 0; padding-left: 20px;">
                        <li>API Key: Valid and active</li>
                        <li>From address: onboarding@resend.dev</li>
                        <li>Sent at: ${new Date().toISOString()}</li>
                        <li>Task ID: 5af04ef5-7b00-46d0-8d41-4ecb2f44ae1b</li>
                      </ul>
                    </div>
                    <p style="color: #64748b; font-size: 14px; margin: 24px 0 0;">
                      If you're seeing this email, the RESEND_API_KEY is live and working! 🎉
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #334155; padding: 24px 32px; text-align: center;">
                    <p style="color: #475569; font-size: 12px; margin: 0;">
                      LeadFlow AI - Automated Test
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    const result = await makeResendRequest('/emails', 'POST', testEmail);
    
    if (result.status === 200 || result.status === 201) {
      log('✅ PASS: Test email sent successfully!', 'green');
      log(`   Email ID: ${result.data.id}`, 'cyan');
      log(`   To: madzunkov@gmail.com`, 'cyan');
      
      // Final summary
      log('\n' + '='.repeat(60), 'blue');
      log('📊 VERIFICATION SUMMARY', 'blue');
      log('='.repeat(60), 'blue');
      log('✅ RESEND_API_KEY is LIVE and valid', 'green');
      log(`✅ Key type: ${isSendingOnlyKey ? 'Sending-only (secure)' : 'Full access'}`, 'green');
      log('✅ Email delivery confirmed - email sent to inbox', 'green');
      log('\n⚠️  NOTE: Domain verification required for full functionality', 'yellow');
      log('   Current: Can send to account owner (madzunkov@gmail.com)', 'cyan');
      log('   To send to any recipient: Verify landyourleads.com at resend.com/domains', 'cyan');
      log('\n✅ Pilots CAN be enrolled - email delivery is functional', 'green');
      log('='.repeat(60), 'blue');
      
      process.exit(0);
    } else if (result.status === 403) {
      log('⚠️  Email blocked: Domain not verified', 'yellow');
      log(`   Message: ${result.data.message}`, 'yellow');
      
      // Final summary
      log('\n' + '='.repeat(60), 'blue');
      log('📊 VERIFICATION SUMMARY', 'blue');
      log('='.repeat(60), 'blue');
      log('✅ RESEND_API_KEY is LIVE and valid', 'green');
      log(`✅ Key type: ${isSendingOnlyKey ? 'Sending-only (secure)' : 'Full access'}`, 'green');
      log('✅ API authentication successful', 'green');
      log('\n⚠️  Email delivery blocked: Domain verification required', 'yellow');
      log('   To send emails to any recipient:', 'cyan');
      log('   1. Verify landyourleads.com domain at https://resend.com/domains', 'cyan');
      log('   2. Update FROM_EMAIL to hello@landyourleads.com in Vercel', 'cyan');
      log('\n⚠️  Pilots can be enrolled BUT emails will fail until domain is verified', 'yellow');
      log('='.repeat(60), 'blue');
      
      process.exit(1);
    } else if (result.status === 401) {
      log('❌ FAIL: API key authentication failed', 'red');
      log(`   Response: ${JSON.stringify(result.data)}`, 'red');
      process.exit(1);
    } else {
      log(`⚠️  Unexpected status: ${result.status}`, 'yellow');
      log(`   Response: ${JSON.stringify(result.data)}`, 'yellow');
      process.exit(1);
    }
  } catch (error) {
    log('❌ FAIL: Error sending test email', 'red');
    log(`   Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run verification
verifyResendKey();
