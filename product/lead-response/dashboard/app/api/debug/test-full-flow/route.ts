import { NextResponse } from 'next/server'
import { supabaseAdmin, createLead } from '@/lib/supabase'
import { normalizePhone } from '@/lib/twilio'
import { searchLeadByPhone, createLeadInFub } from '@/lib/fub'
import type { Lead, Agent } from '@/lib/types'

async function getDefaultAgent(): Promise<Agent | null> {
  const { data: agents } = await supabaseAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('is_active', true)
    .limit(1)
  return (agents?.[0] as Agent | undefined) ?? null
}

export async function POST(request: Request) {
  const logs: string[] = []
  const log = (msg: string) => {
    console.log(msg)
    logs.push(msg)
  }
  
  try {
    const { from, body } = await request.json()
    log(`📥 Full Twilio simulation from: ${from}`)
    
    // Step 1: Normalize
    const phone = normalizePhone(from)
    log(`Phone: ${phone}`)
    
    // Step 2: Find local lead (using maybeSingle like the fixed code)
    log('Finding local lead...')
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*, agent:real_estate_agents(*)')
      .eq('phone', phone)
      .maybeSingle() as { data: Lead | null; error: any }
    
    if (leadError) {
      log(`Supabase error: ${leadError.message}`)
    } else if (lead) {
      log(`Found local lead: ${lead.id}`)
      return NextResponse.json({ success: true, action: 'found_local', lead_id: lead.id, logs })
    } else {
      log('No local lead found')
    }
    
    // Step 3: Check FUB
    log('Checking FUB...')
    const fubLead = await searchLeadByPhone(phone)
    
    if (fubLead?.id) {
      log(`Found in FUB: ${fubLead.id}`)
      // Sync to local
      const agent = await getDefaultAgent()
      log(`Default agent: ${agent?.id || 'none'}`)
      
      const { data: newLead, error: createError } = await createLead({
        fub_id: String(fubLead.id),
        agent_id: agent?.id || null,
        name: `${fubLead.firstName || ''} ${fubLead.lastName || ''}`.trim() || null,
        email: fubLead.email || null,
        phone: phone,
        source: fubLead.source || 'fub_sync',
        status: 'new',
        consent_sms: false, // Will need explicit opt-in
        consent_email: false,
      })
      
      if (createError) {
        log(`❌ createLead error: ${createError.message}`)
        return NextResponse.json({ error: createError.message, logs }, { status: 500 })
      }
      
      log(`✅ Created local lead: ${newLead?.id}`)
      return NextResponse.json({ 
        success: true, 
        action: 'synced_from_fub', 
        lead_id: newLead?.id,
        logs 
      })
    }
    
    // Step 4: Create in FUB
    log('Creating in FUB...')
    const newFubLead = await createLeadInFub({
      firstName: 'New',
      lastName: 'Lead',
      phones: [{ value: phone, type: 'Mobile' }],
      source: 'SMS Inbound',
      stage: 'New Lead',
    })
    
    if (!newFubLead?.id) {
      log('❌ createLeadInFub returned null')
      return NextResponse.json({ error: 'Failed to create in FUB', logs }, { status: 500 })
    }
    
    log(`✅ Created in FUB: ${newFubLead.id}`)
    
    // Step 5: Create locally
    log('Creating local lead...')
    const agent = await getDefaultAgent()
    log(`Agent: ${agent?.id || 'none'}`)
    
    const { data: newLead, error: createError } = await createLead({
      fub_id: String(newFubLead.id),
      agent_id: agent?.id || null,
      name: `${newFubLead.firstName || ''} ${newFubLead.lastName || ''}`.trim() || null,
      email: newFubLead.email || null,
      phone: phone,
      source: 'SMS Inbound',
      status: 'new',
      consent_sms: true,
      consent_email: false,
    })
    
    if (createError) {
      log(`❌ createLead error: ${createError.message}`)
      return NextResponse.json({ error: createError.message, logs }, { status: 500 })
    }
    
    log(`✅ Created local lead: ${newLead?.id}`)
    return NextResponse.json({
      success: true,
      action: 'full_flow_complete',
      fub_id: newFubLead.id,
      lead_id: newLead?.id,
      logs,
    })
    
  } catch (error: any) {
    log(`❌ FATAL: ${error.message}`)
    log(`Stack: ${error.stack}`)
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack,
      logs 
    }, { status: 500 })
  }
}
