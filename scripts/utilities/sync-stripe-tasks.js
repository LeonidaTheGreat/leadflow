#!/usr/bin/env node
/**
 * Sync Completed Stripe Tasks to Supabase
 * Updates Supabase with the decomposed Stripe billing tasks that were completed
 */

const { TaskStore } = require('./task-store');

const store = new TaskStore();

const stripeTasks = [
  {
    id: 'stripe-001-setup',
    title: 'Stripe Billing - Project Setup & npm Scripts',
    description: 'Set up proper npm scripts (build, lint, test, typecheck) and project structure for Stripe integration. Fix missing package.json scripts that caused previous failures.',
    status: 'done',
    priority: 2,
    agent_id: 'dev',
    model: 'kimi',
    estimated_hours: 1,
    estimated_cost_usd: 0.30,
    actual_cost_usd: 0,
    acceptance_criteria: [
      'npm run build executes without errors',
      'npm run lint executes without errors',
      'npm run test executes without errors',
      'npx tsc --noEmit passes (typecheck)',
      'All scripts defined in package.json'
    ],
    completed_at: new Date().toISOString(),
    result: 'success',
    notes: 'All 4 npm scripts added and verified. E2E tests pass 9/9.'
  },
  {
    id: 'stripe-002-core',
    title: 'Stripe Billing - Core Integration',
    description: 'Implement Stripe billing logic: customer creation, subscription management, webhook handling. Depends on project setup completion.',
    status: 'done',
    priority: 2,
    agent_id: 'dev',
    model: 'sonnet',
    estimated_hours: 2,
    estimated_cost_usd: 4.00,
    actual_cost_usd: 0,
    acceptance_criteria: [
      'Stripe customer created on agent signup',
      'Subscription created with correct plan',
      'Webhook endpoint handles stripe events',
      'Payment method attached to customer',
      'Error handling for failed payments'
    ],
    dependencies: ['stripe-001-setup'],
    completed_at: new Date().toISOString(),
    result: 'success',
    notes: 'lib/billing.js (284 lines), lib/webhook-handler.js (65 lines), routes/billing.js (159 lines). 7/7 unit tests pass.'
  },
  {
    id: 'stripe-003-tests',
    title: 'Stripe Billing - Tests & Validation',
    description: 'Add comprehensive tests for Stripe integration: unit tests for billing logic, integration tests for webhooks, validation of error scenarios.',
    status: 'done',
    priority: 2,
    agent_id: 'qc',
    model: 'haiku',
    estimated_hours: 1,
    estimated_cost_usd: 0.50,
    actual_cost_usd: 0,
    acceptance_criteria: [
      'Unit tests for billing functions (>80% coverage)',
      'Integration tests for webhook handling',
      'Test for failed payment scenarios',
      'Test for subscription cancellation',
      'All tests pass in CI'
    ],
    dependencies: ['stripe-002-core'],
    completed_at: new Date().toISOString(),
    result: 'success',
    notes: 'integration/test-billing.js (7 tests), integration/test-billing-api.js (9 tests). All pass.'
  },
  {
    id: '943086cf-7f5b-43f5-8502-4daa4be8fee4',
    title: 'Stripe Billing Integration (Original - Superseded)',
    description: 'Original Stripe billing task that failed 2x. Decomposed into 3 subtasks which all completed successfully.',
    status: 'superseded',
    priority: 2,
    agent_id: 'dev',
    model: 'opus',
    estimated_hours: 4,
    estimated_cost_usd: 8.00,
    actual_cost_usd: 0,
    superseded_by: ['stripe-001-setup', 'stripe-002-core', 'stripe-003-tests'],
    completed_at: new Date().toISOString(),
    result: 'superseded',
    notes: 'Decomposition successful. Original task failed 2x, decomposed tasks succeeded 3/3.'
  }
];

async function syncTasks() {
  console.log('🔄 Syncing completed Stripe tasks to Supabase...\n');
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  for (const task of stripeTasks) {
    try {
      // Check if task exists
      const existing = await store.getTask(task.id);
      
      if (existing) {
        // Update existing
        await store.updateTask(task.id, task);
        console.log(`✅ Updated: ${task.title} (${task.status})`);
        updated++;
      } else {
        // Create new
        await store.createTask(task);
        console.log(`✅ Created: ${task.title} (${task.status})`);
        created++;
      }
    } catch (error) {
      console.log(`❌ Error with ${task.id}: ${error.message}`);
      errors++;
    }
  }
  
  console.log('\n📊 Sync Complete');
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  
  // Generate updated dashboard
  console.log('\n🔄 Regenerating dashboard...');
  try {
    const { execSync } = require('child_process');
    execSync('node generate-dashboard-from-supabase.js', { stdio: 'inherit' });
    console.log('✅ Dashboard updated');
  } catch (e) {
    console.log('⚠️ Dashboard update failed:', e.message);
  }
}

syncTasks().catch(console.error);
