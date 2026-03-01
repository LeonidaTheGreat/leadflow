import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, parseWebhookPayload, handleBookingWebhook } from '@/lib/calcom'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSms } from '@/lib/twilio'
import { generateConfirmationMessage } from '@/lib/calcom'

// Force dynamic rendering - webhook must handle runtime requests
export const dynamic = 'force-dynamic'

// ============================================
// CAL.COM WEBHOOK HANDLER
// ============================================

/**
 * Handle Cal.com booking webhooks
 * POST /api/webhook/calcom
 * 
 * Cal.com sends JSON payload with signature header
 * Required headers: 
 * - Content-Type: application/json
 * - X-Calcom-Signature: HMAC-SHA256 signature
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📥 Cal.com webhook START')
    
    // Read raw body for signature verification
    const rawBody = await request.text()
    
    // Get signature header
    const signature = request.headers.get('X-Calcom-Signature')
    if (!signature) {
      console.error('❌ Missing X-Calcom-Signature header')
      return new NextResponse('Missing signature', { status: 400 })
    }
    
    // Verify signature
    const secret = process.env.CALCOM_WEBHOOK_SECRET
    if (!secret) {
      console.error('❌ CALCOM_WEBHOOK_SECRET not set')
      return new NextResponse('Webhook secret not configured', { status: 500 })
    }
    
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      console.error('❌ Invalid signature')
      return new NextResponse('Invalid signature', { status: 401 })
    }
    
    // Parse payload
    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch (e) {
      console.error('❌ Invalid JSON payload')
      return new NextResponse('Invalid JSON', { status: 400 })
    }
    
    const webhookPayload = parseWebhookPayload(payload)
    if (!webhookPayload) {
      console.error('❌ Invalid webhook payload')
      return new NextResponse('Invalid payload', { status: 400 })
    }
    
    const { triggerEvent, payload: bookingData } = webhookPayload
    
    console.log('📅 Cal.com event:', triggerEvent, 'Booking ID:', bookingData.bookingId)
    
    // Handle booking event
    const result = await handleBookingWebhook(webhookPayload)
    if (!result.success) {
      console.error('❌ Failed to handle booking event:', triggerEvent)
      await supabaseAdmin.from('events').insert({
        event_type: 'calcom_webhook_error',
        event_data: { 
          triggerEvent, 
          error: 'Failed to handle booking event', 
          payload: bookingData 
        },
        source: 'calcom_webhook'
      })
      return new NextResponse('Failed to process event', { status: 500 })
    }
    
    // Extract booking data
    const { bookingData: parsedBooking } = result
    if (!parsedBooking) {
      console.error('❌ No booking data extracted')
      return new NextResponse('No booking data', { status: 500 })
    }
    
    // Find lead by attendee email or phone
    let lead: any = null
    const attendee = bookingData.attendees?.[0]
    
    if (attendee?.email) {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('email', attendee.email)
        .maybeSingle()
      lead = data
    }
    
    if (!lead && attendee?.phoneNumber) {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('phone', attendee.phoneNumber)
        .maybeSingle()
      lead = data
    }
    
    if (!lead) {
      console.warn('⚠️  Lead not found for booking:', attendee?.email || attendee?.phoneNumber)
      await supabaseAdmin.from('events').insert({
        event_type: 'calcom_lead_not_found',
        event_data: { 
          bookingId: bookingData.bookingId, 
          attendee: attendee 
        },
        source: 'calcom_webhook'
      })
      // Still proceed to store booking - we can link later
    }
    
    // Store booking in Supabase
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        calcom_booking_id: String(bookingData.bookingId),
        calcom_event_type_id: String(bookingData.eventTypeId),
        start_time: bookingData.startTime,
        end_time: bookingData.endTime,
        meeting_link: bookingData.metadata?.videoCallUrl || null,
        notes: bookingData.description || null,
        metadata: {
          title: bookingData.title,
          attendees: bookingData.attendees,
          organizer: bookingData.organizer,
          uid: bookingData.uid,
        },
        lead_id: lead?.id || null,
        status: parsedBooking.status || 'confirmed',
      })
      .select()
      .single()
    
    if (bookingError) {
      console.error('❌ Failed to store booking:', bookingError)
      await supabaseAdmin.from('events').insert({
        event_type: 'booking_store_error',
        event_data: { 
          bookingId: bookingData.bookingId, 
          error: bookingError.message 
        },
        source: 'calcom_webhook'
      })
      return new NextResponse('Failed to store booking', { status: 500 })
    }
    
    // If lead found, send SMS confirmation
    if (lead && lead.phone && lead.consent_sms && !lead.dnc) {
      const agent = lead.agent
      if (!agent) {
        console.warn('⚠️  Agent not found for lead:', lead.id)
        // Still store booking, but skip SMS
      } else {
        const agentName = agent.name || 'your agent'
        const startDate = new Date(bookingData.startTime)
        const dateStr = startDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
        const timeStr = startDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })
        const meetingLink = bookingData.metadata?.videoCallUrl || 'https://cal.com'
        
        let smsBody = ''
        
        switch (triggerEvent) {
          case 'BOOKING_CREATED':
            smsBody = `Hi ${lead.name}! Your appointment with ${agentName} is confirmed for ${dateStr} at ${timeStr}.\nMeeting link: ${meetingLink}\nReply STOP to opt out.`
            break
          case 'BOOKING_RESCHEDULED':
            smsBody = `Hi ${lead.name}! Your appointment has been rescheduled to ${dateStr} at ${timeStr}.\nNew link: ${meetingLink}\nReply STOP to opt out.`
            break
          case 'BOOKING_CANCELLED':
            smsBody = `Hi ${lead.name}! Your appointment for ${dateStr} has been cancelled. \nReply here or call us to reschedule.\nReply STOP to opt out.`
            break
          default:
            smsBody = `Your appointment has been updated. Date: ${dateStr} at ${timeStr}. Link: ${meetingLink}\nReply STOP to opt out.`
        }
        
        // Send SMS
        const smsResult = await sendSms({
          to: lead.phone,
          body: smsBody,
          statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`
        })
        
        if (!smsResult.success) {
          console.error('❌ Failed to send SMS:', smsResult.error)
          await supabaseAdmin.from('events').insert({
            event_type: 'sms_send_error',
            event_data: { 
              bookingId: bookingData.bookingId, 
              leadId: lead.id, 
              error: smsResult.error,
              sms_body: smsBody
            },
            source: 'calcom_webhook'
          })
        } else {
          console.log('✅ SMS sent to lead:', lead.phone)
          
          // Store outbound SMS message
          await supabaseAdmin.from('messages').insert({
            lead_id: lead.id,
            direction: 'outbound',
            channel: 'sms',
            message_body: smsBody,
            ai_generated: false,
            status: 'sent',
            sent_at: new Date().toISOString(),
            twilio_sid: smsResult.messageSid || null,
            metadata: { 
              booking_id: booking.id,
              event_type: triggerEvent
            }
          })
        }
      }
    }
    
    // Log successful event
    await supabaseAdmin.from('events').insert({
      event_type: 'calcom_booking_event',
      event_data: { 
        triggerEvent, 
        bookingId: bookingData.bookingId, 
        leadId: lead?.id,
        action: result.action
      },
      source: 'calcom_webhook'
    })
    
    console.log('✅ Cal.com webhook processed successfully')
    return new NextResponse('OK', { status: 200 })
    
  } catch (error: any) {
    console.error('❌ Cal.com webhook error:', error)
    console.error('Stack:', error.stack)
    
    // Log error to events table
    await supabaseAdmin.from('events').insert({
      event_type: 'webhook_error',
      event_data: { 
        error: error.message,
        stack: error.stack,
        source: 'calcom_webhook'
      },
      source: 'calcom_webhook'
    })
    
    // Return 200 to prevent Cal.com retries
    return new NextResponse('Error logged', { status: 200 })
  }
}