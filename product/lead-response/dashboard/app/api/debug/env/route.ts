import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  // Return sanitized environment info for debugging
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'NOT SET'
  
  // Try the actual sequences query (flat, no nested joins)
  let sequencesError = null
  let sequencesCount = 0
  try {
    const { data, error } = await supabaseServer
      .from('lead_sequences')
      .select('id')
      .limit(1)
    
    if (error) {
      sequencesError = error.message
    } else {
      sequencesCount = data?.length ?? 0
    }
  } catch (e: any) {
    sequencesError = e.message
  }

  // Try a leads query
  let leadsError = null
  try {
    const { data, error } = await supabaseServer
      .from('leads')
      .select('id')
      .limit(1)
    
    if (error) {
      leadsError = error.message
    }
  } catch (e: any) {
    leadsError = e.message
  }

  return NextResponse.json({
    api_url: apiUrl.substring(0, 80),
    has_api_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    node_env: process.env.NODE_ENV,
    sequences_error: sequencesError,
    sequences_accessible: !sequencesError,
    leads_error: leadsError,
    leads_accessible: !leadsError,
  })
}
