import { NextRequest, NextResponse } from 'next/server'
import { pauseSequence } from '@/lib/sequences'

/**
 * POST /api/sequences/[id]/pause
 * 
 * UC-8: Manually pause a sequence
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const success = await pauseSequence(id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to pause sequence' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Sequence paused',
    })

  } catch (error: any) {
    console.error('❌ Pause sequence error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
