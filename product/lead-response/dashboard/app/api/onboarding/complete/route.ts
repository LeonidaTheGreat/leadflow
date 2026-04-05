/**
 * POST /api/onboarding/complete
 *
 * Records onboarding completion for an authenticated agent.
 * Updates real_estate_agents with onboarding_completed, aha_completed, and aha_response_time_ms.
 * Idempotent — safe to call multiple times with the same agentId.
 *
 * PRD: PRD-FRICTIONLESS-DEMO-NO-FUB.md (FR-4) + PRD-ONBOARDING-AHA-COMPLETION.md (FR-4)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'

interface CompletionPayload {
  ahaCompleted?: boolean
  ahaResponseTimeMs?: number | null
  stepsCompleted?: string[]
}

interface CompleteRequest {
  agentId?: string
  completionPayload?: CompletionPayload
}

export async function POST(request: NextRequest) {
  // Auth check
  const authenticatedId = await getAuthUserId(request)
  if (!authenticatedId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Parse body
  let body: CompleteRequest = {}
  try {
    body = await request.json()
  } catch {
    // Empty body is OK — we'll use defaults
  }

  const { completionPayload } = body

  // Build the update object
  const updateData: Record<string, any> = {
    onboarding_completed: true,
    onboarding_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (completionPayload) {
    if (typeof completionPayload.ahaCompleted === 'boolean') {
      updateData.aha_completed = completionPayload.ahaCompleted
    }
    if (typeof completionPayload.ahaResponseTimeMs === 'number') {
      updateData.aha_response_time_ms = completionPayload.ahaResponseTimeMs
    }
    if (completionPayload.stepsCompleted && Array.isArray(completionPayload.stepsCompleted)) {
      updateData.onboarding_final_step = completionPayload.stepsCompleted[completionPayload.stepsCompleted.length - 1] || 'confirmation'
    }
  }

  const { error } = await supabaseAdmin
    .from('real_estate_agents')
    .update(updateData)
    .eq('id', authenticatedId)

  if (error) {
    console.error('[onboarding/complete] Failed to update agent:', error)
    return NextResponse.json({ error: 'Failed to record onboarding completion' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Onboarding completed',
    agentId: authenticatedId,
    onboardingCompletedAt: updateData.onboarding_completed_at,
  })
}
