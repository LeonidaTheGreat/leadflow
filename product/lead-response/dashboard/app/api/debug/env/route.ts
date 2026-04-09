import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    fub_system_name: process.env.FUB_SYSTEM_NAME || 'NOT_SET',
    fub_system_key_set: !!process.env.FUB_SYSTEM_KEY,
    fub_api_key_set: !!process.env.FUB_API_KEY,
    fub_api_key_prefix: process.env.FUB_API_KEY?.substring(0, 10) || 'NOT_SET',
  })
}
