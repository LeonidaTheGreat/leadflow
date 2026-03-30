require('dotenv').config({ path: '.env' });

const { Client } = require('pg');
const url = process.env.LOCAL_PG_URL;

const client = new Client({ connectionString: url });

(async () => {
  try {
    await client.connect();
    
    console.log('\n=== TABLE SCHEMA ===\n');
    
    // Get tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));
    
    // Get columns for agent_page_views
    if (tables.rows.some(r => r.table_name === 'agent_page_views')) {
      const cols = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'agent_page_views';
      `);
      console.log('\nagent_page_views columns:', cols.rows.map(r => r.column_name).join(', '));
    }
    
    // Get columns for messages
    if (tables.rows.some(r => r.table_name === 'messages')) {
      const cols = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'messages';
      `);
      console.log('\nmessages columns:', cols.rows.map(r => r.column_name).join(', '));
    }
    
    await client.end();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
