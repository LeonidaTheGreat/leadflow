import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizePhone } from '@/lib/twilio'
import { searchLeadByPhone, createLeadInFub } from '@/lib/fub'
import type { Lead } from '@/lib/types'

export async function POST(request: Request) {
  const logs: string[] = []
  const log = (msg: string) => {
    console.log(msg)
    logs.push(msg)
  }
  
  try {
    const { from, body } = await request.json()
    log(`📥 Test SMS from: ${from}, body: ${body}`)
    
    // Step 1: Normalize phone
    log('Step 1: Normalizing phone...')
    const phone = normalizePhone(from)
    log(`   Phone normalized: ${phone}`)
    
    if (!phone) {
      return NextResponse.json({ error: 'Invalid phone', logs }, { status: 400 })
    }
    
    // Step 2: Check Supabase
    log('Step 2: Checking Supabase...')
    let lead = null
    try {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('phone', phone)
        .maybeSingle() as { data: Lead | null; error: any }
      
      if (error) {
        log(`   Supabase error: ${error.message}`)
      } else if (data) {
        lead = data
        log(`   Found lead: ${data.id}`)
      } else {
        log('   No lead found locally')
      }
    } catch (e: any) {
      log(`   Supabase exception: ${e.message}`)
    }
    
    // Step 3: If not found, check FUB
    if (!lead) {
      log('Step 3: Checking FUB...')
      try {
        const fubLead = await searchLeadByPhone(phone)
        if (fubLead?.id) {
          log(`   Found in FUB: ${fubLead.id}`)
          return NextResponse.json({ 
            success: true, 
            action: 'found_in_fub',
            fub_id: fubLead.id,
            logs 
          })
        } else {
          log('   Not found in FUB')
        }
      } catch (e: any) {
        log(`   FUB search error: ${e.message}`)
      }
      
      // Step 4: Create in FUB
      log('Step 4: Creating in FUB...')
      try {
        const newFubLead = await createLeadInFub({
          firstName: 'Test',
          lastName: 'Lead',
          phones: [{ value: phone, type: 'Mobile' }],
          source: 'Debug SMS',
          stage: 'New Lead',
        })
        
        if (newFubLead?.id) {
          log(`   ✅ Created in FUB: ${newFubLead.id}`)
          return NextResponse.json({
            success: true,
            action: 'created_in_fub',
            fub_id: newFubLead.id,
            logs,
          })
        } else {
          log('   ❌ createLeadInFub returned null')
          return NextResponse.json({ 
            error: 'Failed to create in FUB', 
            logs 
          }, { status: 500 })
        }
      } catch (e: any) {
        log(`   FUB create error: ${e.message}`)
        return NextResponse.json({ 
          error: e.message, 
          logs 
        }, { status: 500 })
      }
    }
    
    return NextResponse.json({ success: true, lead, logs })
    
  } catch (error: any) {
    log(`❌ Fatal error: ${error.message}`)
    return NextResponse.json({ 
      error: error.message, 
      logs 
    }, { status: 500 })
  }
}
