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
    log('📥 Testing formData parsing...')
    
    // Try to parse formData like Twilio does
    let formData
    try {
      formData = await request.formData()
      log('✅ formData parsed successfully')
    } catch (e: any) {
      log(`❌ formData parse error: ${e.message}`)
      // Fallback to JSON
      const json = await request.json()
      log('Falling back to JSON')
      formData = new Map(Object.entries(json))
    }
    
    const from = formData.get('From') as string
    const body = (formData.get('Body') as string || '').trim()
    
    log(`From: ${from}, Body: ${body}`)
    
    if (!from || !body) {
      return NextResponse.json({ error: 'Missing fields', logs }, { status: 400 })
    }
    
    // Normalize
    const phone = normalizePhone(from)
    log(`Phone normalized: ${phone}`)
    
    // Full flow
    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('phone', phone)
      .maybeSingle() as { data: Lead | null }
    
    if (existingLead) {
      log(`Found existing: ${existingLead.id}`)
      return NextResponse.json({ success: true, action: 'existing', lead_id: existingLead.id, logs })
    }
    
    log('Not found locally, checking FUB...')
    const fubLead = await searchLeadByPhone(phone)
    
    if (fubLead?.id) {
      log(`Found in FUB: ${fubLead.id}`)
      // Would sync here
      return NextResponse.json({ success: true, action: 'fub_existing', fub_id: fubLead.id, logs })
    }
    
    log('Creating in FUB...')
    const newFubLead = await createLeadInFub({
      firstName: 'FormData',
      lastName: 'Test',
      phones: [{ value: phone, type: 'Mobile' }],
      source: 'FormData Test',
      stage: 'New Lead',
    })
    
    if (!newFubLead?.id) {
      log('❌ Failed to create in FUB')
      return NextResponse.json({ error: 'FUB create failed', logs }, { status: 500 })
    }
    
    log(`✅ Created in FUB: ${newFubLead.id}`)
    
    const agent = await getDefaultAgent()
    log(`Agent: ${agent?.id || 'none'}`)
    
    const { data: newLead, error: createError } = await createLead({
      fub_id: String(newFubLead.id),
      agent_id: agent?.id || null,
      name: 'FormData Test',
      phone: phone,
      source: 'FormData Test',
      status: 'new',
      consent_sms: true,
      consent_email: false,
    })
    
    if (createError) {
      log(`❌ createLead error: ${createError.message}`)
      return NextResponse.json({ error: createError.message, logs }, { status: 500 })
    }
    
    log(`✅ Created local: ${newLead?.id}`)
    return NextResponse.json({
      success: true,
      action: 'created',
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
