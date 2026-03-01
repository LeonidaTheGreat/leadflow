import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAiSmsResponse } from '@/lib/ai'
import { sendSms } from '@/lib/twilio'
import { createMessage } from '@/lib/supabase'

/**
 * GET /api/cron/follow-up
 * 
 * UC-8: Follow-up Sequences Cron Handler
 * 
 * Triggers:
 * - no_response: 24h after last outbound message with no response
 * - post_viewing: 4h after booking/showing
 * - no_show: 30m after missed appointment
 * - nurture: 7d general nurture sequence
 * 
 * Runs every hour via Vercel Cron
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Quiet hours: 9 PM - 9 AM local time (Toronto timezone)
function isQuietHours(): boolean {
  const now = new Date()
  const hour = now.getHours()
  return hour >= 21 || hour < 9
}

// Calculate next send time based on sequence type
function getNextSendTime(sequenceType: string, step: number): string {
  const now = new Date()
  
  switch (sequenceType) {
    case 'no_response':
      // 24h after last message
      now.setHours(now.getHours() + 24)
      break
    case 'post_viewing':
      // 4h after booking
      now.setHours(now.getHours() + 4)
      break
    case 'no_show':
      // 30m after missed appointment
      now.setMinutes(now.getMinutes() + 30)
      break
    case 'nurture':
      // 7 days
      now.setDate(now.getDate() + 7)
      break
    default:
      now.setHours(now.getHours() + 24)
  }
  
  return now.toISOString()
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel Cron)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check for test/dry-run mode
    const isDryRun = request.nextUrl.searchParams.get('test') === 'true'

    if (isDryRun) {
      console.log('🧪 Running in DRY-RUN mode')
    }

    // Check quiet hours
    if (isQuietHours() && !isDryRun) {
      console.log('🌙 Quiet hours - skipping cron run')
      return NextResponse.json({
        skipped: true,
        reason: 'quiet_hours',
        message: 'Outside sending hours (9 AM - 9 PM)',
      })
    }

    // Query active sequences due for sending
    const { data: sequences, error: sequencesError } = await supabase
      .from('lead_sequences')
      .select(`
        *,
        leads:lead_id (
          id,
          name,
          phone,
          email,
          status,
          dnc,
          consent_sms,
          agent_id,
          agents:agent_id (
            id,
            name,
            email,
            phone,
            calcom_username,
            market,
            settings
          )
        )
      `)
      .eq('status', 'active')
      .lte('next_send_at', new Date().toISOString())
      .lt('total_messages_sent', 3) // Max 3 messages per sequence

    if (sequencesError) {
      console.error('❌ Error fetching sequences:', sequencesError)
      return NextResponse.json(
        { error: 'Failed to fetch sequences' },
        { status: 500 }
      )
    }

    if (!sequences || sequences.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sequences due',
        processed: 0,
      })
    }

    console.log(`📋 Found ${sequences.length} sequences to process`)

    const results = []
    let sent = 0
    let skipped = 0
    let failed = 0

    for (const sequence of sequences) {
      const lead = sequence.leads
      const agent = lead.agents

      // Safety checks
      if (!lead || !agent) {
        console.warn(`⚠️ Skipping sequence ${sequence.id} - missing lead or agent`)
        skipped++
        continue
      }

      if (lead.dnc || !lead.consent_sms) {
        console.warn(`⚠️ Skipping lead ${lead.id} - DNC or no consent`)
        
        // Mark sequence as completed (can't send)
        await supabase
          .from('lead_sequences')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', sequence.id)
        
        skipped++
        continue
      }

      try {
        // Generate contextual AI message
        const aiResponse = await generateAiSmsResponse(lead, agent, {
          trigger: 'followup',
        })

        if (isDryRun) {
          console.log(`🧪 [DRY-RUN] Would send to ${lead.name}: "${aiResponse.message}"`)
          results.push({
            sequence_id: sequence.id,
            lead_name: lead.name,
            message: aiResponse.message,
            dry_run: true,
          })
          continue
        }

        // Send SMS
        const smsResult = await sendSms({
          to: lead.phone,
          body: aiResponse.message,
          statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`,
        })

        if (!smsResult.success) {
          console.error(`❌ Failed to send SMS to ${lead.name}:`, smsResult.error)
          failed++
          continue
        }

        // Save message to database
        await createMessage({
          lead_id: lead.id,
          direction: 'outbound',
          channel: 'sms',
          message_body: aiResponse.message,
          ai_generated: true,
          ai_confidence: aiResponse.confidence,
          twilio_sid: smsResult.messageSid,
          twilio_status: smsResult.status,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })

        // Update sequence
        const nextStep = sequence.step + 1
        const totalSent = sequence.total_messages_sent + 1
        const newStatus = totalSent >= 3 ? 'completed' : 'active'
        const nextSendAt = newStatus === 'active' 
          ? getNextSendTime(sequence.sequence_type, nextStep)
          : null

        await supabase
          .from('lead_sequences')
          .update({
            step: nextStep,
            total_messages_sent: totalSent,
            last_sent_at: new Date().toISOString(),
            next_send_at: nextSendAt,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sequence.id)

        console.log(`✅ Sent follow-up to ${lead.name} (sequence ${sequence.sequence_type}, step ${nextStep})`)
        
        results.push({
          sequence_id: sequence.id,
          lead_name: lead.name,
          message: aiResponse.message,
          status: newStatus,
          step: nextStep,
        })
        
        sent++

      } catch (err: any) {
        console.error(`❌ Error processing sequence ${sequence.id}:`, err.message)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      processed: sequences.length,
      sent,
      skipped,
      failed,
      dry_run: isDryRun,
      results,
    })

  } catch (error: any) {
    console.error('❌ Cron follow-up error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
