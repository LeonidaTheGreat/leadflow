#!/usr/bin/env node
/**
 * enroll-pilot.js
 * 
 * Manually enroll a real estate agent as a pilot.
 * Creates a pilot_progress record for an existing agent.
 * 
 * Usage:
 *   node scripts/enroll-pilot.js --agent-id <uuid> [--stage <stage>] [--cohort <cohort>]
 *   node scripts/enroll-pilot.js --email <email> [--stage <stage>] [--cohort <cohort>]
 * 
 * Stages: signed_up | email_verified | fub_connected | first_lead_responded | aha_moment | trial_started | paid
 * Default stage: signed_up
 * Default cohort: cohort-1
 */

const { Pool } = require('pg');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    stage: 'signed_up',
    cohort: 'cohort-1'
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--agent-id':
        options.agentId = args[++i];
        break;
      case '--email':
        options.email = args[++i];
        break;
      case '--stage':
        options.stage = args[++i];
        break;
      case '--cohort':
        options.cohort = args[++i];
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }

  if (!options.agentId && !options.email) {
    console.error('Error: Either --agent-id or --email is required');
    showHelp();
    process.exit(1);
  }

  return options;
}

function showHelp() {
  console.log(`
Usage:
  node scripts/enroll-pilot.js --agent-id <uuid> [--stage <stage>] [--cohort <cohort>]
  node scripts/enroll-pilot.js --email <email> [--stage <stage>] [--cohort <cohort>]

Options:
  --agent-id <uuid>   Agent UUID from real_estate_agents table
  --email <email>     Agent email (alternative to agent-id)
  --stage <stage>     Initial stage (default: signed_up)
                      Valid: signed_up | email_verified | fub_connected | 
                             first_lead_responded | aha_moment | trial_started | paid
  --cohort <cohort>   Pilot cohort (default: cohort-1)
  --help              Show this help message

Examples:
  node scripts/enroll-pilot.js --email agent@example.com
  node scripts/enroll-pilot.js --agent-id 123e4567-e89b-12d3-a456-426614174000 --stage trial_started
`);
}

async function main() {
  const options = parseArgs();

  // Validate stage
  const validStages = ['signed_up', 'email_verified', 'fub_connected', 'first_lead_responded', 'aha_moment', 'trial_started', 'paid'];
  if (!validStages.includes(options.stage)) {
    console.error(`Error: Invalid stage "${options.stage}"`);
    console.error(`Valid stages: ${validStages.join(' | ')}`);
    process.exit(1);
  }

  // Connect to database
  const pool = new Pool({
    connectionString: process.env.LOCAL_PG_URL
  });

  try {
    let agentId = options.agentId;

    // If email provided, lookup agent_id
    if (options.email) {
      const agentResult = await pool.query(
        'SELECT id, email, first_name, last_name FROM real_estate_agents WHERE email = $1',
        [options.email]
      );

      if (agentResult.rows.length === 0) {
        console.error(`Error: No agent found with email "${options.email}"`);
        process.exit(1);
      }

      const agent = agentResult.rows[0];
      agentId = agent.id;
      console.log(`Found agent: ${agent.first_name || ''} ${agent.last_name || ''} (${agent.email})`);
    }

    // Check if pilot_progress record already exists
    const existingResult = await pool.query(
      'SELECT id, stage FROM pilot_progress WHERE agent_id = $1',
      [agentId]
    );

    if (existingResult.rows.length > 0) {
      console.log(`Agent already has pilot_progress record:`);
      console.log(`  ID: ${existingResult.rows[0].id}`);
      console.log(`  Current stage: ${existingResult.rows[0].stage}`);
      console.log(`\nTo update the stage, use the pilot management tools or database directly.`);
      process.exit(0);
    }

    // Create pilot_progress record
    const insertResult = await pool.query(
      `INSERT INTO pilot_progress (agent_id, stage, pilot_cohort, stage_entered_at, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW(), NOW())
       RETURNING id, agent_id, stage, pilot_cohort, created_at`,
      [agentId, options.stage, options.cohort]
    );

    const record = insertResult.rows[0];
    console.log(`\n✅ Pilot enrolled successfully!`);
    console.log(`  Record ID: ${record.id}`);
    console.log(`  Agent ID: ${record.agent_id}`);
    console.log(`  Stage: ${record.stage}`);
    console.log(`  Cohort: ${record.pilot_cohort}`);
    console.log(`  Created: ${record.created_at}`);
    console.log(`\nNext steps:`);
    console.log(`  - Agent will appear in pilot dashboard`);
    console.log(`  - White-glove onboarding sequence will begin`);
    console.log(`  - Stage progression can be tracked via pilot_progress table`);

  } catch (error) {
    console.error('Error enrolling pilot:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
