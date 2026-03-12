import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import Stripe from 'stripe'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' as any })
  : null

/**
 * Validate JWT token from auth-token cookie
 */
function validateJWTToken(token: string): { id: string; email: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; email: string }
    return payload
  } catch {
    return null
  }
}

/**
 * Map plan ID to Stripe price ID from environment variables
 */
function getPriceIdForPlan(planId: string): string | null {
  const priceIdMap: Record<string, string> = {
    starter: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    pro: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || '',
    team: process.env.STRIPE_PRICE_TEAM_MONTHLY || '',
  }
  return priceIdMap[planId] || null
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { planId } = body

    if (!planId || !['starter', 'pro', 'team'].includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid or missing planId' },
        { status: 400 }
      )
    }

    const priceId = getPriceIdForPlan(planId)
    if (!priceId || priceId.startsWith('price_replace')) {
      return NextResponse.json(
        { error: 'Price not configured for this plan' },
        { status: 503 }
      )
    }

    // Get JWT token from cookie for authentication
    const authToken = request.cookies.get('auth-token')?.value
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Validate JWT token
    const jwtPayload = validateJWTToken(authToken)
    if (!jwtPayload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get agent email from database to ensure they exist and get current email
    const { data: agent, error: agentError } = await supabase
      .from('real_estate_agents')
      .select('id, email')
      .eq('id', jwtPayload.id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Create Stripe Checkout session
    const session = await stripe!.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: agent.email,
      client_reference_id: agent.id,
      success_url: `${new URL(request.url).origin}/dashboard?upgrade=success`,
      cancel_url: `${new URL(request.url).origin}/settings/billing?upgrade=cancelled`,
      metadata: {
        agent_id: agent.id,
        plan_id: planId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
