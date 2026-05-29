import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import { logger } from '@/lib/logger'
import { LeadExperienceVisibilityService } from '@/lib/services/lead-experience-visibility-service'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org'
const API_SERVICE_KEY = process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || ''

function getService() {
  return new LeadExperienceVisibilityService({
    db: createClient(API_URL, API_SERVICE_KEY),
    logger,
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const outcomeFilter = searchParams.get('outcome') || 'all'
    const conversations = await getService().getConversations(outcomeFilter)
    return NextResponse.json({ conversations })
  } catch (err: any) {
    logger.error('Conversations fetch error:', err)
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 })
  }
}
