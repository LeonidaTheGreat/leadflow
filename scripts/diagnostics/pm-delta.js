require('dotenv').config({ path: require('os').homedir() + '/.env' });
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.LOCAL_PG_URL });
  await client.connect();
  const queries = {
    openTasks: `select id,title,status,priority,agent_id,updated_at from tasks where project_id='leadflow' and status not in ('completed','cancelled','failed','done') order by priority asc nulls last, updated_at desc limit 20`,
    stuckUCs: `select id,name,implementation_status,priority,revenue_impact,updated_at from use_cases where project_id='leadflow' and implementation_status in ('stuck','partial','in_progress','ready') order by priority asc nulls last, updated_at desc limit 20`,
    recentUCs: `select id,name,implementation_status,priority,revenue_impact,updated_at from use_cases where project_id='leadflow' order by updated_at desc limit 10`,
    recentE2E: `select id,use_case_id,test_name,last_result,updated_at from e2e_test_specs where project_id='leadflow' order by updated_at desc limit 10`,
    waitingActions: `select title,type,priority,created_at from action_items where project_id='leadflow' and status='WAITING' order by priority asc, created_at desc limit 10`,
    recentFeedback: `select feedback_type,processed,created_at,data->>'summary' as summary,data->>'severity' as severity from product_feedback where project_id='leadflow' order by created_at desc limit 10`
  };
  for (const [k, q] of Object.entries(queries)) {
    const r = await client.query(q);
    console.log(`\n## ${k}`);
    console.log(JSON.stringify(r.rows, null, 2));
  }
  await client.end();
})().catch(err => { console.error(err); process.exit(1); });
