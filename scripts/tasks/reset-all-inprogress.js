require('dotenv').config()
const {TaskStore} = require('./task-store');
const store = new TaskStore();
async function fix() {
  const tasks = await store.getTasks();
  const inProgress = tasks.filter(t => t.status === 'in_progress');
  console.log(`Resetting ${inProgress.length} in_progress tasks to ready`);
  for (const t of inProgress) {
    await store.updateTask(t.id, { status: 'ready', started_at: null });
    console.log('reset:', t.title);
  }
  process.exit(0);
}
fix();
