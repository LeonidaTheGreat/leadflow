import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { auth } from '@/lib/api-auth'

// GET /api/agents/profile - Get current agent profile
export async function GET(request: NextRequest) {
  // Require an active authenticated session before returning any data
  const { user } = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agentId = user.id

  try {
    const { data: agent, error } = await supabase
      .from('real_estate_agents')
      .select('id, email, first_name, last_name, phone_number, state, timezone, created_at, onboarding_completed, plan_tier, trial_ends_at')
      .eq('id', agentId)
      .single()

    if (error) {
      console.error('Profile fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Get additional profile data if available
    const { data: profile } = await supabase
      .from('agent_profiles')
      .select('bio, company_name, website, profile_image')
      .eq('agent_id', agentId)
      .single()

    return NextResponse.json({
      agent: {
        id: agent.id,
        email: agent.email,
        firstName: agent.first_name,
        lastName: agent.last_name,
        phoneNumber: agent.phone_number,
        state: agent.state,
        timezone: agent.timezone,
        bio: profile?.bio || '',
        companyName: profile?.company_name || '',
        website: profile?.website || '',
        profileImage: profile?.profile_image || '',
        createdAt: agent.created_at,
        onboardingCompleted: agent.onboarding_completed ?? false,
        plan_tier: agent.plan_tier || null,
        trial_ends_at: agent.trial_ends_at || null,
      },
    })
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/agents/profile - Update agent profile
export async function PUT(request: NextRequest) {
  // Require an active authenticated session before updating data
  const { user } = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agentId = user.id

  try {
    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      state,
      timezone,
      bio,
      companyName,
      website,
      profileImage,
    } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber || !state || !timezone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Update agent record
    const { error: agentError } = await supabase
      .from('real_estate_agents')
      .update({
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        phone_number: phoneNumber,
        state,
        timezone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId)

    if (agentError) {
      console.error('Agent update error:', agentError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Upsert profile data
    const { error: profileError } = await supabase
      .from('agent_profiles')
      .upsert({
        agent_id: agentId,
        bio: bio || null,
        company_name: companyName || null,
        website: website || null,
        profile_image: profileImage || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'agent_id',
      })

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Don't fail the whole request if profile upsert fails
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      agent: {
        id: agentId,
        firstName,
        lastName,
        email,
        phoneNumber,
        state,
        timezone,
        bio,
        companyName,
        website,
        profileImage,
      },
    })
  } catch (error) {
    console.error('Profile PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
