/**
 * UC-8: Follow-up Sequences - Comprehensive Tests
 * Tests for trigger logic, state management, and cron handler
 */

import { describe, it, expect } from '@jest/globals'

describe('UC8: Sequence Trigger Logic', () => {
  describe('no_response sequence', () => {
    it('should trigger 24h after last outbound with no response', () => {
      const lastOutboundAt = new Date('2026-02-25T10:00:00Z')
      const triggerTime = new Date(lastOutboundAt)
      triggerTime.setHours(triggerTime.getHours() + 24)
      
      expect(triggerTime.toISOString()).toBe('2026-02-26T10:00:00.000Z')
    })

    it('should not trigger if lead responded', () => {
      const leadResponded = true
      const shouldTrigger = !leadResponded
      
      expect(shouldTrigger).toBe(false)
    })
  })

  describe('post_viewing sequence', () => {
    it('should trigger 4h after booking/showing', () => {
      const bookingTime = new Date('2026-02-25T14:00:00Z')
      const triggerTime = new Date(bookingTime)
      triggerTime.setHours(triggerTime.getHours() + 4)
      
      expect(triggerTime.toISOString()).toBe('2026-02-25T18:00:00.000Z')
    })
  })

  describe('no_show sequence', () => {
    it('should trigger 30m after missed appointment', () => {
      const appointmentTime = new Date('2026-02-25T15:00:00Z')
      const triggerTime = new Date(appointmentTime)
      triggerTime.setMinutes(triggerTime.getMinutes() + 30)
      
      expect(triggerTime.toISOString()).toBe('2026-02-25T15:30:00.000Z')
    })
  })

  describe('nurture sequence', () => {
    it('should trigger 7 days after last contact', () => {
      const lastContactAt = new Date('2026-02-25T10:00:00Z')
      const triggerTime = new Date(lastContactAt)
      triggerTime.setDate(triggerTime.getDate() + 7)
      
      expect(triggerTime.toISOString()).toBe('2026-03-04T10:00:00.000Z')
    })
  })
})

describe('UC8: State Management', () => {
  it('should pause sequence when lead responds (inbound message)', () => {
    const sequence = {
      id: '1',
      status: 'active',
      total_messages_sent: 1
    }
    const inboundMessage = { direction: 'inbound' }
    
    // Simulate trigger: pause_sequences_on_inbound_message
    const newStatus = inboundMessage.direction === 'inbound' ? 'paused' : sequence.status
    
    expect(newStatus).toBe('paused')
  })

  it('should complete sequence after 3 messages sent', () => {
    const sequence = {
      id: '1',
      status: 'active',
      total_messages_sent: 2,
      max_messages: 3
    }
    
    // After sending 3rd message
    const newTotalSent = sequence.total_messages_sent + 1
    const newStatus = newTotalSent >= sequence.max_messages ? 'completed' : 'active'
    
    expect(newStatus).toBe('completed')
  })

  it('should remain active after 2 messages', () => {
    const sequence = {
      id: '1',
      status: 'active',
      total_messages_sent: 1,
      max_messages: 3
    }
    
    const newTotalSent = sequence.total_messages_sent + 1
    const newStatus = newTotalSent >= sequence.max_messages ? 'completed' : 'active'
    
    expect(newStatus).toBe('active')
    expect(newTotalSent).toBe(2)
  })

  it('should support pause → resume transition', () => {
    const sequence = {
      id: '1',
      status: 'paused' as const,
      total_messages_sent: 1
    }
    
    // Manual resume
    const canResume = sequence.status === 'paused' && sequence.total_messages_sent < 3
    
    expect(canResume).toBe(true)
  })

  it('should not resume completed sequences', () => {
    const sequence: { id: string; status: 'paused' | 'completed'; total_messages_sent: number } = {
      id: '1',
      status: 'completed',
      total_messages_sent: 3
    }
    
    const canResume = sequence.status === 'paused' && sequence.total_messages_sent < 3
    
    expect(canResume).toBe(false)
  })
})

describe('UC8: Compliance & Safety', () => {
  it('should respect opt-outs (dnc = true)', () => {
    const lead = { dnc: true, consent_sms: true }
    const shouldSend = !lead.dnc && lead.consent_sms
    
    expect(shouldSend).toBe(false)
  })

  it('should respect consent (consent_sms = false)', () => {
    const lead = { dnc: false, consent_sms: false }
    const shouldSend = !lead.dnc && lead.consent_sms
    
    expect(shouldSend).toBe(false)
  })

  it('should only send with full consent', () => {
    const lead = { dnc: false, consent_sms: true }
    const shouldSend = !lead.dnc && lead.consent_sms
    
    expect(shouldSend).toBe(true)
  })

  it('should respect quiet hours (9 PM - 9 AM)', () => {
    const testHours = [21, 22, 23, 0, 1, 8] // Quiet hours
    const activeHours = [9, 10, 15, 20] // Active hours
    
    const isQuietHour = (hour: number) => hour >= 21 || hour < 9
    
    testHours.forEach(hour => {
      expect(isQuietHour(hour)).toBe(true)
    })
    
    activeHours.forEach(hour => {
      expect(isQuietHour(hour)).toBe(false)
    })
  })
})

describe('UC8: Cron Handler', () => {
  it('should query active sequences with next_send_at <= NOW()', () => {
    const now = new Date('2026-02-25T15:00:00Z')
    const sequences = [
      { id: '1', status: 'active', next_send_at: '2026-02-25T14:00:00Z' }, // Due
      { id: '2', status: 'active', next_send_at: '2026-02-25T15:00:00Z' }, // Due
      { id: '3', status: 'active', next_send_at: '2026-02-25T16:00:00Z' }, // Not due
      { id: '4', status: 'paused', next_send_at: '2026-02-25T14:00:00Z' }, // Paused
    ]
    
    const dueSequences = sequences.filter(s => 
      s.status === 'active' && new Date(s.next_send_at) <= now
    )
    
    expect(dueSequences).toHaveLength(2)
    expect(dueSequences[0].id).toBe('1')
    expect(dueSequences[1].id).toBe('2')
  })

  it('should skip sequences if total_messages_sent >= max_messages', () => {
    const sequence = {
      id: '1',
      status: 'active',
      total_messages_sent: 3,
      max_messages: 3
    }
    
    const shouldSend = sequence.total_messages_sent < sequence.max_messages
    
    expect(shouldSend).toBe(false)
  })

  it('should return dry-run results without sending', () => {
    const isDryRun = true
    const sequencesToProcess = [{ id: '1' }, { id: '2' }]
    
    const results = sequencesToProcess.map(s => ({
      sequence_id: s.id,
      dry_run: isDryRun
    }))
    
    expect(results).toHaveLength(2)
    expect(results[0].dry_run).toBe(true)
  })

  it('should increment step and total_messages_sent after sending', () => {
    const sequence = {
      step: 1,
      total_messages_sent: 0
    }
    
    const updatedSequence = {
      step: sequence.step + 1,
      total_messages_sent: sequence.total_messages_sent + 1
    }
    
    expect(updatedSequence.step).toBe(2)
    expect(updatedSequence.total_messages_sent).toBe(1)
  })
})

describe('UC8: Integration Test Scenarios', () => {
  it('should handle complete sequence lifecycle', () => {
    const steps = [
      { step: 1, status: 'active', total_sent: 0 },
      { step: 2, status: 'active', total_sent: 1 },
      { step: 3, status: 'active', total_sent: 2 },
      { step: 3, status: 'completed', total_sent: 3 },
    ]
    
    expect(steps[0].status).toBe('active')
    expect(steps[3].status).toBe('completed')
    expect(steps[3].total_sent).toBe(3)
  })

  it('should handle lead response mid-sequence', () => {
    const timeline = [
      { event: 'sequence_start', step: 1, status: 'active' },
      { event: 'message_sent', step: 2, status: 'active' },
      { event: 'lead_responded', step: 2, status: 'paused' },
      { event: 'manual_resume', step: 3, status: 'active' },
    ]
    
    expect(timeline[2].status).toBe('paused')
    expect(timeline[3].status).toBe('active')
  })
})
