#!/usr/bin/env ts-node

/**
 * ANALYTICS DATA SEEDER
 * Generates sample analytics data for dashboard testing.
 * 
 * Usage: npx ts-node scripts/seed-analytics-data.ts
 */

import { supabaseAdmin } from '../lib/db'

interface SeedOptions {
  daysBack: number
  leadsPerDay: number
  messagesPerLead: number
  conversionRate: number
}

const DEFAULT_OPTIONS: SeedOptions = {
  daysBack: 30,
  leadsPerDay: 5,
  messagesPerLead: 3,
  conversionRate: 0.15, // 15%
}

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedLeads(options: SeedOptions) {
  const leads = []
  const statuses = ['new', 'qualified', 'nurturing', 'responded', 'appointment']

  for (let d = 0; d < options.daysBack; d++) {
    const date = new Date()
    date.setDate(date.getDate() - d)
    date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0)

    for (let i = 0; i < options.leadsPerDay; i++) {
      const leadId = `lead-${d}-${i}`
      const hasResponded = Math.random() < 0.3

      leads.push({
        id: leadId,
        phone: `+1555${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
        email: `lead${d}-${i}@example.com`,
        name: `Lead ${d}-${i}`,
        source: ['fub', 'web', 'phone'].at(Math.floor(Math.random() * 3)),
        source_metadata: {},
        status: statuses[Math.floor(Math.random() * statuses.length)],
        market: 'ca-ontario',
        consent_sms: true,
        consent_email: Math.random() > 0.3,
        dnc: false,
        created_at: date.toISOString(),
        updated_at: date.toISOString(),
        responded_at: hasResponded ? new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString() : null,
      })
    }
  }

  // Insert in batches
  const batchSize = 100
  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, Math.min(i + batchSize, leads.length))
    const { error } = await supabaseAdmin.from('leads').insert(batch).select()

    if (error) {
      console.error('Error inserting leads:', error)
    } else {
      console.log(`✓ Inserted ${batch.length} leads`)
    }
  }

  return leads
}

async function seedMessages(leads: any[], options: SeedOptions) {
  const messages = []
  const statuses = ['sent', 'delivered', 'failed', 'pending']

  for (const lead of leads) {
    const leadCreated = new Date(lead.created_at)
    const msgCount = Math.floor(Math.random() * options.messagesPerLead) + 1

    for (let i = 0; i < msgCount; i++) {
      const msgTime = new Date(leadCreated.getTime() + (i + 1) * 24 * 60 * 60 * 1000 + Math.random() * 12 * 60 * 60 * 1000)

      // Outbound message
      messages.push({
        lead_id: lead.id,
        direction: 'outbound',
        channel: 'sms',
        message_body: `Hi ${lead.name}, this is a test message ${i + 1}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        ai_generated: true,
        ai_confidence: Math.random() * 100,
        created_at: msgTime.toISOString(),
      })

      // Inbound response (30% chance)
      if (Math.random() < 0.3) {
        const responseTime = new Date(msgTime.getTime() + (Math.random() * 4 + 1) * 60 * 60 * 1000)
        messages.push({
          lead_id: lead.id,
          direction: 'inbound',
          channel: 'sms',
          message_body: 'Yes, interested!',
          status: 'delivered',
          ai_generated: false,
          created_at: responseTime.toISOString(),
        })
      }
    }
  }

  // Insert in batches
  const batchSize = 100
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, Math.min(i + batchSize, messages.length))
    const { error } = await supabaseAdmin.from('messages').insert(batch).select()

    if (error) {
      console.error('Error inserting messages:', error)
    } else {
      console.log(`✓ Inserted ${batch.length} messages`)
    }
  }

  return messages
}

async function seedBookings(leads: any[]) {
  const bookings = []

  // ~15% of leads book
  const convertedLeads = leads.filter(() => Math.random() < 0.15)

  for (const lead of convertedLeads) {
    const leadCreated = new Date(lead.created_at)
    const bookingTime = new Date(leadCreated.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)

    bookings.push({
      lead_id: lead.id,
      start_time: new Date(bookingTime.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(bookingTime.getTime() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      status: ['confirmed', 'completed'].at(Math.floor(Math.random() * 2)) || 'confirmed',
      created_at: bookingTime.toISOString(),
      updated_at: bookingTime.toISOString(),
    })
  }

  // Insert in batches
  const batchSize = 50
  for (let i = 0; i < bookings.length; i += batchSize) {
    const batch = bookings.slice(i, Math.min(i + batchSize, bookings.length))
    const { error } = await supabaseAdmin.from('bookings').insert(batch).select()

    if (error) {
      console.error('Error inserting bookings:', error)
    } else {
      console.log(`✓ Inserted ${batch.length} bookings`)
    }
  }

  return bookings
}

// ============================================
// MAIN
// ============================================

async function main() {
  const options = {
    ...DEFAULT_OPTIONS,
  }

  console.log('🌱 Seeding analytics data...')
  console.log(`Options:`)
  console.log(`  - Days back: ${options.daysBack}`)
  console.log(`  - Leads per day: ${options.leadsPerDay}`)
  console.log(`  - Messages per lead: ${options.messagesPerLead}`)
  console.log(`  - Conversion rate: ${options.conversionRate * 100}%`)
  console.log()

  try {
    // Seed leads
    console.log('1️⃣  Seeding leads...')
    const leads = await seedLeads(options)
    console.log(`   Total leads: ${leads.length}`)
    console.log()

    // Seed messages
    console.log('2️⃣  Seeding messages...')
    const messages = await seedMessages(leads, options)
    console.log(`   Total messages: ${messages.length}`)
    console.log()

    // Seed bookings
    console.log('3️⃣  Seeding bookings...')
    const bookings = await seedBookings(leads)
    console.log(`   Total bookings: ${bookings.length}`)
    console.log()

    console.log('✅ Seeding complete!')
    console.log()
    console.log('📊 Analytics dashboard is now ready for testing.')
    console.log('Navigate to: /dashboard/analytics')
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    process.exit(1)
  }
}

main()
