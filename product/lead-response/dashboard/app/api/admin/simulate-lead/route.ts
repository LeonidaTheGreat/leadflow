import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import { logger } from '@/lib/logger'
import { LeadExperienceVisibilityService } from '@/lib/services/lead-experience-visibility-service'

const DB_URL = (process.env.NEXT_PUBLIC_API_URL)!
const DB_KEY = (process.env.API_SECRET_KEY)!

function getService() {
  return new LeadExperienceVisibilityService({
    db: createClient(DB_URL, DB_KEY),
    logger,
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { leadName, leadPhone, propertyInterest } = body

    if (!leadName || typeof leadName !== 'string' || leadName.trim().length === 0) {
      return NextResponse.json({ error: 'leadName is required' }, { status: 400 })
    }

    const service = getService()
    const simulation = service.runSimulation({ leadName, leadPhone, propertyInterest })
    const { data, error } = await service.saveSimulation(simulation)

    if (error) {
      logger.error('Failed to store simulation:', error)
      return NextResponse.json({
        id: null,
        conversation: simulation.conversation,
        outcome: 'completed',
        warning: 'Simulation ran but could not be saved',
      })
    }

    return NextResponse.json({
      id: data.id,
      conversation: simulation.conversation,
      outcome: 'completed',
      createdAt: data.created_at,
    })
  } catch (err: any) {
    logger.error('Simulation error:', err)
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 })
  }
}
