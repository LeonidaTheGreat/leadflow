import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/services/AuthService'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org'
const API_KEY = process.env.API_SECRET_KEY || ''

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { email, firstName, lastName, prospectId } = body

    if (!email || !firstName || !lastName) {
      return NextResponse.json({ error: 'email, firstName, and lastName are required' }, { status: 400 })
    }

    const res = await fetch(`${API_URL}/api/admin/magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({ email, firstName, lastName }),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: 'Magic link generation failed' }))
      return NextResponse.json({ error: errBody.error || 'Magic link generation failed' }, { status: res.status })
    }

    const result = await res.json()

    if (prospectId) {
      await postgrestAdmin
        .from('pilot_signups')
        .update({
          status: 'contacted',
          follow_up_stage: 'magic-link-sent',
          last_follow_up_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospectId)
    }

    return NextResponse.json({ loginUrl: result.loginUrl })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
