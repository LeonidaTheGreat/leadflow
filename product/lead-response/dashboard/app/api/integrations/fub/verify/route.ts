import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      )
    }

    // Validate API key format (FUB API keys are typically 40+ character alphanumeric strings)
    if (apiKey.length < 20) {
      return NextResponse.json(
        { valid: false, message: 'Invalid API key format' },
        { status: 400 }
      )
    }

    // Try to authenticate with FUB API
    try {
      const response = await fetch('https://api.followupboss.com/v1/users', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({
          valid: true,
          user: data.users?.[0] || null,
        })
      } else if (response.status === 401) {
        return NextResponse.json({
          valid: false,
          message: 'Invalid API key. Please check your credentials.',
        })
      } else {
        return NextResponse.json({
          valid: false,
          message: 'Could not verify API key. Please try again.',
        })
      }
    } catch (fetchError) {
      console.error('FUB API error:', fetchError)
      return NextResponse.json({
        valid: false,
        message: 'Failed to connect to Follow Up Boss. Please try again.',
      })
    }
  } catch (error) {
    console.error('FUB verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}