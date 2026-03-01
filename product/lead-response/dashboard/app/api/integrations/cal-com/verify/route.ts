import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { calcomLink } = await request.json()

    if (!calcomLink) {
      return NextResponse.json(
        { error: 'Cal.com link is required' },
        { status: 400 }
      )
    }

    // Validate Cal.com URL format
    if (!calcomLink.includes('cal.com') && !calcomLink.includes('cal.dev')) {
      return NextResponse.json(
        { valid: false, message: 'Invalid Cal.com URL format' },
        { status: 400 }
      )
    }

    // Try to fetch the Cal.com page to verify it exists
    try {
      const response = await fetch(calcomLink, {
        method: 'HEAD',
        redirect: 'follow',
      })

      if (response.ok) {
        return NextResponse.json({ valid: true })
      } else if (response.status === 404) {
        return NextResponse.json({
          valid: false,
          message: 'Booking link not found',
        })
      } else {
        return NextResponse.json({
          valid: false,
          message: 'Could not verify booking link',
        })
      }
    } catch (fetchError) {
      // If we can't reach it, but it's a valid format, we'll accept it
      // This handles cases where CORS or network issues prevent verification
      if (calcomLink.match(/^https?:\/\/[a-z0-9.-]+\.cal\.(com|dev)\//i)) {
        return NextResponse.json({ valid: true })
      }

      return NextResponse.json({
        valid: false,
        message: 'Failed to verify booking link',
      })
    }
  } catch (error) {
    console.error('Cal.com verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
