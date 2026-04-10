const { createClient } = require('../../lib/db')
require('dotenv').config()

const db = createClient(
  process.env.NEXT_PUBLIC_API_URL,
  process.env.API_SECRET_KEY
)

async function queryTaskState() {
  const { data: tasks, error } = await db
    .from('tasks')
    .select('*')
    .order('updated_at', { ascending: false })
  
  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }
  
  const counts = {
    backlog: tasks.filter(t => t.status === 'backlog').length,
    ready: tasks.filter(t => t.status === 'ready').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    decomposed: tasks.filter(t => t.status === 'decomposed').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    done: tasks.filter(t => t.status === 'done').length
  }
  
  const readyTasks = tasks.filter(t => t.status === 'ready')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const blockedTasks = tasks.filter(t => t.status === 'blocked')
  
  console.log(JSON.stringify({
    total: tasks.length,
    counts,
    readyTasks: readyTasks.map(t => ({ id: t.id, title: t.title, metadata: t.metadata })),
    inProgressTasks: inProgressTasks.map(t => ({ id: t.id, title: t.title, metadata: t.metadata, updated_at: t.updated_at })),
    blockedTasks: blockedTasks.map(t => ({ id: t.id, title: t.title }))
  }, null, 2))
}

queryTaskState()
