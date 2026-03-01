#!/usr/bin/env python3
"""
Patches dashboard.html:
1. Replaces loadAgents() with task-derived version
2. Adds showTaskDetail() modal function
"""

import re

DASHBOARD_PATH = '/Users/clawdbot/projects/leadflow/dashboard.html'

with open(DASHBOARD_PATH, 'r') as f:
    content = f.read()

# New loadAgents function
new_load_agents = '''async function loadAgents() {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', PROJECT_ID);

  if (error || !tasks) {
    document.getElementById('agent-activity-content').innerHTML = '<div class="error">Failed to load tasks</div>';
    return;
  }

  const agentIds = ['dev', 'qc', 'analytics', 'marketing', 'design', 'product-manager'];
  const agentLabels = {
    'dev': 'Dev', 'qc': 'QC', 'analytics': 'Analytics',
    'marketing': 'Marketing', 'design': 'Design', 'product-manager': 'Product Manager'
  };

  const agentData = agentIds.map(agentId => {
    const agentTasks = tasks.filter(t => t.agent_id === agentId);
    const inProgress = agentTasks.filter(t => t.status === 'in_progress');
    const done = agentTasks.filter(t => t.status === 'done');
    const ready = agentTasks.filter(t => t.status === 'ready');
    const blocked = agentTasks.filter(t => t.status === 'blocked');
    const total = agentTasks.length;
    const progress = total > 0 ? Math.round((done.length / total) * 100) : 0;
    const currentTasks = inProgress
      .sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0))
      .slice(0, 3);
    const status = inProgress.length > 0 ? 'ACTIVE'
      : blocked.length > 0 ? 'BLOCKED'
      : ready.length > 0 ? 'READY'
      : done.length > 0 ? 'COMPLETE' : 'IDLE';
    const lastActivity = inProgress.length > 0
      ? inProgress.sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0))[0].started_at
      : done.length > 0
      ? done.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0].updated_at
      : null;
    return { agentId, label: agentLabels[agentId] || agentId, status, progress, currentTasks, blockedTasks: blocked, readyCount: ready.length, doneCount: done.length, totalCount: total, lastActivity };
  }).filter(a => a.totalCount > 0);

  if (agentData.length === 0) {
    document.getElementById('agent-activity-content').innerHTML = '<div class="muted">No agent activity yet</div>';
    return;
  }

  const html = agentData.map(agent => {
    const statusClass = agent.status === 'ACTIVE' ? 'ok' : agent.status === 'BLOCKED' ? 'error' : agent.status === 'COMPLETE' ? 'ok' : '';
    const statusDot = agent.status === 'ACTIVE' ? 'ok' : agent.status === 'BLOCKED' ? 'bad' : agent.status === 'COMPLETE' ? 'ok' : 'warn';
    const timeAgo = agent.lastActivity ? (() => {
      const diff = Date.now() - new Date(agent.lastActivity).getTime();
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      return hrs > 0 ? `${hrs}h ago` : mins > 0 ? `${mins}m ago` : 'just now';
    })() : null;
    const progressBar = `<div style="background:#1e2a58;border-radius:4px;height:4px;margin:8px 0;"><div style="background:${agent.progress >= 80 ? '#57d98d' : agent.progress >= 50 ? '#ffd166' : '#ff6b6b'};width:${agent.progress}%;height:4px;border-radius:4px;transition:width 0.3s;"></div></div>`;
    const currentTasksHtml = agent.currentTasks.length > 0
      ? agent.currentTasks.map(t => `<div style="margin-top:4px;font-size:11px;display:flex;justify-content:space-between;align-items:center;"><span style="color:#e8ecff;cursor:pointer;" onclick="showTaskDetail('${t.id}')" title="Click for details">⚡ ${t.title}</span><span class="pill" style="font-size:10px;">${t.model || 'kimi'}</span></div>`).join('')
      : `<div class="muted small" style="margin-top:4px;">No active tasks</div>`;
    const blockedHtml = agent.blockedTasks.length > 0
      ? `<div style="margin-top:6px;font-size:11px;color:#ff6b6b;">⏸ ${agent.blockedTasks[0].title}${agent.blockedTasks[0].blocked_reason ? ': ' + agent.blockedTasks[0].blocked_reason : ''}</div>` : '';
    return `<div class="card ${statusClass}"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><div><span class="${statusDot}">●</span><strong style="margin-left:4px;">${agent.label}</strong></div><span class="pill" style="font-size:10px;">${agent.status}</span></div>${progressBar}<div style="font-size:11px;color:#a8b3dd;display:flex;justify-content:space-between;"><span>${agent.doneCount} done / ${agent.totalCount} total</span>${timeAgo ? `<span>${timeAgo}</span>` : ''}</div>${currentTasksHtml}${blockedHtml}</div>`;
  }).join('');

  document.getElementById('agent-activity-content').innerHTML = html;
}'''

# showTaskDetail function to inject before </script>
show_task_detail = '''
function showTaskDetail(taskId) {
  supabase.from('tasks').select('*').eq('id', taskId).single().then(({ data: t, error }) => {
    if (error || !t) return;
    const existing = document.getElementById('task-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'task-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `<div style="background:#131a33;border:1px solid #24305f;border-radius:16px;padding:24px;max-width:560px;width:100%;max-height:80vh;overflow-y:auto;"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;"><h3 style="margin:0;font-size:16px;">${t.title}</h3><button onclick="document.getElementById('task-modal').remove()" style="background:none;border:none;color:#a8b3dd;font-size:20px;cursor:pointer;padding:0 0 0 16px;">✕</button></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-bottom:16px;"><div><span class="muted">Status</span><br><strong>${t.status}</strong></div><div><span class="muted">Agent</span><br><strong>${t.agent_id || '-'}</strong></div><div><span class="muted">Model</span><br><strong>${t.model || 'kimi'}</strong></div><div><span class="muted">Est. Cost</span><br><strong>$${(t.estimated_cost_usd || 0).toFixed(2)}</strong></div><div><span class="muted">Priority</span><br><strong>${t.priority || '-'}</strong></div><div><span class="muted">Started</span><br><strong>${t.started_at ? new Date(t.started_at).toLocaleString() : '-'}</strong></div></div>${t.description ? `<div style="font-size:12px;margin-bottom:12px;"><span class="muted">Description</span><br><div style="margin-top:4px;color:#e8ecff;line-height:1.6;">${t.description}</div></div>` : ''}${t.acceptance_criteria ? `<div style="font-size:12px;margin-bottom:12px;"><span class="muted">Acceptance Criteria</span><br><div style="margin-top:4px;color:#e8ecff;line-height:1.6;">${t.acceptance_criteria}</div></div>` : ''}${t.blocked_reason ? `<div style="font-size:12px;color:#ff6b6b;"><span class="muted">Blocked:</span> ${t.blocked_reason}</div>` : ''}</div>`;
    document.body.appendChild(modal);
  });
}
'''

# Replace loadAgents function
old_pattern = re.compile(
    r'// Agents\s*\nasync function loadAgents\(\).*?^}',
    re.DOTALL | re.MULTILINE
)

if old_pattern.search(content):
    content = old_pattern.sub('// Agents\n' + new_load_agents, content)
    print('✓ Replaced loadAgents()')
else:
    print('⚠️  Could not find loadAgents() — check pattern')

# Inject showTaskDetail before last </script>
if 'showTaskDetail' not in content:
    content = content.replace('</script>', show_task_detail + '\n</script>', 1)
    print('✓ Added showTaskDetail()')
else:
    print('ℹ️  showTaskDetail already present')

with open(DASHBOARD_PATH, 'w') as f:
    f.write(content)

print('✓ dashboard.html updated')
