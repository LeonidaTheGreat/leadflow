#!/usr/bin/env node

/**
 * Pilot Outreach Manager
 * 
 * Manages manual outreach to 20 target agents for 3 pilot spots.
 * Offers 30-day free trial with concierge (white-glove) setup.
 * 
 * Usage:
 *   node scripts/pilots/outreach-manager.js list              # List all targets
 *   node scripts/pilots/outreach-manager.js add <name> <email> [source]  # Add target
 *   node scripts/pilots/outreach-manager.js contact <id> [channel]       # Mark as contacted
 *   node scripts/pilots/outreach-manager.js respond <id> <status>        # Mark response
 *   node scripts/pilots/outreach-manager.js stats             # Show stats
 *   node scripts/pilots/outreach-manager.js templates         # Show email templates
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database connection
const DATABASE_URL = process.env.LOCAL_PG_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ LOCAL_PG_URL or DATABASE_URL not configured');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// Email templates for outreach
const OUTREACH_TEMPLATES = {
  linkedin: {
    subject: 'Free AI Lead Response Pilot — 30 Days, No Credit Card',
    body: `Hi {{name}},

I noticed you're active in real estate and wanted to reach out personally.

We just launched LeadFlow AI — it responds to your leads in <30 seconds via SMS, then books appointments directly to your calendar. It integrates with Follow Up Boss (no disruption to your workflow).

We're recruiting 3 agents for a free 30-day pilot (no credit card required). You get:
• Unlimited AI responses for 30 days
• White-glove setup (15-min call, we handle everything)
• Direct line to the founders for feedback

Interested in learning more? Just reply and I'll send over the details.

Best,
Stojan
LeadFlow AI

P.S. — 78% of deals go to the first responder. This ensures you're always first.`
  },
  
  facebook: {
    subject: '',
    body: `Hey {{name}}! 👋

Saw your post about lead generation challenges. We built something that might help.

LeadFlow AI automatically responds to leads in <30 seconds (via SMS), qualifies them, and books appointments to your calendar. It works with Follow Up Boss.

We're doing a free 30-day pilot for 3 agents — no credit card, white-glove setup included.

Worth a 15-min call to see if it's a fit?`
  },
  
  email: {
    subject: 'Quick question about your lead response time',
    body: `Hi {{name}},

Quick question: how fast do you currently respond to new leads?

We built LeadFlow AI to solve the "lead goes cold" problem. It responds in <30 seconds, 24/7, and integrates with Follow Up Boss.

We're hand-selecting 3 agents for a free 30-day pilot:
• No credit card required
• 15-minute white-glove setup
• Unlimited AI responses for 30 days

Worth a brief chat to see if it's a fit for your business?

Best,
Stojan
LeadFlow AI

---
If you're not interested, just reply "pass" and I won't follow up.`
  },
  
  follow_up: {
    subject: 'Re: Free AI Lead Response Pilot',
    body: `Hi {{name}},

Quick follow-up on my note about the LeadFlow AI pilot.

We still have {{spots_remaining}} spot{{plural}} open for the 30-day free trial. The pilot includes:

✓ Unlimited AI lead responses
✓ Follow Up Boss integration  
✓ Cal.com appointment booking
✓ White-glove setup (we do the work)

Any interest in a quick 15-min call this week?

Best,
Stojan`
  },
  
  final_call: {
    subject: 'Last call: AI lead response pilot',
    body: `Hi {{name}},

This is my last note about the LeadFlow AI pilot — don't want to bug you if it's not a fit.

We're closing applications this Friday and only have {{spots_remaining}} spot{{plural}} left.

If you've been thinking about automating your lead response, this is a risk-free way to test it: 30 days free, no credit card, we handle all the setup.

Interested? Just reply "yes" and I'll send the calendar link.

If not, no worries at all — best of luck with your business!

Stojan`
  }
};

/**
 * List all outreach targets
 */
async function listTargets() {
  console.log('\n📋 Pilot Outreach Targets\n');
  
  const result = await pool.query(`
    SELECT 
      prt.id,
      prt.name,
      prt.email,
      prt.location,
      prt.brokerage,
      prt.source_channel,
      prt.status,
      prt.priority,
      prt.notes,
      prt.created_at,
      COUNT(prtp.id) as touch_count
    FROM pilot_recruitment_targets prt
    LEFT JOIN pilot_recruitment_touchpoints prtp ON prt.id = prtp.target_id
    GROUP BY prt.id
    ORDER BY prt.priority DESC, prt.created_at ASC
  `);
  
  if (result.rows.length === 0) {
    console.log('No targets found. Add some with: node outreach-manager.js add <name> <email>');
    return;
  }
  
  // Group by status
  const byStatus = {};
  result.rows.forEach(t => {
    byStatus[t.status] = byStatus[t.status] || [];
    byStatus[t.status].push(t);
  });
  
  const statusOrder = ['identified', 'contacted', 'responded', 'scheduled', 'signed_up', 'declined', 'nurture'];
  
  statusOrder.forEach(status => {
    if (byStatus[status]) {
      const emoji = {
        identified: '🔍',
        contacted: '📤',
        responded: '💬',
        scheduled: '📅',
        signed_up: '✅',
        declined: '❌',
        nurture: '🌱'
      }[status];
      
      console.log(`\n${emoji} ${status.toUpperCase()} (${byStatus[status].length})`);
      console.log('-'.repeat(80));
      
      byStatus[status].forEach(t => {
        const touches = t.touch_count > 0 ? ` (${t.touch_count} touches)` : '';
        const location = t.location ? ` | ${t.location}` : '';
        const priority = t.priority > 0 ? ' ⭐'.repeat(t.priority) : '';
        console.log(`  ${t.id.substring(0, 8)}… | ${t.name}${location} | ${t.source_channel}${touches}${priority}`);
        if (t.notes) {
          console.log(`      📝 ${t.notes.substring(0, 60)}${t.notes.length > 60 ? '...' : ''}`);
        }
      });
    }
  });
  
  console.log(`\n📊 Total: ${result.rows.length} targets`);
}

/**
 * Add a new outreach target
 */
async function addTarget(name, email, source = 'manual', options = {}) {
  if (!name || !email) {
    console.error('❌ Name and email are required');
    process.exit(1);
  }
  
  // Get or create the active campaign
  const campaignResult = await pool.query(`
    SELECT id FROM pilot_recruitment_campaigns 
    WHERE status = 'active' 
    ORDER BY created_at DESC 
    LIMIT 1
  `);
  
  if (campaignResult.rows.length === 0) {
    console.error('❌ No active campaign found. Create one first.');
    process.exit(1);
  }
  
  const campaignId = campaignResult.rows[0].id;
  
  const result = await pool.query(`
    INSERT INTO pilot_recruitment_targets 
      (campaign_id, name, email, source_channel, status, location, brokerage, notes, priority)
    VALUES ($1, $2, $3, $4, 'identified', $5, $6, $7, $8)
    RETURNING id, name, email
  `, [
    campaignId,
    name,
    email,
    source,
    options.location || null,
    options.brokerage || null,
    options.notes || null,
    options.priority || 0
  ]);
  
  console.log(`✅ Added target: ${result.rows[0].name} (${result.rows[0].email})`);
  console.log(`   ID: ${result.rows[0].id}`);
}

/**
 * Mark a target as contacted
 */
async function markContacted(targetId, channel = 'email', template = 'initial') {
  const result = await pool.query(`
    SELECT id, name, email, status FROM pilot_recruitment_targets WHERE id = $1
  `, [targetId]);
  
  if (result.rows.length === 0) {
    console.error(`❌ Target not found: ${targetId}`);
    process.exit(1);
  }
  
  const target = result.rows[0];
  
  // Create touchpoint
  await pool.query(`
    INSERT INTO pilot_recruitment_touchpoints 
      (target_id, channel, touch_type, sent_at)
    VALUES ($1, $2, $3, NOW())
  `, [targetId, channel, template]);
  
  // Update target status if still identified
  if (target.status === 'identified') {
    await pool.query(`
      UPDATE pilot_recruitment_targets 
      SET status = 'contacted', updated_at = NOW()
      WHERE id = $1
    `, [targetId]);
  }
  
  console.log(`✅ Marked as contacted: ${target.name}`);
  console.log(`   Channel: ${channel}`);
  console.log(`   Template: ${template}`);
}

/**
 * Mark a target response
 */
async function markResponse(targetId, status, notes = '') {
  const validStatuses = ['responded', 'scheduled', 'signed_up', 'declined', 'nurture'];
  
  if (!validStatuses.includes(status)) {
    console.error(`❌ Invalid status. Use: ${validStatuses.join(', ')}`);
    process.exit(1);
  }
  
  const result = await pool.query(`
    SELECT id, name, email FROM pilot_recruitment_targets WHERE id = $1
  `, [targetId]);
  
  if (result.rows.length === 0) {
    console.error(`❌ Target not found: ${targetId}`);
    process.exit(1);
  }
  
  const target = result.rows[0];
  
  await pool.query(`
    UPDATE pilot_recruitment_targets 
    SET status = $1, notes = COALESCE(notes || E'\n' || $2, $2), updated_at = NOW()
    WHERE id = $3
  `, [status, notes, targetId]);
  
  // Record the response touchpoint
  await pool.query(`
    INSERT INTO pilot_recruitment_touchpoints 
      (target_id, channel, touch_type, responded_at, response_notes)
    VALUES ($1, 'email', 'response', NOW(), $2)
  `, [targetId, notes]);
  
  console.log(`✅ Updated status: ${target.name} → ${status}`);
}

/**
 * Show outreach stats
 */
async function showStats() {
  console.log('\n📊 Pilot Outreach Stats\n');
  
  // Overall stats
  const statsResult = await pool.query(`
    SELECT 
      status,
      COUNT(*) as count
    FROM pilot_recruitment_targets
    GROUP BY status
    ORDER BY count DESC
  `);
  
  console.log('By Status:');
  console.log('-'.repeat(40));
  statsResult.rows.forEach(row => {
    const emoji = {
      identified: '🔍',
      contacted: '📤',
      responded: '💬',
      scheduled: '📅',
      signed_up: '✅',
      declined: '❌',
      nurture: '🌱'
    }[row.status] || '•';
    console.log(`  ${emoji} ${row.status}: ${row.count}`);
  });
  
  // Touchpoint stats
  const touchResult = await pool.query(`
    SELECT 
      channel,
      COUNT(*) as count
    FROM pilot_recruitment_touchpoints
    GROUP BY channel
    ORDER BY count DESC
  `);
  
  if (touchResult.rows.length > 0) {
    console.log('\nTouchpoints by Channel:');
    console.log('-'.repeat(40));
    touchResult.rows.forEach(row => {
      console.log(`  • ${row.channel}: ${row.count}`);
    });
  }
  
  // Conversion funnel
  const funnelResult = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'identified') as identified,
      COUNT(*) FILTER (WHERE status IN ('contacted', 'responded', 'scheduled', 'signed_up')) as contacted,
      COUNT(*) FILTER (WHERE status IN ('responded', 'scheduled', 'signed_up')) as responded,
      COUNT(*) FILTER (WHERE status = 'signed_up') as signed_up
    FROM pilot_recruitment_targets
  `);
  
  const funnel = funnelResult.rows[0];
  console.log('\nConversion Funnel:');
  console.log('-'.repeat(40));
  console.log(`  Identified → Contacted: ${funnel.identified > 0 ? Math.round((funnel.contacted / funnel.identified) * 100) : 0}%`);
  console.log(`  Contacted → Responded: ${funnel.contacted > 0 ? Math.round((funnel.responded / funnel.contacted) * 100) : 0}%`);
  console.log(`  Responded → Signed Up: ${funnel.responded > 0 ? Math.round((funnel.signed_up / funnel.responded) * 100) : 0}%`);
  
  // Goal progress
  const signedUpCount = parseInt(funnel.signed_up) || 0;
  const goalCount = 3;
  const progressPercent = Math.min(100, Math.round((signedUpCount / goalCount) * 100));
  const barLength = 20;
  const filledLength = Math.round((progressPercent / 100) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  
  console.log(`\n🎯 Goal Progress: ${signedUpCount}/${goalCount} pilots signed up`);
  console.log(`   [${bar}] ${progressPercent}%`);
}

/**
 * Show email templates
 */
function showTemplates() {
  console.log('\n📧 Outreach Email Templates\n');
  console.log('='.repeat(80));
  
  Object.entries(OUTREACH_TEMPLATES).forEach(([name, template]) => {
    console.log(`\n${name.toUpperCase()}`);
    console.log('-'.repeat(80));
    if (template.subject) {
      console.log(`Subject: ${template.subject}`);
      console.log('');
    }
    console.log(template.body);
    console.log('');
  });
  
  console.log('='.repeat(80));
  console.log('\nVariables:');
  console.log('  {{name}} - Target\'s first name');
  console.log('  {{spots_remaining}} - Number of pilot spots left');
  console.log('  {{plural}} - "s" if spots_remaining != 1, empty otherwise');
}

/**
 * Generate personalized email for a target
 */
async function generateEmail(targetId, templateName = 'email') {
  const template = OUTREACH_TEMPLATES[templateName];
  if (!template) {
    console.error(`❌ Template not found: ${templateName}`);
    console.log(`Available: ${Object.keys(OUTREACH_TEMPLATES).join(', ')}`);
    process.exit(1);
  }
  
  const result = await pool.query(`
    SELECT name, email FROM pilot_recruitment_targets WHERE id = $1
  `, [targetId]);
  
  if (result.rows.length === 0) {
    console.error(`❌ Target not found: ${targetId}`);
    process.exit(1);
  }
  
  const target = result.rows[0];
  const firstName = target.name.split(' ')[0];
  
  // Get current signed up count for spots remaining
  const spotsResult = await pool.query(`
    SELECT COUNT(*) as count FROM pilot_recruitment_targets WHERE status = 'signed_up'
  `);
  const spotsRemaining = Math.max(0, 3 - parseInt(spotsResult.rows[0].count));
  
  let body = template.body
    .replace(/\{\{name\}\}/g, firstName)
    .replace(/\{\{spots_remaining\}\}/g, spotsRemaining)
    .replace(/\{\{plural\}\}/g, spotsRemaining === 1 ? '' : 's');
  
  console.log('\n' + '='.repeat(80));
  console.log(`To: ${target.name} <${target.email}>`);
  if (template.subject) {
    console.log(`Subject: ${template.subject}`);
  }
  console.log('='.repeat(80));
  console.log('');
  console.log(body);
  console.log('');
  console.log('='.repeat(80));
}

/**
 * Main entry point
 */
async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'list':
        await listTargets();
        break;
        
      case 'add':
        const [name, email, source, ...opts] = process.argv.slice(3);
        const options = {};
        opts.forEach(opt => {
          if (opt.startsWith('location=')) options.location = opt.split('=')[1];
          if (opt.startsWith('brokerage=')) options.brokerage = opt.split('=')[1];
          if (opt.startsWith('notes=')) options.notes = opt.split('=')[1];
          if (opt.startsWith('priority=')) options.priority = parseInt(opt.split('=')[1]);
        });
        await addTarget(name, email, source || 'manual', options);
        break;
        
      case 'contact':
        const [contactId, channel, touchType] = process.argv.slice(3);
        await markContacted(contactId, channel || 'email', touchType || 'initial');
        break;
        
      case 'respond':
        const [respondId, status, ...noteParts] = process.argv.slice(3);
        await markResponse(respondId, status, noteParts.join(' '));
        break;
        
      case 'stats':
        await showStats();
        break;
        
      case 'templates':
        showTemplates();
        break;
        
      case 'email':
        const [emailId, templateName] = process.argv.slice(3);
        await generateEmail(emailId, templateName || 'email');
        break;
        
      default:
        console.log(`
Pilot Outreach Manager

Usage:
  node outreach-manager.js list                          # List all targets
  node outreach-manager.js add <name> <email> [source]   # Add new target
  node outreach-manager.js contact <id> [channel]        # Mark as contacted
  node outreach-manager.js respond <id> <status> [notes] # Mark response
  node outreach-manager.js stats                         # Show statistics
  node outreach-manager.js templates                     # Show email templates
  node outreach-manager.js email <id> [template]         # Generate personalized email

Examples:
  node outreach-manager.js add "John Doe" "john@example.com" linkedin
  node outreach-manager.js contact abc123 linkedin
  node outreach-manager.js respond abc123 responded "Interested in demo"
  node outreach-manager.js email abc123 follow_up
`);
        process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

module.exports = {
  OUTREACH_TEMPLATES,
  listTargets,
  addTarget,
  markContacted,
  markResponse,
  showStats,
  generateEmail
};

if (require.main === module) {
  main();
}
