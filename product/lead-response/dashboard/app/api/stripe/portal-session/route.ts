import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey) : null

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'

/**
 * POST /api/stripe/portal-session
 * Creates a Stripe Customer Portal session for authenticated users
 * Requires: agent_id in request body (authenticated user context)
 */
export async function POST(request: NextRequest) {
  try {
    // Check Stripe configuration
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured', code: 'STRIPE_NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { agentId, returnUrl } = body

    // Validate required fields
    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing required field: agentId', code: 'MISSING_AGENT_ID' },
        { status: 400 }
      )
    }

    // Get agent from database to verify existence and get Stripe customer ID
    const { data: agent, error: agentError } = await supabase
      .from('real_estate_agents')
      .select('id, email, stripe_customer_id, status')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      console.error('Agent lookup error:', agentError)
      return NextResponse.json(
        { error: 'Agent not found', code: 'AGENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Ensure agent has a Stripe customer ID
    let customerId = agent.stripe_customer_id

    if (!customerId) {
      // Create a new Stripe customer for this agent
      try {
        const customer = await stripe.customers.create({
          email: agent.email,
          metadata: {
            agent_id: agent.id,
            source: 'leadflow_portal',
          },
        })
        customerId = customer.id

        // Update agent record with new customer ID
        const { error: updateError } = await supabase
          .from('real_estate_agents')
          .update({
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', agentId)

        if (updateError) {
          console.error('Failed to update agent with Stripe customer ID:', updateError)
          // Continue anyway - we have the customer ID
        }

        console.log(`✅ Created Stripe customer ${customerId} for agent ${agentId}`)
      } catch (stripeError: any) {
        console.error('Failed to create Stripe customer:', stripeError)
        return NextResponse.json(
          { 
            error: 'Failed to create billing customer', 
            code: 'STRIPE_CUSTOMER_ERROR',
            details: stripeError.message 
          },
          { status: 500 }
        )
      }
    }

    // Create the return URL (where user returns after managing portal)
    const portalReturnUrl = returnUrl || `${baseUrl}/settings`

    // Create Stripe Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: portalReturnUrl,
    })

    // Log portal session creation for analytics
    await supabase.from('subscription_events').insert({
      agent_id: agentId,
      event_type: 'portal_session_created',
      stripe_customer_id: customerId,
      metadata: {
        portal_session_id: portalSession.id,
        return_url: portalReturnUrl,
      },
      created_at: new Date().toISOString(),
    })

    console.log(`✅ Portal session created for agent ${agentId}: ${portalSession.id}`)

    return NextResponse.json({
      success: true,
      url: portalSession.url,
      sessionId: portalSession.id,
    })

  } catch (error: any) {
    console.error('Portal session creation error:', error)

    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { 
          error: `Stripe error: ${error.message}`, 
          code: 'STRIPE_INVALID_REQUEST',
          stripe_code: error.code 
        },
        { status: 400 }
      )
    }

    if (error.type === 'StripeAuthenticationError') {
      return NextResponse.json(
        { 
          error: 'Stripe authentication failed', 
          code: 'STRIPE_AUTH_ERROR' 
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to create portal session', 
        code: 'INTERNAL_ERROR',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/stripe/portal-session
 * Get portal configuration status for an agent
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing required parameter: agentId', code: 'MISSING_AGENT_ID' },
        { status: 400 }
      )
    }

    // Get agent with billing info
    const { data: agent, error } = await supabase
      .from('real_estate_agents')
      .select('id, email, stripe_customer_id, stripe_subscription_id, plan_tier, status, mrr')
      .eq('id', agentId)
      .single()

    if (error || !agent) {
      return NextResponse.json(
        { error: 'Agent not found', code: 'AGENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if Stripe customer exists and is valid
    let customerValid = false
    if (agent.stripe_customer_id && stripe) {
      try {
        const customer = await stripe.customers.retrieve(agent.stripe_customer_id)
        customerValid = !customer.deleted
      } catch (stripeError) {
        customerValid = false
      }
    }

    return NextResponse.json({
      success: true,
      portalAvailable: customerValid,
      billingInfo: {
        customerId: agent.stripe_customer_id,
        subscriptionId: agent.stripe_subscription_id,
        planTier: agent.plan_tier,
        status: agent.status,
        mrr: agent.mrr,
      },
    })

  } catch (error: any) {
    console.error('Portal config GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get portal configuration', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
