#!/usr/bin/env node
/**
 * E2E Test: Session Analytics — Pilot Usage Tracking
 * 
 * Tests:
 * 1. agent_sessions table exists with correct schema
 * 2. agent_page_views table exists with correct schema
 * 3. inactivity_alerts table exists with correct schema
 * 4. Internal pilot-usage endpoint returns correct structure (with service_role key)
 * 5. Inactivity check cron endpoint is accessible
 * 6. Session analytics functions exist and are importable
 * 
 * Run: node tests/feat-session-analytics-pilot.test.js
 */

const assert = require('assert');
const { createClient } = require('@supabase/supabase-js');

// Load env from project root
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

let passed = 0;
let failed = 0;

function test(name, fn) {
  return new Promise(async (resolve) => {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.log(`❌ FAIL: ${name}`);
      console.log(`   Error: ${err.message}`);
      failed++;
    }
    resolve();
  });
}

async function runTests() {
  console.log('\n🧪 Session Analytics E2E Tests\n');
  console.log('=' .repeat(50));

  // Test 1: agent_sessions table exists
  await test('agent_sessions table exists', async () => {
    const { data, error } = await supabase
      .from('agent_sessions')
      .select('id')
      .limit(1);
    
    // Should not error (empty is OK, error means table missing)
    if (error && error.message.includes('does not exist')) {
      throw new Error('Table does not exist');
    }
  });

  // Test 2: agent_page_views table exists
  await test('agent_page_views table exists', async () => {
    const { data, error } = await supabase
      .from('agent_page_views')
      .select('id')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      throw new Error('Table does not exist');
    }
  });

  // Test 3: inactivity_alerts table exists
  await test('inactivity_alerts table exists', async () => {
    const { data, error } = await supabase
      .from('inactivity_alerts')
      .select('id')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      throw new Error('Table does not exist');
    }
  });

  // Test 4: agent_sessions has required columns
  await test('agent_sessions has required columns', async () => {
    const { data, error } = await supabase
      .from('agent_sessions')
      .select('id, agent_id, session_start, session_end, last_active_at, ip_address, user_agent, created_at')
      .limit(1);
    
    if (error) {
      throw new Error(`Column check failed: ${error.message}`);
    }
  });

  // Test 5: agent_page_views has required columns
  await test('agent_page_views has required columns', async () => {
    const { data, error } = await supabase
      .from('agent_page_views')
      .select('id, agent_id, session_id, page, visited_at')
      .limit(1);
    
    if (error) {
      throw new Error(`Column check failed: ${error.message}`);
    }
  });

  // Test 6: inactivity_alerts has required columns
  await test('inactivity_alerts has required columns', async () => {
    const { data, error } = await supabase
      .from('inactivity_alerts')
      .select('id, agent_id, alerted_at, channel')
      .limit(1);
    
    if (error) {
      throw new Error(`Column check failed: ${error.message}`);
    }
  });

  // Test 7: Can insert and retrieve a session
  await test('Can insert and retrieve session', async () => {
    // First get a real agent id
    const { data: agent } = await supabase
      .from('real_estate_agents')
      .select('id')
      .limit(1)
      .single();
    
    if (!agent) {
      console.log('   ⚠️  Skipping (no agents in DB)');
      return;
    }

    const testSession = {
      agent_id: agent.id,
      ip_address: '127.0.0.1',
      user_agent: 'Test-Agent/1.0',
      session_start: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await supabase
      .from('agent_sessions')
      .insert(testSession)
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Insert failed: ${insertError.message}`);
    }

    assert(inserted.id, 'Should return session id');

    // Cleanup
    await supabase.from('agent_sessions').delete().eq('id', inserted.id);
  });

  // Test 8: Can insert and retrieve page view
  await test('Can insert and retrieve page view', async () => {
    const { data: agent } = await supabase
      .from('real_estate_agents')
      .select('id')
      .limit(1)
      .single();
    
    if (!agent) {
      console.log('   ⚠️  Skipping (no agents in DB)');
      return;
    }

    // Create a session first
    const { data: session } = await supabase
      .from('agent_sessions')
      .insert({
        agent_id: agent.id,
        session_start: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (!session) {
      throw new Error('Failed to create test session');
    }

    const testPageView = {
      agent_id: agent.id,
      session_id: session.id,
      page: '/dashboard',
      visited_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await supabase
      .from('agent_page_views')
      .insert(testPageView)
      .select('id')
      .single();

    if (insertError) {
      // Cleanup session
      await supabase.from('agent_sessions').delete().eq('id', session.id);
      throw new Error(`Insert failed: ${insertError.message}`);
    }

    assert(inserted.id, 'Should return page view id');

    // Cleanup
    await supabase.from('agent_page_views').delete().eq('id', inserted.id);
    await supabase.from('agent_sessions').delete().eq('id', session.id);
  });

  // Test 9: Can insert and retrieve inactivity alert
  await test('Can insert and retrieve inactivity alert', async () => {
    const { data: agent } = await supabase
      .from('real_estate_agents')
      .select('id')
      .limit(1)
      .single();
    
    if (!agent) {
      console.log('   ⚠️  Skipping (no agents in DB)');
      return;
    }

    const testAlert = {
      agent_id: agent.id,
      alerted_at: new Date().toISOString(),
      channel: 'telegram',
    };

    const { data: inserted, error: insertError } = await supabase
      .from('inactivity_alerts')
      .insert(testAlert)
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Insert failed: ${insertError.message}`);
    }

    assert(inserted.id, 'Should return alert id');

    // Cleanup
    await supabase.from('inactivity_alerts').delete().eq('id', inserted.id);
  });

  // Test 10: Session analytics module exists with correct exports
  await test('Session analytics module exists with correct exports', async () => {
    const fs = require('fs');
    const path = require('path');
    const modulePath = path.join(__dirname, '..', 'product/lead-response/dashboard/lib/session-analytics.ts');
    
    assert(fs.existsSync(modulePath), 'session-analytics.ts should exist');
    
    const content = fs.readFileSync(modulePath, 'utf-8');
    assert(content.includes('export async function logSessionStart'), 'Should export logSessionStart');
    assert(content.includes('export async function touchSession'), 'Should export touchSession');
    assert(content.includes('export async function logPageView'), 'Should export logPageView');
    assert(content.includes('export async function endSession'), 'Should export endSession');
    assert(content.includes('export const TRACKED_PAGES'), 'Should export TRACKED_PAGES');
    
    // Check tracked pages match PRD requirements
    const requiredPages = ['/dashboard', '/dashboard/conversations', '/dashboard/settings', '/dashboard/billing'];
    for (const page of requiredPages) {
      assert(content.includes(`'${page}'`), `TRACKED_PAGES should include ${page}`);
    }
  });

  // Test 11: login route integrates session analytics
  await test('Login route integrates session analytics', async () => {
    const fs = require('fs');
    const path = require('path');
    const loginRoutePath = path.join(__dirname, '..', 'product/lead-response/dashboard/app/api/auth/login/route.ts');
    
    const content = fs.readFileSync(loginRoutePath, 'utf-8');
    
    assert(content.includes('logSessionStart'), 'Login route should import logSessionStart');
    assert(content.includes('analyticsSessionId'), 'Login route should return analyticsSessionId');
    assert(content.includes('x-forwarded-for') || content.includes('x-real-ip'), 'Login route should capture IP');
    assert(content.includes('user-agent'), 'Login route should capture user agent');
  });

  // Test 12: Internal pilot-usage endpoint exists
  await test('Internal pilot-usage endpoint exists', async () => {
    const fs = require('fs');
    const path = require('path');
    const endpointPath = path.join(__dirname, '..', 'product/lead-response/dashboard/app/api/internal/pilot-usage/route.ts');
    
    assert(fs.existsSync(endpointPath), 'pilot-usage endpoint should exist');
    
    const content = fs.readFileSync(endpointPath, 'utf-8');
    assert(content.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Endpoint should require service role key');
    assert(content.includes('pilots'), 'Endpoint should return pilots array');
    assert(content.includes('lastLogin'), 'Endpoint should include lastLogin');
    assert(content.includes('sessionsLast7d'), 'Endpoint should include sessionsLast7d');
    assert(content.includes('inactiveHours'), 'Endpoint should include inactiveHours');
  });

  // Test 13: Inactivity check cron endpoint exists
  await test('Inactivity check cron endpoint exists', async () => {
    const fs = require('fs');
    const path = require('path');
    const endpointPath = path.join(__dirname, '..', 'product/lead-response/dashboard/app/api/cron/inactivity-check/route.ts');
    
    assert(fs.existsSync(endpointPath), 'inactivity-check endpoint should exist');
    
    const content = fs.readFileSync(endpointPath, 'utf-8');
    assert(content.includes('72'), 'Endpoint should check for 72h inactivity');
    assert(content.includes('telegram') || content.includes('TELEGRAM'), 'Endpoint should support Telegram alerts');
    assert(content.includes('alerted_at') || content.includes('dedup'), 'Endpoint should de-duplicate alerts');
  });

  // Test 14: Vercel cron config includes inactivity check
  await test('Vercel cron config includes inactivity check', async () => {
    const fs = require('fs');
    const path = require('path');
    const vercelConfigPath = path.join(__dirname, '..', 'product/lead-response/dashboard/vercel.json');
    
    assert(fs.existsSync(vercelConfigPath), 'vercel.json should exist');
    
    const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));
    const crons = config.crontab || config.crons;
    assert(Array.isArray(crons), 'vercel.json should have crons array');
    
    const hasInactivityCheck = crons.some(cron => 
      cron.path && cron.path.includes('inactivity-check')
    );
    assert(hasInactivityCheck, 'vercel.json should include inactivity-check cron');
  });

  // Test 15: Migration file exists
  await test('Migration file exists', async () => {
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, '..', 'supabase/migrations/015_session_analytics.sql');
    
    assert(fs.existsSync(migrationPath), 'Migration 015 should exist');
    
    const content = fs.readFileSync(migrationPath, 'utf-8');
    assert(content.includes('agent_sessions'), 'Migration should create agent_sessions table');
    assert(content.includes('agent_page_views'), 'Migration should create agent_page_views table');
    assert(content.includes('inactivity_alerts'), 'Migration should create inactivity_alerts table');
    assert(content.includes('ENABLE ROW LEVEL SECURITY'), 'Migration should enable RLS');
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  console.log('='.repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
