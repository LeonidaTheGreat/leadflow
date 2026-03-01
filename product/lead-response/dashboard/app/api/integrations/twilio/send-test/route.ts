import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID || ''
const authToken = process.env.TWILIO_AUTH_TOKEN || ''
const fromNumber = process.env.TWILIO_PHONE_NUMBER || ''

const twilioClient = twilio(accountSid, authToken)

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, agentName } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Validate phone number format (must be 10 digits for US)
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      )
    }

    // Format phone number with +1 country code
    const formattedPhone = `+1${cleanPhone}`

    // Send test SMS
    const message = await twilioClient.messages.create({
      body: `Hi! This is a test message from LeadFlow AI. Your SMS integration is working. Test sent by: ${agentName || 'Agent'}`,
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
      message: 'Test SMS sent successfully',
      messageSid: message.sid,
    })
  } catch (error: any) {
    console.error('Twilio error:', error)

    // Handle specific Twilio errors
    if (error.code === 21603) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number format' },
        { status: 400 }
      )
    } else if (error.code === 21608) {
      return NextResponse.json(
        { success: false, message: 'Phone number is not in a valid SMS-capable region' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Failed to send test SMS' },
      { status: 500 }
    )
  }
}
