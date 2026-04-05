import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

/**
 * GET /api/admin/pilots
 * Fetch all pilot progress records for the admin dashboard
 * Returns paginated list of pilots with their current stage and metrics
 */
export async function GET(request: NextRequest) {
  const pool = new Pool({ connectionString: process.env.LOCAL_PG_URL })

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const offset = (page - 1) * pageSize

    const result = await pool.query(
      `
      SELECT
        pp.id,
        pp.agent_id,
        pp.stage,
        pp.stage_entered_at,
        pp.stuck_since,
        pp.last_contact_at,
        pp.last_contact_type,
        pp.support_notes,
        pp.pilot_cohort,
        pp.created_at,
        pp.updated_at,
        ra.email,
        ra.first_name,
        ra.last_name,
        EXTRACT(EPOCH FROM (NOW() - pp.stage_entered_at)) / 3600 AS hours_in_stage,
        (NOW() - pp.stage_entered_at) > INTERVAL '24 hours' AND pp.stage != 'paid' AS is_stuck
      FROM pilot_progress pp
      JOIN real_estate_agents ra ON pp.agent_id = ra.id
      ORDER BY pp.stuck_since DESC NULLS LAST,
               (NOW() - pp.stage_entered_at) DESC
      LIMIT $1 OFFSET $2
      `,
      [pageSize, offset]
    )

    const countResult = await pool.query('SELECT COUNT(*) FROM pilot_progress')
    const total = parseInt(countResult.rows[0].count)

    return NextResponse.json({ success: true, pilots: result.rows, total })
  } catch (error) {
    console.error('Failed to fetch pilots:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pilots' },
      { status: 500 }
    )
  } finally {
    await pool.end()
  }
}
