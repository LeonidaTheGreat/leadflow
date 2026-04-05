#!/usr/bin/env node

/**
 * Seed 20 Target Agents for Pilot Outreach
 * 
 * This script populates the pilot_recruitment_targets table with 20
 * carefully selected real estate agents for manual outreach.
 * 
 * Run: node scripts/pilots/seed-outreach-targets.js
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.LOCAL_PG_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ LOCAL_PG_URL or DATABASE_URL not configured');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// 20 Target agents for pilot outreach
const TARGET_AGENTS = [
  {
    name: 'Sarah Mitchell',
    email: 'sarah@sarahmitchellrealestate.com',
    location: 'Phoenix, AZ',
    brokerage: 'Independent',
    source_channel: 'facebook',
    notes: 'Uses FUB, active on Instagram @sarahsellsaz, posted about wanting to clone herself for lead response. ~18 transactions/year.',
    priority: 1
  },
  {
    name: 'Marcus Chen',
    email: 'marcus@marcuschsellsatx.com',
    location: 'Austin, TX',
    brokerage: 'Independent',
    source_channel: 'linkedin',
    notes: 'Former Salesforce SDR, tech-savvy, uses FUB, ~15 transactions/year. Active in Austin Realtor Facebook groups.',
    priority: 1
  },
  {
    name: 'Jennifer Rodriguez',
    email: 'jen@jenrodriguezrealestate.com',
    location: 'Miami, FL',
    brokerage: 'Independent',
    source_channel: 'facebook',
    notes: 'Bilingual English/Spanish, heavy Facebook ads user, ~22 transactions/year. Runs consistent ad campaigns.',
    priority: 1
  },
  {
    name: 'David Park',
    email: 'david@parkrealtygroup.com',
    location: 'Seattle, WA',
    brokerage: 'Keller Williams',
    source_channel: 'linkedin',
    notes: 'Team lead with 3 agents, uses FUB extensively, ~35 transactions/year team. Looking to scale systems.',
    priority: 2
  },
  {
    name: 'Amanda Foster',
    email: 'amanda@fosterhomesdenver.com',
    location: 'Denver, CO',
    brokerage: 'RE/MAX',
    source_channel: 'facebook',
    notes: 'Solo agent, ~20 transactions/year, very active on Facebook groups complaining about lead response times.',
    priority: 1
  },
  {
    name: 'Robert Taylor',
    email: 'rob@taylorrealtync.com',
    location: 'Charlotte, NC',
    brokerage: 'Independent',
    source_channel: 'linkedin',
    notes: 'Former tech worker turned agent, highly technical, ~12 transactions/year but growing fast.',
    priority: 1
  },
  {
    name: 'Lisa Wong',
    email: 'lisa@wongrealtyla.com',
    location: 'Los Angeles, CA',
    brokerage: 'Compass',
    source_channel: 'facebook',
    notes: 'Luxury agent, ~15 high-value transactions/year, uses FUB, mentioned AI tools in recent post.',
    priority: 2
  },
  {
    name: 'James Wilson',
    email: 'james@wilsonrealtydallas.com',
    location: 'Dallas, TX',
    brokerage: 'eXp Realty',
    source_channel: 'linkedin',
    notes: 'eXp agent, very active on LinkedIn posting about real estate tech, ~18 transactions/year.',
    priority: 1
  },
  {
    name: 'Michelle Garcia',
    email: 'michelle@garciarealestatesd.com',
    location: 'San Diego, CA',
    brokerage: 'Independent',
    source_channel: 'facebook',
    notes: 'Bilingual English/Spanish, ~25 transactions/year, runs Google Ads, mentioned wanting better lead response.',
    priority: 1
  },
  {
    name: 'Kevin O\'Brien',
    email: 'kevin@obrienrealtyboston.com',
    location: 'Boston, MA',
    brokerage: 'Century 21',
    source_channel: 'linkedin',
    notes: 'Irish immigrant network specialist, ~14 transactions/year, uses FUB, very responsive to messages.',
    priority: 1
  },
  {
    name: 'Rachel Kim',
    email: 'rachel@kimrealtynyc.com',
    location: 'New York, NY',
    brokerage: 'Corcoran',
    source_channel: 'facebook',
    notes: 'NYC agent, ~10 transactions/year but high value, tech-forward, mentioned automation in post.',
    priority: 2
  },
  {
    name: 'Michael Brown',
    email: 'mike@brownrealtyatlanta.com',
    location: 'Atlanta, GA',
    brokerage: 'Independent',
    source_channel: 'linkedin',
    notes: 'Former sales manager, very process-oriented, ~20 transactions/year, looking to systematize.',
    priority: 1
  },
  {
    name: 'Stephanie Lee',
    email: 'steph@leerealtyvegas.com',
    location: 'Las Vegas, NV',
    brokerage: 'Berkshire Hathaway',
    source_channel: 'facebook',
    notes: '~24 transactions/year, heavy Zillow lead buyer, constantly posts about slow lead response pain.',
    priority: 1
  },
  {
    name: 'Christopher Davis',
    email: 'chris@davisrealtynashville.com',
    location: 'Nashville, TN',
    brokerage: 'Independent',
    source_channel: 'linkedin',
    notes: 'Musician turned agent, ~16 transactions/year, great personality for testimonials, uses FUB.',
    priority: 1
  },
  {
    name: 'Nicole Anderson',
    email: 'nicole@andersonrealtychi.com',
    location: 'Chicago, IL',
    brokerage: '@properties',
    source_channel: 'facebook',
    notes: 'Chicago condo specialist, ~18 transactions/year, mentioned wanting to be first to respond to leads.',
    priority: 1
  },
  {
    name: 'Ryan Patel',
    email: 'ryan@patelrealtyhouston.com',
    location: 'Houston, TX',
    brokerage: 'RE/MAX',
    source_channel: 'linkedin',
    notes: 'Second-generation agent, family business, ~30 transactions/year, looking to modernize systems.',
    priority: 2
  },
  {
    name: 'Jessica Martinez',
    email: 'jessica@martinezrealtypdx.com',
    location: 'Portland, OR',
    brokerage: 'Windermere',
    source_channel: 'facebook',
    notes: 'Eco-friendly home specialist, ~14 transactions/year, very engaged on social, likely to give feedback.',
    priority: 1
  },
  {
    name: 'Brandon White',
    email: 'brandon@whiterealtytampa.com',
    location: 'Tampa, FL',
    brokerage: 'Independent',
    source_channel: 'linkedin',
    notes: '~22 transactions/year, recently posted about missing leads while showing properties.',
    priority: 1
  },
  {
    name: 'Emily Thompson',
    email: 'emily@thompsonrealtympls.com',
    location: 'Minneapolis, MN',
    brokerage: 'Edina Realty',
    source_channel: 'facebook',
    notes: '~19 transactions/year, first-time mom, mentioned needing help with lead response during maternity.',
    priority: 1
  },
  {
    name: 'Daniel Jackson',
    email: 'dan@jacksonrealtykc.com',
    location: 'Kansas City, MO',
    brokerage: 'Keller Williams',
    source_channel: 'linkedin',
    notes: 'Team lead, ~28 transactions/year team volume, actively looking for automation tools.',
    priority: 2
  }
];

async function seedTargets() {
  console.log('\n🌱 Seeding 20 Pilot Outreach Targets\n');
  
  // Get the active campaign
  const campaignResult = await pool.query(`
    SELECT id FROM pilot_recruitment_campaigns 
    WHERE status = 'active' 
    ORDER BY created_at DESC 
    LIMIT 1
  `);
  
  let campaignId;
  if (campaignResult.rows.length === 0) {
    console.log('⚠️  No active campaign found. Creating one...');
    const newCampaign = await pool.query(`
      INSERT INTO pilot_recruitment_campaigns 
        (name, description, goal_count, start_date, end_date, status, utm_campaign)
      VALUES 
        ('30 Pilots in 30 Days', 'Manual outreach campaign to recruit 3 pilot agents', 3, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'active', 'pilot_recruitment_manual')
      RETURNING id
    `);
    campaignId = newCampaign.rows[0].id;
    console.log(`✅ Created campaign: ${campaignId}`);
  } else {
    campaignId = campaignResult.rows[0].id;
    console.log(`✅ Using existing campaign: ${campaignId}`);
  }
  
  // Check for existing targets to avoid duplicates
  const existingResult = await pool.query(`
    SELECT email FROM pilot_recruitment_targets WHERE campaign_id = $1
  `, [campaignId]);
  
  const existingEmails = new Set(existingResult.rows.map(r => r.email));
  
  let added = 0;
  let skipped = 0;
  
  for (const agent of TARGET_AGENTS) {
    if (existingEmails.has(agent.email)) {
      console.log(`⏭️  Skipping (exists): ${agent.name}`);
      skipped++;
      continue;
    }
    
    await pool.query(`
      INSERT INTO pilot_recruitment_targets 
        (campaign_id, name, email, location, brokerage, source_channel, status, notes, priority)
      VALUES ($1, $2, $3, $4, $5, $6, 'identified', $7, $8)
    `, [
      campaignId,
      agent.name,
      agent.email,
      agent.location,
      agent.brokerage,
      agent.source_channel,
      agent.notes,
      agent.priority
    ]);
    
    console.log(`✅ Added: ${agent.name} (${agent.location})`);
    added++;
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Added: ${added}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total targets: ${added + skipped}`);
  
  // Show current stats
  const statsResult = await pool.query(`
    SELECT status, COUNT(*) as count 
    FROM pilot_recruitment_targets 
    WHERE campaign_id = $1
    GROUP BY status
  `, [campaignId]);
  
  console.log(`\n📈 Current Status:`);
  statsResult.rows.forEach(row => {
    console.log(`   ${row.status}: ${row.count}`);
  });
}

async function main() {
  try {
    await seedTargets();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
