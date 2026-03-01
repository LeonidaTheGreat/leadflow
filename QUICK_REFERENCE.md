# 🚀 Supabase Integration - Quick Reference for Stojan

## TL;DR

**Supabase tasks table is now the single source of truth.** DASHBOARD.md and dashboard-simple.html auto-sync from it. Leonida maintains everything.

## What You See

### 1. **Live Dashboard** (Open in Browser)
📍 `file:///Users/clawdbot/.openclaw/workspace/business-opportunities-2026/dashboard-simple.html`

- Auto-refreshes every 10 seconds
- Shows: Ready | In Progress | Blocked | Done
- Shows cost per task

### 2. **Dashboard.md** (Local File)
📍 `/Users/clawdbot/.openclaw/workspace/business-opportunities-2026/DASHBOARD.md`

- Auto-generated snapshot
- Updated every time a task changes status
- Shows queue tables, health status, cost summary

### 3. **Supabase Table** (Source of Truth)
📍 Database: `https://fptrokacdwzlmflyczdz.supabase.co`
📍 Table: `tasks`

- Direct access to all task data
- Columns: title, status, agent_id, model, estimated_cost_usd, metadata, etc.

---

## How Leonida Maintains It

### When I Spawn an Agent
```
You: "Go ahead with Pilot Validation"
↓
Me: Update Supabase → status='in_progress'
↓
DASHBOARD.md regenerated
↓
Your browser refreshes in 10s → see it moved to "⚡ In Progress"
```

### When Agent Completes
```
Agent finishes Pilot Validation
↓
Me: Update Supabase → status='done'
↓
DASHBOARD.md regenerated
↓
Auto-unblock any blocked dependent tasks
↓
Your browser refreshes → see task moved to "✅ Done"
```

---

## What Changed

| Before | Now |
|--------|-----|
| Manual task files | Supabase single table |
| Manual DASHBOARD updates | Auto-generated from Supabase |
| Stale status | Live sync (10s refresh) |
| Had to find task info in files | All in one Supabase table |

---

## Your Commands (Unchanged)

Still say things to me in this Telegram topic:
- "Go ahead with Pilot Validation"
- "Pause work"
- "What's the status?"
- "Increase budget to $10"

Me: Same as before, except now I'm syncing everything to Supabase.

---

## Check Status Any Time

**In Telegram:** Ask me "what's the status?"

**In Browser:** Open `dashboard-simple.html`

**In Terminal:** 
```bash
cd /Users/clawdbot/.openclaw/workspace/business-opportunities-2026
node orchestrator-supabase.js status      # Queue health
node orchestrator-supabase.js queue        # Full queue
```

---

## The System Works Because

1. **Supabase is reliable** — single source of truth, persists across sessions
2. **DASHBOARD.md regenerates instantly** — every task update triggers it
3. **HTML dashboard is passive** — just reads Supabase every 10s
4. **Leonida keeps everything synced** — I call the orchestrator API on every action
5. **No manual updates needed** — fully automated

---

## If Something Breaks

**DASHBOARD.md is stale?**
```bash
node generate-dashboard.js
```

**Want to see what Leonida sees?**
```bash
node orchestrator-supabase.js status
```

**Want to watch queue live?**
```bash
node supabase-client.js watch
```

---

## Key Metrics to Watch

From `dashboard-simple.html` or `node orchestrator-supabase.js status`:

- **Ready:** How many tasks I can spawn next
- **In Progress:** How many agents are running
- **Blocked:** Waiting on dependencies
- **Done:** Completed work
- **Total Cost:** Estimated budget burn

---

## Architecture (For Reference)

```
┌─────────────────────────────────────┐
│   Supabase (tasks table)            │
│   ↑ Updated by: Leonida             │
│   ↓ Read by: Everyone               │
└──────────────┬──────────────────────┘
               │
         ┌─────┼─────┐
         ↓     ↓     ↓
   DASHBOARD  HTML  Leonida
    .md      Browser Code
 (snapshot) (live view) (orchestrator)
```

Supabase is the hub. Everything else syncs from it.

---

## Next Steps

1. ✅ Supabase integration complete
2. ⏳ Stojan: Give Leonida task commands in this Telegram topic
3. ⏳ Leonida: Maintain queue by calling orchestrator API
4. ⏳ Dashboard: Auto-updates as tasks change

**You don't need to do anything.** Just command Leonida as before.

---

*This system keeps your task queue, dashboards, and orchestrator perfectly in sync. Single source of truth = no more manual updates.*
