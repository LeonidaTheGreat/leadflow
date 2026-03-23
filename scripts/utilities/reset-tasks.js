require('dotenv').config()
const {TaskStore} = require('./task-store');
const store = new TaskStore();
const ids = [
  'af8a351f-7d7a-41d4-af85-29d465482233',
  '769ee4a7-6420-46d9-8b55-0ad7df2443d7',
  '461d14d6-0a2e-4f64-b527-4d3c81502bfd',
  'c87f4663-5f8d-49ac-aab4-a462395d489f',
  'c6186d01-0699-4011-9e51-310144e2f3fa',
  '4a809711-3fa8-42e4-b7a4-2a9b3cc31ec4'
];
async function fix() {
  for (const id of ids) {
    await store.updateTask(id, { status: 'ready', started_at: null });
    console.log('reset:', id);
  }
  process.exit(0);
}
fix();
