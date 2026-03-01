#!/usr/bin/env node

/**
 * generate-dashboard-config.js
 * 
 * Reads .env file and generates a pre-configured dashboard
 * that doesn't require manual setup.
 * 
 * Usage:
 *   node generate-dashboard-config.js
 *   node generate-dashboard-config.js --watch
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '.env');
const TEMPLATE_FILE = path.join(__dirname, 'dashboard-realtime.html');
const OUTPUT_FILE = path.join(__dirname, 'dashboard-configured.html');

function loadEnv() {
  const env = {};
  
  if (!fs.existsSync(ENV_FILE)) {
    console.error('❌ .env file not found');
    return null;
  }
  
  const content = fs.readFileSync(ENV_FILE, 'utf-8');
  
  content.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  });
  
  return env;
}

function generateDashboard() {
  const env = loadEnv();
  
  if (!env) {
    console.error('❌ Failed to load .env');
    process.exit(1);
  }
  
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL or SUPABASE_KEY not found in .env');
    console.error('   Found keys:', Object.keys(env).join(', '));
    process.exit(1);
  }
  
  if (!fs.existsSync(TEMPLATE_FILE)) {
    console.error('❌ Template file not found:', TEMPLATE_FILE);
    process.exit(1);
  }
  
  let template = fs.readFileSync(TEMPLATE_FILE, 'utf-8');
  
  // Inject credentials into the HTML
  // Replace the localStorage.getItem lines with hardcoded values
  template = template.replace(
    "const SUPABASE_URL = localStorage.getItem('supabase_url') || '';",
    `// Auto-configured from .env\n    const SUPABASE_URL = '${supabaseUrl}';`
  );
  
  template = template.replace(
    "const SUPABASE_KEY = localStorage.getItem('supabase_key') || '';",
    `    const SUPABASE_KEY = '${supabaseKey}';`
  );
  
  // Update the init function to skip the credential check
  template = template.replace(
    `// Check if credentials are set
      if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL === 'local') {`,
    `// Credentials auto-loaded from .env
      if (!SUPABASE_URL || !SUPABASE_KEY) {`
  );
  
  // Update loading message
  template = template.replace(
    '<div id="loading" class="loading">Connecting to Supabase real-time...</div>',
    '<div id="loading" class="loading">Connecting to Supabase...</div>'
  );
  
  // Add auto-configured badge
  template = template.replace(
    '<span class="status-badge status-active">Real-Time</span>',
    '<span class="status-badge status-active">Real-Time</span><span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">(Auto-configured)</span>'
  );
  
  fs.writeFileSync(OUTPUT_FILE, template);
  
  console.log('✅ Dashboard configured successfully!');
  console.log('   Output:', OUTPUT_FILE);
  console.log('   Supabase URL:', supabaseUrl);
  console.log('   Key (first 20 chars):', supabaseKey.substring(0, 20) + '...');
  console.log('');
  console.log('🚀 Open this file in your browser:');
  console.log('   open ' + OUTPUT_FILE);
}

// Main
if (require.main === module) {
  generateDashboard();
  
  // Watch mode
  if (process.argv.includes('--watch')) {
    console.log('👀 Watching .env for changes...');
    fs.watchFile(ENV_FILE, () => {
      console.log('📝 .env changed, regenerating...');
      generateDashboard();
    });
  }
}

module.exports = { generateDashboard, loadEnv };
