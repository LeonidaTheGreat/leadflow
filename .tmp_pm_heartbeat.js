require('dotenv').config({ path: process.env.HOME + '/.env' });
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.LOCAL_PG_URL });
  await c.connect();
  const queries = {
    tasks: `select id,title,status,priority,updated_at,project_id from tasks where project_id='leadflow' and status not in ('done','cancelled') order by priority asc nulls last, updated_at desc limit 15`,
    feedback: `select id,feedback_type,processed,created_at,data->>'summary' as summary,data->>'severity' as severity from product_feedback where project_id in ('leadflow','bo2026') and processed=false order by created_at desc limit 15`,
    actions: `select id,title,type,status,priority,updated_at from action_items where project_id='leadflow' and status='WAITING' order by priority asc, updated_at desc limit 10`,
    usecases: `select id,title,priority,status,updated_at from use_cases where project_id='leadflow' order by updated_at desc limit 12`,
    e2e: `select id,title,status,updated_at from e2e_test_specs where project_id='leadflow' order by updated_at desc limit 12`
  };
  for (const [name, q] of Object.entries(queries)) {
    const r = await c.query(q);
    console.log(`\n## ${name.toUpperCase()}`);
    console.log(JSON.stringify(r.rows, null, 2));
  }
  await c.end();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
