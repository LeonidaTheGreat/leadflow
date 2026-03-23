require('dotenv').config()
const {TaskStore} = require('./task-store');
const store = new TaskStore();

const assignments = {
  '769ee4a7-6420-46d9-8b55-0ad7df2443d7': 'dev',   // Stripe Env Config
  '461d14d6-0a2e-4f64-b527-4d3c81502bfd': 'dev',   // SQL Migrations
  'c87f4663-5f8d-49ac-aab4-a462395d489f': 'dev',   // Stripe Dashboard Webhook
  'c6186d01-0699-4011-9e51-310144e2f3fa': 'qc',    // Stripe Integration E2E Test
  '4a809711-3fa8-42e4-b7a4-2a9b3cc31ec4': 'dev',   // Cal.com Dashboard Webhook
};

async function fix() {
  for (const [id, agentId] of Object.entries(assignments)) {
    await store.updateTask(id, { agent_id: agentId });
    console.log(`✓ ${id} → ${agentId}`);
  }
  process.exit(0);
}
fix();
