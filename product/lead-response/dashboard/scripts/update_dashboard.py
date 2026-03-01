#!/usr/bin/env python3
"""
Dashboard Auto-Updater - Simple Python version
Reads task-tracker.json and updates DASHBOARD.md and dashboard.html
"""

import json
import re
from datetime import datetime
from pathlib import Path

# Paths
BO2026_ROOT = Path("/Users/clawdbot/.openclaw/workspace/business-opportunities-2026")
DASHBOARD_MD = BO2026_ROOT / "DASHBOARD.md"
DASHBOARD_HTML = BO2026_ROOT / "dashboard.html"
TASK_TRACKER = BO2026_ROOT / "task-tracker.json"

def load_task_tracker():
    """Load task-tracker.json"""
    with open(TASK_TRACKER) as f:
        return json.load(f)

def update_dashboard_md(tracker):
    """Update DASHBOARD.md with current agent status"""
    if not DASHBOARD_MD.exists():
        print("WARNING: DASHBOARD.md not found")
        return

    content = DASHBOARD_MD.read_text()

    # Build agent table rows
    rows = []
    active_count = 0
    blocked_count = 0

    for key, agent in tracker.get("agents", {}).items():
        status_icon = "[OK]" if agent.get("status") == "In Progress" else "[BLOCKED]" if agent.get("blocker") else "[WARN]"
        if agent.get("status") == "In Progress":
            active_count += 1
        if agent.get("blocker"):
            blocked_count += 1

        deliverables = agent.get("deliverables", [])
        completed = sum(1 for d in deliverables if d.get("status") == "done")
        total = len(deliverables)

        last_activity = agent.get("lastActivity", "Unknown")
        if last_activity != "Unknown":
            try:
                last_activity = datetime.fromisoformat(last_activity.replace("Z", "+00:00")).strftime("%Y-%m-%d")
            except:
                pass

        current_task = agent.get("currentTask", "-")
        if agent.get("blocker"):
            current_task += f" (BLOCKED: {agent['blocker']})"

        rows.append(f"| **{agent['name']}** | {agent['model']} | {status_icon} {agent.get('status', '-')} | {agent.get('progress', '-')} | {current_task} | {completed}/{total} | {last_activity} |")

    # Build new agent section
    agent_rows = "\n".join(rows)
    system_status = "[OK]" if active_count > 0 else "[BLOCKED]"
    status_line = f"**System Status:** {system_status} {active_count}/{len(tracker.get('agents', {}))} Agents Active | 24/7 Uptime"
    if blocked_count > 0:
        status_line += f" | {blocked_count} Blocked"

    new_section = f"""<!-- AGENT_ACTIVITY_START -->
| Agent | Model | Status | Progress | Current Task | Tasks | Last Activity |
|-------|-------|--------|----------|--------------|-------|---------------|
{agent_rows}

{status_line}
<!-- AGENT_ACTIVITY_END -->"""

    # Replace in content
    pattern = r"<!-- AGENT_ACTIVITY_START -->.*?<!-- AGENT_ACTIVITY_END -->"
    content = re.sub(pattern, new_section, content, flags=re.DOTALL)

    # Update footer
    now = datetime.now().isoformat()
    next_check = datetime.fromtimestamp(datetime.now().timestamp() + 15*60).isoformat()

    # Remove old footer
    content = re.sub(r"\n\n---\n\n\*\*Auto-Updated:.*", "", content, flags=re.DOTALL)

    # Add new footer
    footer = f"""

---

**Auto-Updated:** {now}
**Source:** task-tracker.json
**Next Check:** {next_check}"""
    content += footer

    DASHBOARD_MD.write_text(content)
    print("Updated DASHBOARD.md")

def update_dashboard_html(tracker):
    """Update dashboard.html with current agent status"""
    if not DASHBOARD_HTML.exists():
        print("WARNING: dashboard.html not found")
        return

    html = DASHBOARD_HTML.read_text()

    # Count blockers
    agents = tracker.get("agents", {})
    blocked_count = sum(1 for a in agents.values() if a.get("blocker"))
    total_agents = len(agents)

    # Update system status banner
    if blocked_count > 0:
        # Show blocked banner
        blocked_banner = f'''  <!-- BLOCKED BANNER -->
  <div class="card bad" style="margin:16px 0;">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:24px;">BLOCKED</span>
      <div>
        <div style="font-weight:700;">{blocked_count} OF {total_agents} AGENTS BLOCKED</div>
        <div class="muted">Critical dependencies blocking progress. See agent cards below for details.</div>
      </div>
    </div>
  </div>'''
        # Replace the no blockers banner
        banner_pattern = r'  <!-- NO BLOCKERS BANNER -->.*?  </div>\n'
        html = re.sub(banner_pattern, blocked_banner + "\n", html, flags=re.DOTALL)

    # Update NEXT ACTION section
    dev_agent = agents.get("dev", {})
    if dev_agent.get("blocker") and "FUB Pro+" in dev_agent.get("blocker", ""):
        # FUB upgrade is the blocker - update next action
        new_next_action = '''  <!-- NEXT ACTION -->
  <div class="next-action">
    <div class="next-action-title">NEXT ACTION — START HERE</div>
    <div style="font-size:14px;margin-bottom:12px;">
      <strong>Upgrade FUB to Pro+ Tier</strong> (Stojan action required)
    </div>
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
      LeadFlow MVP deployed. FUB webhook integration blocked on Pro+ tier.<br>
      This is the critical blocker for all downstream agent activities.
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <code style="background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:6px;font-size:12px;">
        FollowUpBoss.com → Settings → Billing → Pro+
      </code>
      <span class="pill bad">BLOCKING: 4/5 agents</span>
    </div>
  </div>'''
        next_action_pattern = r'  <!-- NEXT ACTION -->.*?</div>\n  </div>'
        html = re.sub(next_action_pattern, new_next_action, html, flags=re.DOTALL)

        # Also update the roadmap task
        html = html.replace(
            '>🟡 Deploy to Vercel (2 hrs)<',
            '>BLOCKED: FUB API Token Expired<'
        )
        html = html.replace(
            '>Deploy to Vercel</strong> ← START HERE<',
            '>Refresh FUB API Key</strong> ← START HERE<'
        )
        html = html.replace(
            '>Upgrade FUB to Pro+</strong> ← START HERE<',
            '>Refresh FUB API Key</strong> ← START HERE<'
        )
    elif dev_agent.get("blocker") and "expired" in dev_agent.get("blocker", "").lower():
        # Expired token blocker
        new_next_action = '''  <!-- NEXT ACTION -->
  <div class="next-action">
    <div class="next-action-title">NEXT ACTION — START HERE</div>
    <div style="font-size:14px;margin-bottom:12px;">
      <strong>Refresh FUB API Key</strong> (Stojan action required)
    </div>
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
      Current API key (fka_0GF...) has expired. Webhook registration requires fresh admin key.<br>
      Go to FollowUpBoss → Admin → API → Generate new key.
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <code style="background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:6px;font-size:12px;">
        FollowUpBoss.com → Admin → API Keys → Generate New
      </code>
      <span class="pill bad">BLOCKING: 4/5 agents</span>
    </div>
  </div>'''
        next_action_pattern = r'  <!-- NEXT ACTION -->.*?</div>\n  </div>'
        html = re.sub(next_action_pattern, new_next_action, html, flags=re.DOTALL)

    # Build agent cards
    cards = []
    active_count = 0

    for key, agent in tracker.get("agents", {}).items():
        status_color = "ok" if agent.get("status") == "In Progress" else "bad" if agent.get("blocker") else "warn"
        status_icon = "●" if agent.get("status") == "In Progress" else "✕" if agent.get("blocker") else "○"
        if agent.get("status") == "In Progress":
            active_count += 1

        deliverables = agent.get("deliverables", [])
        completed = sum(1 for d in deliverables if d.get("status") == "done")
        total = len(deliverables)

        last_activity = agent.get("lastActivity", "Unknown")
        if last_activity != "Unknown":
            try:
                last_activity = datetime.fromisoformat(last_activity.replace("Z", "+00:00")).strftime("%Y-%m-%d")
            except:
                pass

        blocker_html = f'<br><span class="bad">Blocked: {agent["blocker"]}</span>' if agent.get("blocker") else ""

        card = f'''    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div>
          <span class="{status_color}">{status_icon}</span> <strong>{agent['name']}</strong>
          <span class="pill" style="margin-left:8px;">{agent['model']}</span>
        </div>
        <span class="{status_color}">{agent.get('progress', '-')}</span>
      </div>
      <div class="muted">{agent.get('currentTask', '-')}</div>
      <div style="margin-top:8px;font-size:11px;">
        <span class="{status_color}">{completed}/{total} tasks</span> •
        <span class="muted">Last: {last_activity}</span>{blocker_html}
      </div>
    </div>'''
        cards.append(card)

    # System card
    total_agents = len(tracker.get("agents", {}))
    system_card = f'''    <div class="card" style="background:var(--bg-card-ok);border-color:var(--border-ok);">
      <div style="text-align:center;padding:10px;">
        <div class="ok" style="font-size:24px;margin-bottom:8px;">Goal</div>
        <div><strong>System Status</strong></div>
        <div class="muted" style="margin-top:4px;">{active_count}/{total_agents} Agents Active</div>
        <div class="ok" style="margin-top:4px;">24/7 Uptime</div>
      </div>
    </div>'''

    all_cards = "\n".join(cards) + "\n" + system_card

    # Replace agent activity section
    pattern = r'<div class="grid" id="agent-activity">.*?(?=<!-- THIS WEEK)'
    replacement = f'<div class="grid" id="agent-activity">\n{all_cards}\n  </div>\n'
    html = re.sub(pattern, replacement, html, flags=re.DOTALL)

    # Update timestamp
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    html = re.sub(
        r'<p style="margin-top: 10px;">Last Updated: .*?</p>',
        f'<p style="margin-top: 10px;">Last Updated: {now} EST</p>',
        html
    )

    # Update auto-update comment
    iso_now = datetime.now().isoformat()
    comment = f"<!-- Auto-updated: {iso_now} -->"
    if "Auto-updated:" in html:
        html = re.sub(r"<!-- Auto-updated: .*? -->", comment, html)
    else:
        html = html.replace("<head>", f"<head>\n    {comment}")

    DASHBOARD_HTML.write_text(html)
    print("Updated dashboard.html")

def load_model_metrics():
    """Load model performance metrics from logs"""
    metrics = {
        'qwen3-next': {'attempts': 0, 'successes': 0, 'cost': 0},
        'haiku': {'attempts': 0, 'successes': 0, 'cost': 0},
        'sonnet': {'attempts': 0, 'successes': 0, 'cost': 0},
        'opus': {'attempts': 0, 'successes': 0, 'cost': 0}
    }
    
    # Load from spawn log
    spawn_log = BO2026_ROOT / "spawn-log.jsonl"
    if spawn_log.exists():
        with open(spawn_log) as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    model = entry.get('initialModel', 'qwen3-next')
                    if model in metrics:
                        metrics[model]['attempts'] += 1
                        if entry.get('success'):
                            metrics[model]['successes'] += 1
                        metrics[model]['cost'] += entry.get('cost', 0)
                except:
                    pass
    
    return metrics

def update_model_metrics_html():
    """Update model performance section in dashboard.html"""
    if not DASHBOARD_HTML.exists():
        return
    
    html = DASHBOARD_HTML.read_text()
    metrics = load_model_metrics()
    
    # Calculate rates and totals
    total_tasks = sum(m['attempts'] for m in metrics.values())
    total_cost = sum(m['cost'] for m in metrics.values())
    total_escalations = 0  # Would need to track from spawn log
    
    # Update the metrics cards (simplified - uses placeholder data for now)
    # In production, this would read from the actual metrics files
    
    print(f"Model metrics: {total_tasks} tasks, ${total_cost:.2f} cost")

def main():
    print("Dashboard Auto-Updater (Python)\n")

    tracker = load_task_tracker()
    update_dashboard_md(tracker)
    update_dashboard_html(tracker)
    update_model_metrics_html()

    print("\nDashboard sync complete!")

    # Summary
    print("\n--- AGENT STATUS ---")
    for key, agent in tracker.get("agents", {}).items():
        status = agent.get("status", "-")
        blocker = agent.get("blocker")
        if blocker:
            print(f"[BLOCKED] {agent['name']}: {blocker}")
        elif status == "In Progress":
            print(f"[OK] {agent['name']}: {agent.get('currentTask', '-')}")
        else:
            print(f"[{status}] {agent['name']}")

if __name__ == "__main__":
    main()
