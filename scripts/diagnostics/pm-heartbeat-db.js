require('dotenv').config({ path: require('os').homedir() + '/.env' });
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.LOCAL_PG_URL });
  await client.connect();
  const queries = {
    tasks: `select id,title,status,priority,agent_id,created_at,updated_at from tasks where project_id='leadflow' and status not in ('completed','cancelled','failed') order by priority asc nulls last, updated_at desc limit 15`,
    feedback: `select id,feedback_type,processed,created_at,data from product_feedback where project_id='leadflow' order by created_at desc limit 10`,
    actions: `select id,title,type,status,priority,created_at from action_items where project_id='leadflow' and status='WAITING' order by priority asc, created_at desc limit 10`,
    ucs: `select id,title,status,priority,revenue_impact,updated_at from use_cases where project_id='leadflow' order by updated_at desc limit 10`,
    e2e: `select id,title,status,priority,updated_at from e2e_test_specs where project_id='leadflow' order by updated_at desc limit 10`
  };
  for (const [k, q] of Object.entries(queries)) {
    const r = await client.query(q);
    console.log(`\n## ${k.toUpperCase()}`);
    console.log(JSON.stringify(r.rows, null, 2));
  }
  await client.end();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
