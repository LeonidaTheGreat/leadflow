import { NextRequest, NextResponse } from 'next/server'
import { resumeSequence } from '@/lib/sequences'

/**
 * POST /api/sequences/[id]/resume
 * 
 * UC-8: Manually resume a paused sequence
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { next_send_at } = body

    const success = await resumeSequence(id, next_send_at)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to resume sequence' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Sequence resumed',
    })

  } catch (error: any) {
    console.error('❌ Resume sequence error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
