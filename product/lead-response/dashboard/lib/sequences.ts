/**
 * UC-8: Follow-up Sequences - State Management
 * Helper functions for sequence control
 */

import { createClient } from '@supabase/supabase-js'
import type { LeadSequence, SequenceStatus, SequenceType, CreateSequenceParams, UpdateSequenceParams } from './types/sequences'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Create a new sequence for a lead
 */
export async function createSequence(params: CreateSequenceParams): Promise<LeadSequence | null> {
  const { data, error } = await supabase
    .from('lead_sequences')
    .insert({
      lead_id: params.lead_id,
      sequence_type: params.sequence_type,
      trigger_reason: params.trigger_reason,
      next_send_at: params.next_send_at || getInitialSendTime(params.sequence_type),
      status: 'active',
      step: 1,
      total_messages_sent: 0,
      max_messages: 3,
      metadata: params.metadata || {},
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Error creating sequence:', error)
    return null
  }

  return data as LeadSequence
}

/**
 * Pause a sequence (manually or on lead response)
 */
export async function pauseSequence(sequenceId: string): Promise<boolean> {
  const { error } = await supabase
    .from('lead_sequences')
    .update({
      status: 'paused',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sequenceId)
    .eq('status', 'active') // Only pause active sequences

  if (error) {
    console.error('❌ Error pausing sequence:', error)
    return false
  }

  return true
}

/**
 * Pause all active sequences for a lead
 */
export async function pauseAllSequences(leadId: string): Promise<number> {
  const { data, error } = await supabase
    .from('lead_sequences')
    .update({
      status: 'paused',
      updated_at: new Date().toISOString(),
    })
    .eq('lead_id', leadId)
    .eq('status', 'active')
    .select()

  if (error) {
    console.error('❌ Error pausing sequences:', error)
    return 0
  }

  return data?.length || 0
}

/**
 * Resume a paused sequence
 */
export async function resumeSequence(sequenceId: string, nextSendAt?: string): Promise<boolean> {
  const { error } = await supabase
    .from('lead_sequences')
    .update({
      status: 'active',
      next_send_at: nextSendAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sequenceId)
    .eq('status', 'paused') // Only resume paused sequences
    .lt('total_messages_sent', 3) // Don't resume completed sequences

  if (error) {
    console.error('❌ Error resuming sequence:', error)
    return false
  }

  return true
}

/**
 * Complete a sequence (after max messages or manual completion)
 */
export async function completeSequence(sequenceId: string): Promise<boolean> {
  const { error } = await supabase
    .from('lead_sequences')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sequenceId)

  if (error) {
    console.error('❌ Error completing sequence:', error)
    return false
  }

  return true
}

/**
 * Get all sequences for a lead
 */
export async function getLeadSequences(leadId: string): Promise<LeadSequence[]> {
  const { data, error } = await supabase
    .from('lead_sequences')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error fetching sequences:', error)
    return []
  }

  return data as LeadSequence[]
}

/**
 * Get active sequences for a lead
 */
export async function getActiveSequences(leadId: string): Promise<LeadSequence[]> {
  const { data, error } = await supabase
    .from('lead_sequences')
    .select('*')
    .eq('lead_id', leadId)
    .eq('status', 'active')
    .order('next_send_at', { ascending: true })

  if (error) {
    console.error('❌ Error fetching active sequences:', error)
    return []
  }

  return data as LeadSequence[]
}

/**
 * Update sequence state after sending
 */
export async function recordSequenceSent(sequenceId: string, sequenceType: SequenceType): Promise<boolean> {
  // Get current sequence
  const { data: sequence, error: fetchError } = await supabase
    .from('lead_sequences')
    .select('*')
    .eq('id', sequenceId)
    .single()

  if (fetchError || !sequence) {
    console.error('❌ Error fetching sequence:', fetchError)
    return false
  }

  const nextStep = sequence.step + 1
  const totalSent = sequence.total_messages_sent + 1
  const newStatus: SequenceStatus = totalSent >= 3 ? 'completed' : 'active'
  const nextSendAt = newStatus === 'active' 
    ? getNextSendTime(sequenceType, nextStep)
    : null

  const { error } = await supabase
    .from('lead_sequences')
    .update({
      step: nextStep,
      total_messages_sent: totalSent,
      last_sent_at: new Date().toISOString(),
      next_send_at: nextSendAt,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sequenceId)

  if (error) {
    console.error('❌ Error recording sequence sent:', error)
    return false
  }

  return true
}

/**
 * Calculate initial send time based on sequence type
 */
function getInitialSendTime(sequenceType: SequenceType): string {
  const now = new Date()
  
  switch (sequenceType) {
    case 'no_response':
      now.setHours(now.getHours() + 24)
      break
    case 'post_viewing':
      now.setHours(now.getHours() + 4)
      break
    case 'no_show':
      now.setMinutes(now.getMinutes() + 30)
      break
    case 'nurture':
      now.setDate(now.getDate() + 7)
      break
  }
  
  return now.toISOString()
}

/**
 * Calculate next send time based on sequence type and step
 */
function getNextSendTime(sequenceType: SequenceType, step: number): string {
  const now = new Date()
  
  switch (sequenceType) {
    case 'no_response':
      now.setHours(now.getHours() + 24)
      break
    case 'post_viewing':
      now.setHours(now.getHours() + 4)
      break
    case 'no_show':
      now.setMinutes(now.getMinutes() + 30)
      break
    case 'nurture':
      now.setDate(now.getDate() + 7)
      break
  }
  
  return now.toISOString()
}
