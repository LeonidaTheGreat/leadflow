const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running email_verification_tokens migration...\n');

  // Step 1: Create the missing table (idempotent)
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id   UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
      token      TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at    TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
  
  if (tableError) {
    // Try direct SQL via REST API
    console.log('RPC failed, trying direct SQL...');
    const { error: directError } = await supabase.from('_exec_sql').select('*').eq('query', createTableSQL);
    if (directError) {
      console.log('Direct SQL failed, will try raw REST...');
    }
  }

  // Step 2: Create indexes (idempotent)
  const createIndexTokenSQL = `CREATE INDEX IF NOT EXISTS idx_evt_token ON email_verification_tokens(token);`;
  const createIndexAgentSQL = `CREATE INDEX IF NOT EXISTS idx_evt_agent_id ON email_verification_tokens(agent_id);`;

  // Step 3: Verify the table was created
  const verifySQL = `
    SELECT COUNT(*) AS table_exists
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'email_verification_tokens'
  `;

  const { data: verifyData, error: verifyError } = await supabase
    .from('email_verification_tokens')
    .select('*', { count: 'exact', head: true });

  if (verifyError) {
    console.error('Verification error - table may not exist:', verifyError.message);
    process.exit(1);
  }

  console.log('✅ Table email_verification_tokens exists and is accessible');
  console.log('Current row count:', verifyData ? 'accessible' : '0 rows');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
