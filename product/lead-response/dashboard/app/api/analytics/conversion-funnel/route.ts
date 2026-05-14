import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

const FUNNEL_STEPS: Record<string, string[]> = {
  signup: [
    'landing_page_viewed',
    'trial_cta_clicked',
    'trial_signup_started',
    'trial_signup_completed',
  ],
  conversion: [
    'trial_signup_completed',
    'dashboard_first_paint',
    'trial_pricing_viewed',
    'trial_upgrade_clicked',
    'trial_checkout_started',
  ],
  onboarding: [
    'trial_signup_completed',
    'wizard_started',
    'wizard_step_completed',
    'aha_simulation_completed',
    'onboarding_completed',
  ],
}

const STEP_LABELS: Record<string, string> = {
  landing_page_viewed: 'Landing Page Viewed',
  trial_cta_clicked: 'CTA Clicked',
  trial_signup_started: 'Signup Started',
  trial_signup_completed: 'Account Created',
  dashboard_first_paint: 'Dashboard Loaded',
  trial_pricing_viewed: 'Pricing Viewed',
  trial_upgrade_clicked: 'Upgrade Clicked',
  trial_checkout_started: 'Checkout Started',
  wizard_started: 'Onboarding Started',
  wizard_step_completed: 'Step Completed',
  aha_simulation_completed: 'Aha Moment',
  onboarding_completed: 'Onboarding Done',
}

interface FunnelStepResult {
  event: string
  label: string
  count: number
  conversionRate: number
  dropOffRate: number
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 365)
    const funnelType = searchParams.get('funnel') || 'signup'

    const steps = FUNNEL_STEPS[funnelType]
    if (!steps) {
      return NextResponse.json(
        { error: `Invalid funnel type. Choose: ${Object.keys(FUNNEL_STEPS).join(', ')}` },
        { status: 400 }
      )
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const stepCounts: FunnelStepResult[] = []

    for (let i = 0; i < steps.length; i++) {
      const event = steps[i]

      const { data, error } = await supabaseAdmin
        .from('events')
        .select('id')
        .eq('event_type', event)
        .gte('created_at', since)

      const count = error ? 0 : (data?.length ?? 0)
      const prevCount = i > 0 ? stepCounts[i - 1].count : count

      stepCounts.push({
        event,
        label: STEP_LABELS[event] || event,
        count,
        conversionRate: prevCount > 0 ? Math.round((count / prevCount) * 1000) / 10 : 0,
        dropOffRate: prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 1000) / 10 : 0,
      })
    }

    const firstCount = stepCounts[0]?.count || 0
    const lastCount = stepCounts[stepCounts.length - 1]?.count || 0
    const totalConversion = firstCount > 0 ? Math.round((lastCount / firstCount) * 1000) / 10 : 0

    return NextResponse.json({
      success: true,
      data: {
        funnel: funnelType,
        period: `${days} days`,
        since,
        steps: stepCounts,
        totalConversionRate: totalConversion,
        totalEntries: firstCount,
        totalCompletions: lastCount,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Conversion funnel error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch funnel data' },
      { status: 500 }
    )
  }
}
