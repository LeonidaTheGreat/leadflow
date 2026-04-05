import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = postgrestAdmin
      .from('pilot_recruitment_targets')
      .select('*')
      .eq('campaign_id', id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, targets: data })
  } catch (err) {
    console.error('Error listing targets:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, phone, location, brokerage, social_profile_url, source_channel, notes, priority } = body

    if (!name || !source_channel) {
      return NextResponse.json(
        { success: false, error: 'Name and source_channel are required' },
        { status: 400 }
      )
    }

    const { data, error } = await postgrestAdmin
      .from('pilot_recruitment_targets')
      .insert({
        campaign_id: id,
        name,
        email,
        phone,
        location,
        brokerage,
        social_profile_url,
        source_channel,
        status: 'identified',
        notes,
        priority: priority || 0
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, target: data }, { status: 201 })
  } catch (err) {
    console.error('Error adding target:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
