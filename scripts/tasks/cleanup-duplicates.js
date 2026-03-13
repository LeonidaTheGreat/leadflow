#!/usr/bin/env node
/**
 * Clean up duplicate tasks in Supabase
 */

const ProjectQuery = require('./query-project')

async function fullCleanup() {
  const query = new ProjectQuery()
  const all = await query.getTaskQueue()
  
  // Group by title
  const byTitle = {}
  all.all.forEach(t => {
    if (!byTitle[t.title]) byTitle[t.title] = []
    byTitle[t.title].push(t)
  })
  
  console.log('\n📊 TASK COUNTS BY TITLE:')
  let totalDeleted = 0
  
  for (const [title, tasks] of Object.entries(byTitle).sort((a, b) => b[1].length - a[1].length)) {
    if (tasks.length > 1) {
      console.log(`\n⚠️  '${title}' has ${tasks.length} copies:`)
      tasks.forEach(t => {
        console.log(`   - ${t.id.substring(0,8)} | ${t.status.padEnd(12)} | ${t.created_at}`)
      })
      
      // Delete all but newest
      tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      const toDelete = tasks.slice(1)
      console.log(`   → Keeping newest (${tasks[0].id.substring(0,8)}...), deleting ${toDelete.length} older...`)
      
      for (const t of toDelete) {
        // First delete any dependencies referencing this task
        await query.supabase.from('task_dependencies').delete().eq('task_id', t.id)
        await query.supabase.from('task_dependencies').delete().eq('depends_on_task_id', t.id)
        
        // Then delete the task
        const { error } = await query.supabase.from('tasks').delete().eq('id', t.id)
        if (error) {
          console.error(`   ❌ Failed to delete ${t.id}: ${error.message}`)
        } else {
          console.log(`   ✅ Deleted ${t.id.substring(0,8)}...`)
          totalDeleted++
        }
      }
    }
  }
  
  console.log(`\n✅ Deleted ${totalDeleted} duplicate tasks`)
}

fullCleanup().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
