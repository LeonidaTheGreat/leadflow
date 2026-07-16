/**
 * Admin Email Verification Override
 *
 * GET  /admin/activation                — HTML page listing unverified agents (Verify / Verify All)
 * GET  /api/admin/unverified-agents     — JSON list of agents with email_verified=false
 * POST /api/admin/verify-email          — set email_verified=true for one or all agents
 *
 * Auth: LEADFLOW_API_KEY via x-api-key header (JSON endpoints only)
 *
 * UC: uc-admin-email-verify-override
 */

'use strict';

const express = require('express');
const router = express.Router();
const { getPool } = require('../../lib/db');
const requireApiKey = require('../../lib/middleware/require-api-key');
const { logger } = require('../../lib/logger');

const log = logger.child('admin-verify-email');

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app').trim().replace(/\/$/, '');

const SQL_UNVERIFIED = `
  SELECT id, email, first_name, last_name, created_at
  FROM real_estate_agents
  WHERE email_verified = false
  ORDER BY created_at ASC
`;

const SQL_VERIFY_ONE = `
  UPDATE real_estate_agents
  SET email_verified = true, updated_at = NOW()
  WHERE id = $1
  RETURNING id, email, first_name, last_name
`;

const SQL_VERIFY_ALL = `
  UPDATE real_estate_agents
  SET email_verified = true, updated_at = NOW()
  WHERE email_verified = false
  RETURNING id
`;

// ─── GET /api/admin/unverified-agents ────────────────────────────────────────
router.get('/api/admin/unverified-agents', requireApiKey, async (req, res) => {
  try {
    const { rows } = await getPool().query(SQL_UNVERIFIED);
    return res.json({ agents: rows, count: rows.length });
  } catch (err) {
    log.error('Failed to fetch unverified agents', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/admin/verify-email ────────────────────────────────────────────
router.post('/api/admin/verify-email', requireApiKey, async (req, res) => {
  const { agentId, all } = req.body || {};
  const loginUrl = `${APP_URL}/login`;

  if (all) {
    try {
      const { rows } = await getPool().query(SQL_VERIFY_ALL);
      return res.json({ success: true, count: rows.length, loginUrl });
    } catch (err) {
      log.error('Failed to bulk-verify agents', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (!agentId || typeof agentId !== 'string') {
    return res.status(400).json({ error: 'agentId is required' });
  }

  try {
    const { rows } = await getPool().query(SQL_VERIFY_ONE, [agentId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const agent = rows[0];
    return res.json({
      success: true,
      agentId: agent.id,
      email: agent.email,
      firstName: agent.first_name,
      lastName: agent.last_name,
      loginUrl,
    });
  } catch (err) {
    log.error('Failed to verify agent', err, 'DB', { agentId });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /admin/activation ────────────────────────────────────────────────────
// Browser-facing HTML page. Auth handled client-side: user pastes the API key
// which is stored in sessionStorage and sent as x-api-key on each API call.
router.get('/admin/activation', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — Email Verification Override</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #333; padding: 24px; }
    h1 { font-size: 1.5rem; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 0.875rem; margin-bottom: 24px; }
    .card { background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08); padding: 20px; margin-bottom: 20px; }
    .auth-row { display: flex; gap: 8px; align-items: center; }
    .auth-row input { flex: 1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 0.875rem; }
    button { cursor: pointer; border: none; border-radius: 6px; padding: 8px 16px; font-size: 0.875rem; font-weight: 500; }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }
    .btn-danger { background: #dc2626; color: #fff; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-verify { background: #16a34a; color: #fff; padding: 6px 12px; }
    .btn-verify:hover { background: #15803d; }
    .btn-verify:disabled { background: #86efac; cursor: not-allowed; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 10px 12px; border-bottom: 2px solid #e5e7eb; font-size: 0.75rem; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .login-link { display: inline-flex; align-items: center; gap: 6px; color: #2563eb; text-decoration: none; font-size: 0.8125rem; padding: 4px 8px; border: 1px solid #bfdbfe; border-radius: 4px; background: #eff6ff; }
    .login-link:hover { background: #dbeafe; }
    .status { padding: 12px 16px; border-radius: 6px; font-size: 0.875rem; margin-top: 16px; }
    .status.info { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .status.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .status.success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .empty { text-align: center; color: #9ca3af; padding: 32px; }
    .bulk-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
    .count-badge { background: #e5e7eb; color: #374151; border-radius: 12px; padding: 2px 10px; font-size: 0.8125rem; font-weight: 600; }
    #status-msg { display: none; }
    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <h1>Email Verification Override</h1>
  <p class="subtitle">Manually verify agents who cannot verify via the email link.</p>

  <div class="card" id="auth-card">
    <p style="margin-bottom:10px;font-size:.875rem;font-weight:500;">Enter your admin API key to continue:</p>
    <div class="auth-row">
      <input type="password" id="api-key-input" placeholder="LEADFLOW_API_KEY" autocomplete="off" />
      <button class="btn-primary" id="auth-btn" onclick="loadAgents()">Load agents</button>
    </div>
  </div>

  <div id="main" style="display:none;">
    <div class="card">
      <div class="bulk-row">
        <span>Unverified agents: <span class="count-badge" id="agent-count">0</span></span>
        <button class="btn-danger" id="verify-all-btn" onclick="verifyAll()">Verify All</button>
      </div>
      <div id="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Signed up</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="agents-tbody">
            <tr><td colspan="4" class="empty">Loading&hellip;</td></tr>
          </tbody>
        </table>
      </div>
      <div id="status-msg" class="status info"></div>
    </div>
  </div>

  <script>
    function apiKey() {
      return sessionStorage.getItem('lf_admin_key') || '';
    }

    function fmtDate(iso) {
      const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function agentName(a) {
      const n = [a.first_name, a.last_name].filter(Boolean).join(' ');
      return n || a.email;
    }

    function showStatus(msg, type) {
      const el = document.getElementById('status-msg');
      el.textContent = msg;
      el.className = 'status ' + (type || 'info');
      el.style.display = 'block';
    }

    function escHtml(s) {
      return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    function loginLink(url) {
      return '<a class="login-link" href="' + escHtml(url) + '" target="_blank" rel="noopener">Open login &rarr;</a>';
    }

    function renderTable(agents) {
      const tbody = document.getElementById('agents-tbody');
      document.getElementById('agent-count').textContent = agents.length;
      if (agents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">No unverified agents found.</td></tr>';
        return;
      }
      tbody.innerHTML = agents.map(function(a) {
        return '<tr id="row-' + a.id + '">' +
          '<td>' + escHtml(agentName(a)) + '</td>' +
          '<td>' + escHtml(a.email) + '</td>' +
          '<td>' + fmtDate(a.created_at) + '</td>' +
          '<td><button class="btn-verify" id="btn-' + a.id + '" onclick="verifySingle(' + JSON.stringify(a.id) + ')">Verify</button></td>' +
          '</tr>';
      }).join('');
    }

    async function loadAgents() {
      const key = document.getElementById('api-key-input').value.trim();
      if (!key) { alert('Please enter the API key.'); return; }
      sessionStorage.setItem('lf_admin_key', key);
      document.getElementById('auth-card').style.display = 'none';
      document.getElementById('main').style.display = 'block';

      const tbody = document.getElementById('agents-tbody');
      tbody.innerHTML = '<tr><td colspan="4" class="empty">Loading&hellip;</td></tr>';

      try {
        const res = await fetch('/api/admin/unverified-agents', {
          headers: { 'x-api-key': apiKey() }
        });
        if (res.status === 401) {
          document.getElementById('auth-card').style.display = 'block';
          document.getElementById('main').style.display = 'none';
          alert('Invalid API key. Please try again.');
          return;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const body = await res.json();
        renderTable(body.agents || []);
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">Error: ' + escHtml(err.message) + '</td></tr>';
      }
    }

    async function verifySingle(agentId) {
      const btn = document.getElementById('btn-' + agentId);
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; }

      try {
        const res = await fetch('/api/admin/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey() },
          body: JSON.stringify({ agentId: agentId }),
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          showStatus(body.error || 'Verification failed', 'error');
          if (btn) { btn.disabled = false; btn.textContent = 'Verify'; }
          return;
        }
        const row = document.getElementById('row-' + agentId);
        if (row) {
          row.querySelector('td:last-child').innerHTML = loginLink(body.loginUrl);
        }
        const countEl = document.getElementById('agent-count');
        countEl.textContent = Math.max(0, parseInt(countEl.textContent, 10) - 1);
        showStatus('Verified ' + escHtml(body.email) + ' — direct login: ' + body.loginUrl, 'success');
      } catch (err) {
        showStatus('Network error: ' + err.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Verify'; }
      }
    }

    async function verifyAll() {
      const allBtn = document.getElementById('verify-all-btn');
      const count = parseInt(document.getElementById('agent-count').textContent, 10);
      if (count === 0) { showStatus('No unverified agents to verify.', 'info'); return; }
      if (!confirm('Verify all ' + count + ' unverified agent(s)?')) return;

      allBtn.disabled = true;
      allBtn.innerHTML = '<span class="spinner"></span> Verifying&hellip;';

      try {
        const res = await fetch('/api/admin/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey() },
          body: JSON.stringify({ all: true }),
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          showStatus(body.error || 'Bulk verification failed', 'error');
          return;
        }
        renderTable([]);
        showStatus('Verified ' + body.count + ' agent(s). ' + loginLink(body.loginUrl), 'success');
        // Re-enable to allow re-run if needed
        allBtn.disabled = false;
        allBtn.textContent = 'Verify All';
      } catch (err) {
        showStatus('Network error: ' + err.message, 'error');
        allBtn.disabled = false;
        allBtn.textContent = 'Verify All';
      }
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
});

module.exports = router;
