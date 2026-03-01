require('dotenv').config()
const {TaskStore} = require('./task-store');
const store = new TaskStore();
store.getTasks().then(tasks => {
  console.log('Total tasks:', tasks.length)
  tasks.filter(t => !t.agent_id).forEach(t =>
    console.log(t.id, '|', t.title, '|', t.status)
  );
  process.exit(0);
});
