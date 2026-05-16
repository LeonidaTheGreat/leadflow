import type { Agent, AgentSettings, Market } from '@/lib/types'

export interface RealEstateAgentRow {
  id: string
  email: string
  first_name: string
  last_name: string
  phone_number: string | null
  state: string | null
  status: string | null
  timezone: string | null
  satisfaction_ping_enabled?: boolean
  created_at: string
  updated_at: string
  [key: string]: unknown
}

const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  auto_respond: true,
  response_delay_seconds: 30,
  human_handoff_threshold: 0.7,
  booking_enabled: true,
}

const CA_PROVINCES = new Set([
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland',
  'Nova Scotia', 'Northwest Territories', 'Nunavut', 'Ontario',
  'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon',
])

function deriveMarket(state: string | null): Market {
  if (state && CA_PROVINCES.has(state)) return 'ca-ontario'
  return 'us-national'
}

export function realEstateAgentRowToAgent(row: RealEstateAgentRow): Agent {
  return {
    id: row.id,
    email: row.email,
    name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
    phone: row.phone_number || null,
    fub_id: null,
    calcom_username: null,
    timezone: row.timezone || 'America/New_York',
    market: deriveMarket(row.state),
    settings: DEFAULT_AGENT_SETTINGS,
    is_active: row.status === 'active',
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
