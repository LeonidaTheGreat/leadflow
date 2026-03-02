import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email, name, phone } = await request.json()

    // Validate required fields
    if (!email || !name || !phone) {
      return NextResponse.json(
        { error: 'Email, name, and phone are required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, email, status')
      .eq('email', email.toLowerCase())
      .single()

    if (existingCustomer) {
      // If customer exists and is active, return existing ID
      if (existingCustomer.status === 'active' || existingCustomer.status === 'trialing') {
        return NextResponse.json({
          customerId: existingCustomer.id,
          existing: true,
          message: 'Account already exists'
        })
      }
      
      // If cancelled, allow re-signup
      if (existingCustomer.status === 'canceled') {
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            name,
            phone,
            status: 'trialing',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCustomer.id)

        if (updateError) {
          console.error('Error reactivating customer:', updateError)
          return NextResponse.json(
            { error: 'Failed to reactivate account' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          customerId: existingCustomer.id,
          existing: true,
          message: 'Account reactivated'
        })
      }
    }

    // Create new customer
    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({
        email: email.toLowerCase(),
        name,
        phone,
        status: 'trialing',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Error creating customer:', createError)
      return NextResponse.json(
        { error: 'Failed to create customer account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      customerId: newCustomer.id,
      message: 'Customer created successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Customer creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
