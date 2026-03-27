import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER_US || ''

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken || !accountSid.startsWith('AC')) {
    throw new Error('Twilio credentials not configured')
  }

  return twilio(accountSid, authToken)
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Validate phone number format (10 digits for US/Canada)
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit phone number' },
        { status: 400 }
      )
    }

    const formattedPhone = `+1${cleanPhone}`

    const twilioClient = getTwilioClient()
    const message = await twilioClient.messages.create({
      body: `Hi there! 👋 Your LeadFlow setup is complete. You're all set to auto-respond to leads in under 30 seconds. — LeadFlow AI`,
      from: fromNumber,
      to: formattedPhone,
    })

    if (!message.sid) {
      return NextResponse.json(
        { success: false, message: 'Failed to send SMS' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test SMS sent successfully'
    })

  } catch (error: any) {
    console.error('Send test SMS error:', error)

    if (error.code === 21603) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number format' },
        { status: 400 }
      )
    } else if (error.code === 21608) {
      return NextResponse.json(
        { success: false, message: 'Phone number cannot receive SMS in this region' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send test SMS. Please try again.' },
      { status: 500 }
    )
  }
}
