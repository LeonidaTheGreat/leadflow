import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, createLead, createMessage } from '@/lib/supabase'
import { generateAgentResponse, checkOptOut, extractInfo } from '@/agents/sms-agent/agent'
import { sendSms, normalizePhone } from '@/lib/twilio'
import { syncLeadToFub, searchLeadByPhone, createLeadInFub } from '@/lib/fub'
import type { Lead, Agent } from '@/lib/types'

// Force dynamic rendering - webhook must handle runtime requests
export const dynamic = 'force-dynamic'

// ============================================
// TWILIO INBOUND SMS WEBHOOK
// ============================================

/**
 * Handle incoming SMS from leads
 * POST /api/webhook/twilio
 * 
 * Twilio sends form data:
 * - From: sender phone number
 * - To: Twilio phone number
 * - Body: message text
 * - MessageSid: unique message ID
 * - NumMedia: number of media attachments
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📥 Twilio webhook START')
    const formData = await request.formData()
    console.log('📥 FormData parsed')
    
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const body = (formData.get('Body') as string || '').trim()
    const messageSid = formData.get('MessageSid') as string
    const numMedia = parseInt(formData.get('NumMedia') as string || '0')

    console.log('📥 Inbound SMS:', { from, to, body: body.substring(0, 50), messageSid })

    // Validate required fields
    if (!from || !body) {
      console.error('❌ Missing required fields in Twilio webhook')
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`
      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'text/xml' },
        status: 200 // Return 200 even on error so Twilio doesn't retry
      })
    }

    // Normalize phone number
    const phone = normalizePhone(from)
    if (!phone) {
      console.error('❌ Invalid phone number:', from)
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`
      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'text/xml' },
        status: 200
      })
    }

    // Find lead by phone
    let { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*, agent:agents(*)')
      .eq('phone', phone)
      .maybeSingle()

    // If not found locally, check FUB
    if (leadError || !lead) {
      console.log('⚠️  Lead not found locally, checking FUB:', phone)
      
      const fubLead = await searchLeadByPhone(phone)
      
      if (fubLead?.id) {
        console.log('✅ Found lead in FUB:', fubLead.id)
        // Sync FUB lead to local DB
        const agent = await getDefaultAgent()
        const { data: newLead } = await createLead({
          fub_id: String(fubLead.id),
          agent_id: agent?.id || null,
          name: `${fubLead.firstName || ''} ${fubLead.lastName || ''}`.trim() || null,
          email: fubLead.email || null,
          phone: phone,
          source: fubLead.source || 'fub_sync',
          status: 'new' as const,
          consent_sms: fubLead.consents?.sms || false,
          consent_email: fubLead.consents?.email || false,
        })
        lead = newLead as Lead
      } else {
        // Create NEW lead in FUB (inbound SMS creates lead)
        console.log('🆕 Creating NEW lead in FUB from inbound SMS:', phone)
        
        const fubLead = await createLeadInFub({
          firstName: 'New',
          lastName: 'Lead',
          phones: [{value: phone, type: 'Mobile'}],
          source: 'SMS Inbound',
          stage: 'New Lead',
        })
        
        if (!fubLead?.id) {
          console.error('❌ Failed to create lead in FUB')
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to create lead in FUB'
          }, { status: 500 })
        }
        
        console.log('✅ Lead created in FUB:', fubLead.id)
        
        // Now the FUB webhook will fire and create it in our DB
        // But let's also create it locally immediately
        console.log('📝 Creating local lead...')
        const agent = await getDefaultAgent()
        console.log('📝 Agent:', agent?.id || 'none')
        
        const leadData: Partial<Lead> = {
          fub_id: String(fubLead.id),
          agent_id: agent?.id || null,
          name: `${fubLead.firstName || 'New'} ${fubLead.lastName || 'Lead'}`.trim(),
          email: fubLead.email || null,
          phone: phone,
          source: 'SMS Inbound',
          status: 'new',
          consent_sms: true,
          consent_email: false,
        }
        console.log('📝 Lead data:', JSON.stringify(leadData))
        
        const { data: newLead, error: createError } = await createLead(leadData)
        
        if (createError) {
          console.error('❌ createLead error:', createError)
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to create local lead',
            details: createError.message
          }, { status: 500 })
        }
        
        console.log('✅ Local lead created:', newLead?.id)
        lead = newLead as Lead
      }
    }

    if (!lead) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create or find lead'
      }, { status: 500 })
    }

    // Get agent - either from lead join or fetch separately
    let agent: Agent | null = lead.agent as Agent
    if (!agent && lead.agent_id) {
      const { data: agentData } = await supabaseAdmin
        .from('real_estate_agents')
        .select('*')
        .eq('id', lead.agent_id)
        .single()
      agent = agentData as Agent
    }
    if (!agent) {
      agent = await getDefaultAgent()
    }

    // Check for opt-out keywords (TCPA compliance)
    const optOutKeywords = ['stop', 'unsubscribe', 'cancel', 'end', 'quit']
    const isOptingOut = optOutKeywords.some(keyword => 
      body.toLowerCase() === keyword || 
      body.toLowerCase().startsWith(keyword + ' ')
    )

    if (isOptingOut) {
      console.log('🚫 Opt-out request from:', phone)
      
      // Update lead DNC status
      await supabaseAdmin
        .from('leads')
        .update({ 
          dnc: true, 
          consent_sms: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id)

      // Log opt-out
      await supabaseAdmin.from('events').insert({
        lead_id: lead.id,
        event_type: 'opt_out',
        event_data: { message: body, source: 'inbound_sms' },
        source: 'twilio_webhook',
      })

      // Send opt-out confirmation via TwiML
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You have been unsubscribed. You will no longer receive messages. Reply START to resubscribe.</Message>
</Response>`
      
      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Check for opt-in keywords
    const optInKeywords = ['start', 'subscribe', 'yes']
    const isOptingIn = optInKeywords.some(keyword => 
      body.toLowerCase() === keyword ||
      body.toLowerCase().startsWith(keyword + ' ')
    )

    if (isOptingIn && !lead.consent_sms) {
      console.log('✅ Opt-in request from:', phone)
      
      await supabaseAdmin
        .from('leads')
        .update({ 
          consent_sms: true,
          dnc: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id)

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you! You are now subscribed to receive messages. Reply STOP at any time to unsubscribe.</Message>
</Response>`
      
      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Check if lead is on DNC list
    if (lead.dnc || !lead.consent_sms) {
      console.log('🚫 Lead on DNC or no consent:', phone)
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`
      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Save inbound message to database
    const { data: message, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        lead_id: lead.id,
        direction: 'inbound',
        channel: 'sms',
        message_body: body,
        ai_generated: false,
        twilio_sid: messageSid,
        status: 'pending',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (msgError) {
      console.error('❌ Error saving inbound message:', msgError)
    }

    // Update lead last_contact_at
    await supabaseAdmin
      .from('leads')
      .update({ 
        last_contact_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id)

    // Log the event
    await supabaseAdmin.from('events').insert({
      lead_id: lead.id,
      event_type: 'inbound_sms',
      event_data: { 
        message: body, 
        message_sid: messageSid,
        twilio_number: to 
      },
      source: 'twilio_webhook',
    })

    // Determine if we should auto-respond
    // Only auto-respond if agent is fully configured with required fields
    console.log('🤖 Agent check:', {
      hasAgent: !!agent,
      agentId: agent?.id,
      market: agent?.market,
      hasSettings: !!agent?.settings,
      autoRespond: agent?.settings?.auto_respond,
    })
    const hasRequiredAgent = agent && agent.market && agent.settings
    const shouldAutoRespond = hasRequiredAgent && agent!.settings?.auto_respond !== false
    console.log('🤖 Auto-respond decision:', { hasRequiredAgent, shouldAutoRespond })

    if (shouldAutoRespond) {
      console.log('🤖 Generating AI response for lead:', lead.id)

      // Fetch conversation history
      const { data: conversation } = await supabaseAdmin
        .from('messages')
        .select('direction, message_body, created_at')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: true })
        .limit(10)

      // Check for opt-out
      if (checkOptOut(body)) {
        console.log('🚫 Lead opted out:', lead.id)
        await supabaseAdmin.from('leads').update({ status: 'opted_out' }).eq('id', lead.id)
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You've been opted out. You won't receive any more messages.</Message>
</Response>`
        return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
      }

      // Generate AI response using agent system
      const agentResponse = await generateAgentResponse(
        lead,
        { id: agent!.id, name: agent!.name, market: agent!.market, timezone: agent!.timezone },
        conversation || [],
        body,
        { useLocalModel: false } // Use Claude for quality
      )

      // Update lead with any extracted info
      const extractedInfo = extractInfo(body, null)
      if (Object.keys(extractedInfo).length > 0) {
        console.log('📝 Updating lead with extracted info:', extractedInfo)
        await supabaseAdmin.from('leads').update({
          ...extractedInfo,
          updated_at: new Date().toISOString(),
        }).eq('id', lead.id)
      }

      // Clean up and add compliance footer
      let cleanMessage = agentResponse.message.trim()
      if (!cleanMessage.toLowerCase().includes('stop to opt') && !cleanMessage.toLowerCase().includes('reply stop')) {
        cleanMessage += ' Reply STOP to opt out.'
      }

      // Save outbound message to database
      console.log('💾 Saving outbound message to database...')
      const { data: outboundMsg, error: outboundError } = await supabaseAdmin
        .from('messages')
        .insert({
          lead_id: lead.id,
          direction: 'outbound',
          channel: 'sms',
          message_body: cleanMessage,
          ai_generated: true,
          ai_confidence: agentResponse.confidence,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (outboundError) {
        console.error('❌ Error saving outbound message:', outboundError)
        console.error('Message data:', {
          lead_id: lead.id,
          direction: 'outbound',
          message_length: cleanMessage.length
        })
        // Log to events table for better traceability
        await supabaseAdmin.from('events').insert({
          lead_id: lead.id,
          event_type: 'outbound_message_save_failed',
          event_data: { 
            message_body: cleanMessage, 
            error: outboundError.message,
            message_length: cleanMessage.length
          },
          source: 'twilio_webhook'
        })
      } else {
        console.log('✅ Outbound message saved:', outboundMsg?.id)
      }

      // Update responded_at
      await supabaseAdmin
        .from('leads')
        .update({ responded_at: new Date().toISOString() })
        .eq('id', lead.id)

      console.log('✅ Agent response generated:', {
        action: agentResponse.action,
        confidence: agentResponse.confidence,
      })

      // Return TwiML response for Twilio (this sends the SMS)
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(cleanMessage)}</Message>
</Response>`
      
      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // No auto-respond - return empty TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`
    
    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    })

  } catch (error: any) {
    console.error('❌ Twilio webhook error:', error)
    console.error('Stack:', error.stack)
    
    // Try to log to events but don't fail if this also fails
    try {
      await supabaseAdmin.from('events').insert({
        event_type: 'webhook_error',
        event_data: { 
          error: error.message,
          stack: error.stack,
          source: 'twilio_webhook'
        },
        source: 'twilio_webhook',
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    // Return empty TwiML on error (don't expose errors to Twilio)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`
    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
      status: 200 // Return 200 so Twilio doesn't retry
    })
  }
}

// ============================================
// HELPERS
// ============================================

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function getDefaultAgent(): Promise<Agent | null> {
  const { data: agents } = await supabaseAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('is_active', true)
    .limit(1)

  return agents?.[0] || null
}

// ============================================
// STATUS CALLBACK (for delivery tracking)
// ============================================

export async function PUT(request: NextRequest) {
  // Handle status callbacks from Twilio
  try {
    const formData = await request.formData()
    const messageSid = formData.get('MessageSid') as string
    const status = formData.get('MessageStatus') as string
    const errorCode = formData.get('ErrorCode') as string

    console.log('📊 SMS Status Update:', { messageSid, status, errorCode })

    // Update message status in database
    const { error } = await supabaseAdmin
      .from('messages')
      .update({
        twilio_status: status,
        error_code: errorCode,
        delivered_at: status === 'delivered' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('twilio_sid', messageSid)

    if (error) {
      console.error('❌ Error updating message status:', error)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Status callback error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
