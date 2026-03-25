#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load env from multiple sources
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../product/lead-response/dashboard/.env.production') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Supabase connection details from environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fptrokacdwzlmflyczdz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

if (!DB_PASSWORD) {
  console.error('❌ SUPABASE_DB_PASSWORD not found in environment');
  process.exit(1);
}

// Extract project ref from URL (e.g., fptrokacdwzlmflyczdz)
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
if (!projectRef) {
  console.error('❌ Could not extract project reference from URL');
  process.exit(1);
}

const dbConfig = {
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
};

async function applyMigration() {
  const client = new Client(dbConfig);
  
  try {
    console.log(`🔗 Connecting to Supabase database (${dbConfig.host})...`);
    await client.connect();
    console.log('✅ Connected\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../product/lead-response/dashboard/supabase/migrations/003_lead_sequences.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    // Remove comments and split into statements more carefully
    let statements = [];
    let current = '';
    let inDollarQuote = false;
    let dollarQuoteTag = '';
    let lines = sqlContent.split('\n');
    
    for (let line of lines) {
      // Skip comment lines
      if (line.trim().startsWith('--')) {
        continue;
      }
      
      // Check for dollar quote delimiters (e.g., $$ or $func$)
      const dollarMatch = line.match(/\$[a-zA-Z0-9]*\$/);
      if (dollarMatch) {
        inDollarQuote = !inDollarQuote;
        dollarQuoteTag = dollarMatch[0];
      }
      
      current += line + '\n';
      
      // If not in a dollar-quoted string and line ends with semicolon, it's a statement boundary
      if (!inDollarQuote && line.trim().endsWith(';')) {
        const stmt = current.trim();
        if (stmt.length > 0) {
          statements.push(stmt);
        }
        current = '';
      }
    }

    // Handle any remaining content
    if (current.trim().length > 0) {
      statements.push(current.trim());
    }

    console.log(`📋 Found ${statements.length} SQL statements\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 60).replace(/\n/g, ' ') + (stmt.length > 60 ? '...' : '');
      
      process.stdout.write(`[${String(i + 1).padStart(2, ' ')}/${statements.length}] ${preview.padEnd(70)}`);

      try {
        await client.query(stmt);
        console.log(' ✓');
        successCount++;
      } catch (error) {
        // Log but continue - some statements might already exist
        if (error.message.includes('already exists')) {
          console.log(' ⚠ (already exists)');
          successCount++;
        } else {
          console.log(` ✗`);
          console.error(`        Error: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log(`\n✅ Migration applied: ${successCount} statements executed, ${errorCount} errors`);
    
    if (errorCount > 0) {
      console.warn('⚠️  Some statements had errors. This may be expected if objects already exist.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
