const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fptrokacdwzlmflyczdz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdHJva2FjZHd6bG1mbHljemR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTcxMTgxNSwiZXhwIjoyMDg3Mjg3ODE1fQ.NcGeeYQyTaY3n-w22yjxUPxJ5ZC4v6b3Kv7gnr0TGcU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTaskStatus() {
  try {
    // Try to find and update the task
    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completion_notes: 'Agent Onboarding UI completed with:\n' +
          '- Complete 5-step onboarding flow\n' +
          '- Agent profile setup page with form validation\n' +
          '- Integration connection screens (FUB, Twilio, Cal.com)\n' +
          '- Error handling and loading states\n' +
          '- Responsive design for mobile/desktop'
      })
      .eq('id', 'local-1771968192319-779d9ybqy')
      .select();

    if (error) {
      console.error('Error updating task:', error);
      
      // If table doesn't exist, try completed_work table
      const { data: workData, error: workError } = await supabase
        .from('completed_work')
        .insert({
          project_id: 'bo2026',
          work_name: 'Agent Onboarding UI',
          description: 'Complete Agent Onboarding UI including onboarding flow, profile setup, and integration connection screens',
          category: 'FEATURE',
          status: 'COMPLETE',
          completed_date: new Date().toISOString(),
          metadata: {
            task_id: 'local-1771968192319-779d9ybqy',
            deliverables: [
              'Complete onboarding flow UI components',
              'Agent profile setup page with form validation',
              'Integration connection screens for FUB, Twilio, Cal.com',
              'Error handling and loading states',
              'Responsive design for mobile/desktop'
            ]
          }
        })
        .select();

      if (workError) {
        console.error('Error inserting completed work:', workError);
        process.exit(1);
      }

      console.log('✅ Task status updated in completed_work table:', workData);
    } else {
      console.log('✅ Task status updated in tasks table:', data);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

updateTaskStatus();