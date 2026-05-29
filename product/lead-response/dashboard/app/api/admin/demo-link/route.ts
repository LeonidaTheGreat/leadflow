import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import { logger } from '@/lib/logger'
import { LeadExperienceVisibilityService } from '@/lib/services/lead-experience-visibility-service'

function cleanEnv(value?: string): string | undefined {
  if (!value) return undefined
  return value.replace(/\\n/g, '').trim()
}

function getService() {
  const dbUrl = cleanEnv(process.env.NEXT_PUBLIC_API_URL)
  const dbKey = cleanEnv(process.env.API_SECRET_KEY)

  if (!dbUrl || !dbKey) {
    throw new Error('Missing API configuration for demo link route')
  }

  return new LeadExperienceVisibilityService({
    db: createClient(dbUrl, dbKey),
    logger,
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const label = body?.label || null
    const contentType = body?.contentType || null
    const contentId = body?.contentId || null
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'

    const result = await getService().createDemoLink({ host, protocol, label, contentType, contentId })
    return NextResponse.json(result)
  } catch (err: any) {
    logger.error('Demo link creation error:', err)
    return NextResponse.json({ error: 'Failed to create demo link' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawToken = searchParams.get('token')

    if (!rawToken) {
      return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 })
    }

    const result = await getService().validateDemoToken(rawToken)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawToken = searchParams.get('token')

    if (!rawToken) {
      return NextResponse.json({ revoked: false, error: 'No token provided' }, { status: 400 })
    }

    const result = await getService().revokeDemoToken(rawToken)
    return NextResponse.json(result)
  } catch (err: any) {
    logger.error('Demo link revoke error:', err)
    return NextResponse.json({ revoked: false, error: 'Failed to revoke demo link' }, { status: 500 })
  }
}
