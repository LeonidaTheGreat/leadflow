/**
 * Twilio Real Integration Test Script
 * 
 * This script tests the actual Twilio integration by sending a test SMS.
 * Run with: npx ts-node scripts/test-twilio-real.ts
 * 
 * WARNING: This will send a real SMS and incur charges!
 */

import { sendSms, normalizePhone } from '../lib/twilio'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TestResult {
  success: boolean
  messageSid?: string
  status?: string
  error?: string
  errorCode?: string
  price?: string
  mock?: boolean
}

async function testTwilioIntegration(): Promise<void> {
  console.log('🧪 Twilio Real Integration Test')
  console.log('================================\n')

  // Check environment
  console.log('📋 Environment Check:')
  console.log('  TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing')
  console.log('  TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing')
  console.log('  TWILIO_PHONE_NUMBER_US:', process.env.TWILIO_PHONE_NUMBER_US || '❌ Missing')
  console.log('  TWILIO_PHONE_NUMBER_CA:', process.env.TWILIO_PHONE_NUMBER_CA || '❌ Missing')
  console.log('  TWILIO_MOCK_MODE:', process.env.TWILIO_MOCK_MODE)
  console.log('')

  // Test 1: Send SMS to US number
  console.log('📤 Test 1: Send SMS to US number')
  const usTestPhone = process.env.TEST_PHONE_US || '+15802324685'
  
  try {
    const result1 = await sendSms({
      to: usTestPhone,
      body: 'LeadFlow AI Test: US number delivery test. Reply STOP to opt out.',
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`,
    })

    console.log('  Result:', result1.success ? '✅ Success' : '❌ Failed')
    console.log('  Message SID:', result1.messageSid)
    console.log('  Status:', result1.status)
    console.log('  Mock Mode:', result1.mock ? 'Yes' : 'No')
    if (result1.price) {
      console.log('  Price:', result1.price, result1.priceUnit)
    }
    if (result1.error) {
      console.log('  Error:', result1.error)
      console.log('  Error Code:', result1.errorCode)
    }
    console.log('')

    // Save test result to database
    if (result1.success && result1.messageSid) {
      await logTestResult('us_number_test', result1)
    }
  } catch (error: any) {
    console.error('  ❌ Exception:', error.message)
  }

  // Test 2: Send SMS to CA number
  console.log('📤 Test 2: Send SMS to Canadian number')
  const caTestPhone = process.env.TEST_PHONE_CA || '+12492026716'
  
  try {
    const result2 = await sendSms({
      to: caTestPhone,
      body: 'LeadFlow AI Test: Canadian number delivery test. Reply STOP to opt out.',
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`,
    })

    console.log('  Result:', result2.success ? '✅ Success' : '❌ Failed')
    console.log('  Message SID:', result2.messageSid)
    console.log('  Status:', result2.status)
    console.log('  Mock Mode:', result2.mock ? 'Yes' : 'No')
    if (result2.price) {
      console.log('  Price:', result2.price, result2.priceUnit)
    }
    if (result2.error) {
      console.log('  Error:', result2.error)
      console.log('  Error Code:', result2.errorCode)
    }
    console.log('')

    if (result2.success && result2.messageSid) {
      await logTestResult('ca_number_test', result2)
    }
  } catch (error: any) {
    console.error('  ❌ Exception:', error.message)
  }

  // Test 3: Invalid phone number
  console.log('📤 Test 3: Invalid phone number handling')
  
  try {
    const result3 = await sendSms({
      to: 'invalid-phone-number',
      body: 'This should fail',
    })

    console.log('  Result:', result3.success ? '✅ Success' : '❌ Failed (expected)')
    console.log('  Error Code:', result3.errorCode)
    console.log('  Error:', result3.error)
    console.log('')
  } catch (error: any) {
    console.error('  ❌ Exception:', error.message)
  }

  // Test 4: Long message (multi-segment)
  console.log('📤 Test 4: Long message (multi-segment)')
  const longMessage = 'This is a test of a long message that should be split into multiple SMS segments. '.repeat(5) + 
                      'LeadFlow AI Test: Multi-segment message delivery. Reply STOP to opt out.'
  
  try {
    const result4 = await sendSms({
      to: usTestPhone,
      body: longMessage,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`,
    })

    console.log('  Result:', result4.success ? '✅ Success' : '❌ Failed')
    console.log('  Message SID:', result4.messageSid)
    console.log('  Segments:', result4.numSegments)
    if (result4.price) {
      console.log('  Price:', result4.price, result4.priceUnit)
    }
    console.log('')

    if (result4.success && result4.messageSid) {
      await logTestResult('long_message_test', result4)
    }
  } catch (error: any) {
    console.error('  ❌ Exception:', error.message)
  }

  console.log('✅ Test suite completed')
}

async function logTestResult(testName: string, result: TestResult): Promise<void> {
  try {
    await supabase.from('events').insert({
      event_type: 'twilio_integration_test',
      event_data: {
        test_name: testName,
        message_sid: result.messageSid,
        status: result.status,
        success: result.success,
        mock: result.mock,
        price: result.price,
      },
      source: 'test_script',
    })
    console.log('  📝 Test result logged to database')
  } catch (error: any) {
    console.error('  ⚠️  Failed to log test result:', error.message)
  }
}

// Run tests if executed directly
if (require.main === module) {
  testTwilioIntegration()
    .then(() => {
      console.log('\n🏁 All tests completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error)
      process.exit(1)
    })
}

export { testTwilioIntegration }
