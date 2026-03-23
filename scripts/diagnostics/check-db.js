require('dotenv').config()
const {TaskStore} = require('./task-store');
const store = new TaskStore();
async function check() {
  const tasks = await store.getTasks();
  const inProgress = tasks.filter(t => t.status === 'in_progress');
  console.log('In progress tasks:', inProgress.map(t => `${t.title} → ${t.agent_id}`));
  process.exit(0);
}
check();
