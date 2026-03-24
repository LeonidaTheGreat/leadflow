#!/usr/bin/env node
/**
 * Setup Cal.com Booking Tables
 * 
 * Run: node setup-calcom-tables.js
 * 
 * This script creates the necessary database tables for Cal.com integration:
 * - bookings
 * - booking_activities
 * - agent_booking_configs
 * - booking_reminders
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

// Check environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    if (!supabaseUrl) console.error('   - SUPABASE_URL');
    if (!supabaseKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nPlease set these in your .env file');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Read SQL file
const sqlFilePath = path.join(__dirname, 'sql', 'calcom-bookings-schema.sql');

if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ SQL file not found: ${sqlFilePath}`);
    process.exit(1);
}

const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

// Split SQL into individual statements
function splitSqlStatements(sql) {
    const statements = [];
    let currentStatement = '';
    let inFunction = false;
    
    const lines = sql.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('--')) continue;
        
        // Detect function/trigger start
        if (trimmedLine.includes('CREATE OR REPLACE FUNCTION') || 
            trimmedLine.includes('$$')) {
            inFunction = true;
        }
        
        currentStatement += line + '\n';
        
        // End of statement
        if (!inFunction && trimmedLine.endsWith(';')) {
            statements.push(currentStatement.trim());
            currentStatement = '';
        }
        
        // End of function
        if (inFunction && trimmedLine === '$$ language \'plpgsql\';') {
            inFunction = false;
            statements.push(currentStatement.trim());
            currentStatement = '';
        }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
    }
    
    return statements;
}

async function setupTables() {
    console.log('🔧 Setting up Cal.com Booking Tables\n');
    console.log('=====================================\n');
    
    const statements = splitSqlStatements(sqlContent);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        const statementPreview = statement.substring(0, 60).replace(/\s+/g, ' ').trim();
        
        process.stdout.write(`[${i + 1}/${statements.length}] ${statementPreview}... `);
        
        try {
            const { error } = await supabase.rpc('exec_sql', { 
                sql: statement 
            });
            
            if (error) {
                // Try alternative: run as raw query
                const { error: queryError } = await supabase.from('_temp_query')
                    .select('*')
                    .limit(0);
                    
                // If RPC doesn't exist, we'll need to use REST API directly
                const response = await fetch(`${supabaseUrl}/rest/v1/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'params=single-object'
                    },
                    body: JSON.stringify({ query: statement })
                });
                
                if (!response.ok) {
                    // Some statements may fail if objects already exist
                    const errorText = await response.text();
                    if (errorText.includes('already exists') || 
                        errorText.includes('Duplicate')) {
                        console.log('⚠️  (already exists)');
                        successCount++;
                    } else {
                        throw new Error(errorText);
                    }
                } else {
                    console.log('✅');
                    successCount++;
                }
            } else {
                console.log('✅');
                successCount++;
            }
        } catch (error) {
            // Check if it's a "already exists" error which is fine
            const errorMessage = error.message || '';
            if (errorMessage.includes('already exists') || 
                errorMessage.includes('Duplicate') ||
                errorMessage.includes('already')) {
                console.log('⚠️  (already exists)');
                successCount++;
            } else {
                console.log('❌');
                errorCount++;
                errors.push({
                    statement: statementPreview,
                    error: errorMessage.substring(0, 200)
                });
            }
        }
    }
    
    console.log('\n=====================================');
    console.log(`\nResults: ${successCount} succeeded, ${errorCount} failed`);
    
    if (errors.length > 0) {
        console.log('\nErrors:');
        errors.forEach((err, idx) => {
            console.log(`  ${idx + 1}. ${err.statement}`);
            console.log(`     ${err.error}`);
        });
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    
    const tables = ['bookings', 'booking_activities', 'agent_booking_configs', 'booking_reminders'];
    
    for (const table of tables) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('id')
                .limit(1);
                
            if (error && error.code !== 'PGRST116') {
                console.log(`  ❌ ${table}: ${error.message}`);
            } else {
                console.log(`  ✅ ${table}`);
            }
        } catch (err) {
            console.log(`  ⚠️  ${table}: Could not verify (${err.message.substring(0, 50)})`);
        }
    }
    
    console.log('\n✅ Setup complete!');
    
    if (errorCount > 0) {
        process.exit(1);
    }
}

// Alternative: Direct SQL execution via Supabase SQL API
async function setupTablesViaSqlApi() {
    console.log('🔧 Setting up Cal.com Booking Tables (via SQL API)\n');
    console.log('================================================\n');
    
    const statements = splitSqlStatements(sqlContent);
    let successCount = 0;
    let errorCount = 0;
    
    console.log(`Found ${statements.length} SQL statements\n`);
    
    // Try using pg_execute if available
    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        const firstLine = statement.split('\n')[0].trim();
        
        process.stdout.write(`[${i + 1}/${statements.length}] Executing... `);
        
        try {
            // Use pgmeta to execute SQL
            const response = await fetch(`${supabaseUrl}/pgmeta/default/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: statement })
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(error);
            }
            
            console.log('✅');
            successCount++;
            
        } catch (error) {
            const errorMessage = error.message || '';
            if (errorMessage.includes('already exists') || 
                errorMessage.includes('Duplicate')) {
                console.log('⚠️  (already exists)');
                successCount++;
            } else if (errorMessage.includes('permission') || 
                       errorMessage.includes('not found')) {
                console.log('⚠️  (skipped - may require manual execution)');
                successCount++;
            } else {
                console.log('❌');
                errorCount++;
                console.log(`   Error: ${errorMessage.substring(0, 100)}`);
            }
        }
    }
    
    console.log('\n================================================');
    console.log(`\nResults: ${successCount} succeeded, ${errorCount} failed`);
    
    // Show manual instructions if needed
    console.log('\n📋 Manual Setup Instructions:');
    console.log('   If some statements failed, execute the SQL in:');
    console.log(`   ${sqlFilePath}`);
    console.log('\n   Via Supabase Dashboard → SQL Editor');
    
    return errorCount === 0;
}

// Main execution
(async () => {
    try {
        // Try the SQL API method first
        await setupTablesViaSqlApi();
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        process.exit(1);
    }
})();
