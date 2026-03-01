/**
 * UC-8: Follow-up Sequences Types
 * Database schema defined in: supabase/migrations/003_lead_sequences.sql
 */

export type SequenceType = 
  | 'no_response'      // 24h no response after initial contact
  | 'post_viewing'     // 4h after booking/showing
  | 'no_show'          // 30m after missed appointment
  | 'nurture'          // 7d general nurture sequence

export type SequenceStatus = 
  | 'active'           // Currently running
  | 'paused'           // Lead responded, sequence paused
  | 'completed'        // Max messages sent (step >= 3)

export interface LeadSequence {
  id: string
  lead_id: string
  sequence_type: SequenceType
  step: number
  status: SequenceStatus
  last_sent_at: string | null
  next_send_at: string | null
  total_messages_sent: number
  max_messages: number
  trigger_reason: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreateSequenceParams {
  lead_id: string
  sequence_type: SequenceType
  trigger_reason?: string
  next_send_at?: string
  metadata?: Record<string, any>
}

export interface UpdateSequenceParams {
  status?: SequenceStatus
  step?: number
  last_sent_at?: string
  next_send_at?: string
  total_messages_sent?: number
}
