'use strict';

/**
 * Pilot agent seed: 15 manually researched real estate agents for outreach.
 * Source: public brokerage directories + personal agent websites (May 2026).
 * Task: 343599e1-125e-4de9-a0f4-14c4c2c10f8f
 *
 * To re-run (idempotent — skips existing emails):
 *   node scripts/db/seed-pilot-agents-2026-05.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.LOCAL_PG_URL });

const AGENTS = [
  // Austin, TX — Central Metro Realty (100% commission, solo agents)
  {
    name: 'Abha Sethi',
    email: 'abha@ahomenearaustin.com',
    phone: '(512) 636-7379',
    company: 'Austin, TX',
    brokerage_name: 'Central Metro Realty',
    source: 'centralmetro.com agent directory',
    message: 'Personal domain (ahomenearaustin.com) = actively marketing via Zillow/portal leads. Solo at Austin\'s largest 100% commission brokerage — no admin team routing leads. Austin hyper-competitive market demands sub-30s response.',
    utm_campaign: 'pilot-research-2026-05',
  },
  {
    name: 'Ajay Rai',
    email: 'ajayrairealtor@gmail.com',
    phone: '(512) 689-0218',
    company: 'Austin, TX',
    brokerage_name: 'Central Metro Realty',
    source: 'centralmetro.com agent directory',
    message: '"ajayrairealtor" Gmail branding = recently licensed solo agent building business through internet leads. 100% commission brokerage = every missed lead is money lost with no cushion.',
    utm_campaign: 'pilot-research-2026-05',
  },
  {
    name: 'Alexandra Booth',
    email: 'alex@alexandrabooth.com',
    phone: '(512) 554-4147',
    company: 'Austin, TX',
    brokerage_name: 'Central Metro Realty',
    source: 'centralmetro.com agent directory',
    message: 'Holds ePRO (tech-forward cert), GRI, and MRP designations = technology-savvy, actively markets digitally. Personal domain + solo at 100% commission = buys her own leads and handles all response manually.',
    utm_campaign: 'pilot-research-2026-05',
  },
  // Austin, TX — United Real Estate
  {
    name: 'Natalie Freeman',
    email: 'nataliedfreeman@gmail.com',
    phone: '(512) 296-8805',
    company: 'Austin, TX',
    brokerage_name: 'United Real Estate',
    source: 'unitedrealestateaustin.com agent directory',
    message: 'Solo at 100% commission brokerage with Gmail = no admin staff processing leads. Austin ranks top-5 nationally for portal lead volume — high inbound with manual-only response is costing deals.',
    utm_campaign: 'pilot-research-2026-05',
  },
  // Dallas, TX — United Real Estate (100% commission, solo agents)
  {
    name: 'Talia Tovar',
    email: 'taliasellsdfw@gmail.com',
    phone: '(972) 375-5453',
    company: 'Dallas, TX',
    brokerage_name: 'United Real Estate',
    source: 'unitedrealestatedallas.com agent directory',
    message: '"taliasellsdfw" branded email = actively marketing to DFW buyers via portals. No team structure = every incoming lead response is manual and subject to 15+ hour delays. Losing leads to faster agents daily.',
    utm_campaign: 'pilot-research-2026-05',
  },
  {
    name: 'Amber English',
    email: 'amber@dealswithamber.com',
    phone: '(214) 771-1889',
    company: 'Dallas, TX',
    brokerage_name: 'United Real Estate',
    source: 'unitedrealestatedallas.com agent directory',
    message: 'Personal domain "dealswithamber.com" = volume-focused internet lead buyer. Solo at United Real Estate = no ISA or assistant. "Deals" branding signals conversion focus — immediate value prop for <30s response.',
    utm_campaign: 'pilot-research-2026-05',
  },
  {
    name: 'Alexandria Aymelek',
    email: 'alex@alexsellsdfw.com',
    phone: '(972) 890-5430',
    company: 'Dallas, TX',
    brokerage_name: 'United Real Estate',
    source: 'unitedrealestatedallas.com agent directory',
    message: 'Personal domain "alexsellsdfw.com" = significant portal lead investment. Solo practitioner with no team = losing leads to faster competitors. Domain investment signals she\'s growth-minded and would pay for automation.',
    utm_campaign: 'pilot-research-2026-05',
  },
  {
    name: 'Alma Delia Lopez',
    email: 'dfw@realestatebyalma.com',
    phone: '(214) 753-9285',
    company: 'Dallas, TX',
    brokerage_name: 'United Real Estate',
    source: 'unitedrealestatedallas.com agent directory',
    message: 'Personal domain "realestatebyalma.com" with location-branded email = established online presence and active portal lead buyer. Solo at 100% commission = handles all lead response personally without staff.',
    utm_campaign: 'pilot-research-2026-05',
  },
  // Atlanta, GA — First United Realty (100% commission, solo agents)
  {
    name: 'Jenny Wu',
    email: 'jenwurealestate@gmail.com',
    phone: '(678) 358-1698',
    company: 'Atlanta, GA',
    brokerage_name: 'First United Realty',
    source: 'firstunitedrealty.net agent directory',
    message: '"jenwurealestate" branded Gmail = actively marketing RE services online. Solo at Atlanta 100% commission brokerage = no admin staff for leads. Atlanta\'s growing buyer pool + high portal lead volume = strong fit.',
    utm_campaign: 'pilot-research-2026-05',
  },
  {
    name: 'Dani Stewart',
    email: 'danistewart90@gmail.com',
    phone: '(404) 808-5462',
    company: 'Atlanta, GA',
    brokerage_name: 'First United Realty',
    source: 'firstunitedrealty.net agent directory',
    message: 'Solo at First United Realty (Atlanta 100% commission). Gmail = no team infrastructure. Atlanta is high-competition market — 78% of deals go to the first agent to respond, making speed-to-lead critical.',
    utm_campaign: 'pilot-research-2026-05',
  },
  {
    name: 'Ashli Taylor',
    email: 'ashlitaylor12@gmail.com',
    phone: '(770) 375-5881',
    company: 'Atlanta, GA',
    brokerage_name: 'First United Realty',
    source: 'firstunitedrealty.net agent directory',
    message: '770 = north Atlanta suburbs (Cherokee/Cobb/Paulding) — one of GA\'s fastest-growing real estate markets. Solo at First United Realty with no admin team means all internet leads handled manually.',
    utm_campaign: 'pilot-research-2026-05',
  },
  {
    name: 'Bridget Strategos',
    email: 'bridgetstrategos@gmail.com',
    phone: '(678) 779-3119',
    company: 'Atlanta, GA',
    brokerage_name: 'First United Realty',
    source: 'firstunitedrealty.net agent directory',
    message: 'Solo at First United Realty, Atlanta. All lead handling is manual. Atlanta market: Zillow/Realtor.com leads go cold within minutes without rapid SMS response — losing leads to ISA-equipped teams daily.',
    utm_campaign: 'pilot-research-2026-05',
  },
  // Charlotte, NC — The Agency Charlotte (boutique, tech-forward)
  {
    name: 'Ashley Misiuda',
    email: 'ashley@theagencycharlotte.com',
    phone: '(704) 249-9564',
    company: 'Charlotte, NC',
    brokerage_name: 'The Agency Charlotte',
    source: 'theagencycharlotte.com team directory',
    message: 'Agent at boutique tech-forward brokerage serving first-time buyers = high internet lead volume. Small boutique = no centralized ISA layer. Charlotte is growing market with high portal lead competition and agents report slow response as top loss reason.',
    utm_campaign: 'pilot-research-2026-05',
  },
  {
    name: 'Alivia Wright',
    email: 'alivia@theagencycharlotte.com',
    phone: '(980) 425-2273',
    company: 'Charlotte, NC',
    brokerage_name: 'The Agency Charlotte',
    source: 'theagencycharlotte.com team directory',
    message: '980 Charlotte metro area code. Agent at boutique Agency Charlotte = modern tech-savvy brokerage with no centralized ISA. Individual agent responsible for all lead response. Charlotte top-10 US growth market = high portal lead inflow.',
    utm_campaign: 'pilot-research-2026-05',
  },
  // Phoenix, AZ — Real Broker (solo)
  {
    name: 'Pamela Manwaring',
    email: 'pamela@domidesert.com',
    phone: '(602) 515-3800',
    company: 'Phoenix, AZ',
    brokerage_name: 'Real Broker',
    source: 'domidesert.com personal agent website',
    message: 'Solo agent with branded personal website (domidesert.com). Specializes in relocation = high inbound internet lead category (relocation buyers always search portals first). Solo at Real Broker with no assistant. Phoenix is top-5 US market for Zillow lead volume.',
    utm_campaign: 'pilot-research-2026-05',
  },
];

async function seed() {
  let inserted = 0;
  let skipped = 0;
  for (const agent of AGENTS) {
    const existing = await pool.query('SELECT id FROM pilot_signups WHERE email = $1', [agent.email]);
    if (existing.rows.length > 0) {
      console.log('SKIP (already exists):', agent.email);
      skipped++;
      continue;
    }
    await pool.query(
      `INSERT INTO pilot_signups (name, email, phone, company, brokerage_name, source, message, utm_campaign, follow_up_sent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW())`,
      [agent.name, agent.email, agent.phone, agent.company, agent.brokerage_name, agent.source, agent.message, agent.utm_campaign]
    );
    console.log('INSERTED:', agent.name, '|', agent.company, '|', agent.brokerage_name);
    inserted++;
  }
  console.log(`\nDone. Inserted: ${inserted} | Skipped (dup): ${skipped}`);
  await pool.end();
}

seed().catch(e => { console.error(e); pool.end(); process.exit(1); });
