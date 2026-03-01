import { NextResponse } from 'next/server'

export async function GET() {
  // Test FUB API connectivity
  const fubSystemName = (process.env.FUB_SYSTEM_NAME || 'LeadFlow-Properties').trim()
  const fubSystemKey = (process.env.FUB_SYSTEM_KEY || '').trim()
  const fubApiKey = (process.env.FUB_API_KEY || '').trim()
  
  const results = {
    env: {
      fub_system_name: fubSystemName,
      fub_system_key_length: fubSystemKey.length,
      fub_api_key_prefix: fubApiKey.substring(0, 15),
    },
    test_fetch: null as any,
  }
  
  try {
    const response = await fetch('https://api.followupboss.com/v1/people?id=33', {
      headers: {
        'Authorization': `Bearer ${fubApiKey}`,
        'X-System': fubSystemName,
        'X-System-Key': fubSystemKey,
      }
    })
    
    results.test_fetch = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    }
    
    if (response.ok) {
      const data = await response.json()
      results.test_fetch.data_preview = JSON.stringify(data).substring(0, 200)
    } else {
      results.test_fetch.error = await response.text()
    }
  } catch (error) {
    results.test_fetch = {
      error: String(error),
    }
  }
  
  return NextResponse.json(results)
}
