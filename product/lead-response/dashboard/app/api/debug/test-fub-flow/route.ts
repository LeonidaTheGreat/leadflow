import { NextResponse } from 'next/server'
import { searchLeadByPhone, createLeadInFub } from '@/lib/fub'

export async function POST(request: Request) {
  try {
    const { phone } = await request.json()
    
    console.log('🔍 Testing FUB flow for phone:', phone)
    
    // Step 1: Search for existing lead
    console.log('Step 1: Searching FUB...')
    const existing = await searchLeadByPhone(phone)
    console.log('Search result:', existing ? `Found ID ${existing.id}` : 'Not found')
    
    if (existing?.id) {
      return NextResponse.json({
        success: true,
        action: 'found',
        fub_id: existing.id,
        name: `${existing.firstName} ${existing.lastName}`,
      })
    }
    
    // Step 2: Create new lead
    console.log('Step 2: Creating in FUB...')
    const newLead = await createLeadInFub({
      firstName: 'Debug',
      lastName: 'Test',
      phones: [{ value: phone, type: 'Mobile' }],
      source: 'Debug Test',
      stage: 'New Lead',
    })
    
    if (!newLead?.id) {
      console.error('❌ Failed to create lead')
      return NextResponse.json({
        success: false,
        error: 'createLeadInFub returned null',
      }, { status: 500 })
    }
    
    console.log('✅ Created lead:', newLead.id)
    
    return NextResponse.json({
      success: true,
      action: 'created',
      fub_id: newLead.id,
      name: `${newLead.firstName} ${newLead.lastName}`,
    })
    
  } catch (error: any) {
    console.error('❌ Debug endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}
