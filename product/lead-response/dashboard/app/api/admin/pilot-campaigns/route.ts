import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'

export async function GET() {
  try {
    const { data, error } = await postgrestAdmin
      .from('pilot_recruitment_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, campaigns: data })
  } catch (err) {
    console.error('Error listing campaigns:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
