import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  let body: any = {}
  let rawBody = ''

  try {
    // Try to get raw body first
    const text = await request.text()
    rawBody = text

    // Parse as form data
    const params = new URLSearchParams(text)
    params.forEach((value, key) => {
      body[key] = value
    })
  } catch (e) {
    body = { error: 'Failed to parse body' }
  }

  // Log to console
  console.log('📥 RAW TWILIO WEBHOOK:', {
    headers,
    body,
    rawBody: rawBody.substring(0, 500),
    timestamp: new Date().toISOString(),
  })

  // Save to database for inspection
  try {
    await supabaseAdmin.from('events').insert({
      event_type: 'twilio_raw_debug',
      event_data: {
        headers,
        body,
        rawBody: rawBody.substring(0, 1000),
      },
      source: 'twilio_debug',
      ip_address: headers['x-forwarded-for'] || 'unknown',
    } as any)
  } catch (e) {
    console.error('Failed to log event:', e)
  }

  // Return TwiML (required by Twilio)
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Debug received</Message>
</Response>`

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

export async function GET() {
  // Get recent debug events
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('event_type', 'twilio_raw_debug')
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    message: 'Twilio Debug Endpoint',
    recent_events: events || [],
  })
}
