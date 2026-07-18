import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/services/AuthService'

const TEST_EMAIL_PATTERNS = ['example.com', 'test', 'internal']

function isTestEmail(email: string): boolean {
  const lower = email.toLowerCase()
  return TEST_EMAIL_PATTERNS.some(p => lower.includes(p))
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: prospects, error } = await postgrestAdmin
      .from('pilot_signups')
      .select('id,name,email,phone,status,follow_up_stage,last_follow_up_at,created_at,updated_at,brokerage_name,source')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const filtered = (prospects ?? []).filter((p: any) => !isTestEmail(p.email))

    return NextResponse.json({ prospects: filtered })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, email, phone } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const record: Record<string, any> = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      status: 'new',
      source: 'admin_manual',
      follow_up_stage: 0,
    }
    if (phone && typeof phone === 'string' && phone.trim()) {
      record.phone = phone.trim()
    }

    const { data, error } = await postgrestAdmin
      .from('pilot_signups')
      .insert(record)
      .select('id,name,email,phone,status,follow_up_stage,created_at')
      .single()

    if (error) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return NextResponse.json({ error: 'A prospect with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ prospect: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
