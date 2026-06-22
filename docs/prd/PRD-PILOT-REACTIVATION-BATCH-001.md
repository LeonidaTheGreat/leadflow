# PRD: Pilot Reactivation Batch — Phone-Less Agents

**ID:** PRD-PILOT-REACTIVATION-BATCH-001  
**UC:** uc-pilot-email-reactivation-zero-phone  
**Status:** Ready for dev  
**Approach:** Extend existing ActivationService (not a new service class)

## Problem

21 agents have `email_verified=true`, `onboarding_completed=false`, `plan_tier='pilot'`, and `phone_number IS NULL`. They never received an SMS nudge (SMS requires a phone number). They're stuck and silent. We need to email them to re-engage.

## Prior Attempts (Why They Failed)

| PR | What was built | Why it failed |
|----|---------------|---------------|
| 1837 | New `PilotReactivationService.js` (255 lines) | PR closed as orphaned — QC never ran |
| 1842 | New `PilotPhonelessReactivationService.js` (180 lines) | PR closed as orphaned — QC never ran |
| 271a47e7 (no PR) | Nothing — branch has zero commits | Agent ghost-completed |

Root cause: new service classes → large PRs → QC pipeline gap → orphaned closure.

## New Approach — Extend Existing Code

**DO NOT create new service files.** Extend what already exists:

### 1. Add method to `lib/services/ActivationService.js`

Add `sendBatchPilotReactivation(opts = {})` after the existing `sendActivationEmail` method:

```js
async sendBatchPilotReactivation(opts = {}) {
  const dryRun = opts.dryRun !== false; // default: true (safe)
  if (!this.pool) throw new Error('DB pool not configured');

  // Query: phone-less, verified, not onboarded, pilot tier
  const { rows: eligible } = await this.pool.query(`
    SELECT r.id, r.email, r.first_name
    FROM real_estate_agents r
    WHERE r.email_verified = true
      AND r.onboarding_completed = false
      AND r.plan_tier = 'pilot'
      AND r.phone_number IS NULL
    ORDER BY r.created_at ASC
  `);

  const results = { total: eligible.length, sent: 0, skipped: 0, errors: [] };

  if (dryRun) return results;

  for (const agent of eligible) {
    // Dedup: skip if already sent reactivation email in last 24h
    const { rows: recent } = await this.pool.query(`
      SELECT id FROM pilot_email_log
      WHERE agent_id = $1 AND email_type = 'pilot_reactivation'
        AND sent_at > NOW() - INTERVAL '24 hours'
      LIMIT 1
    `, [agent.id]);

    if (recent.length > 0) {
      results.skipped++;
      continue;
    }

    const emailResult = await this.emailService.sendActivationOutreach({
      to: agent.email,
      firstName: agent.first_name,
      subject: 'Your LeadFlow pilot — pick up where you left off',
      from: `Stojan from LeadFlow <${this.fromEmail}>`,
      appUrl: this.appUrl,
    });

    if (emailResult.success) {
      await this.pool.query(`
        INSERT INTO pilot_email_log (agent_id, email_type, recipient, status, resend_id)
        VALUES ($1, 'pilot_reactivation', $2, 'sent', $3)
      `, [agent.id, agent.email, emailResult.id || null]);
      results.sent++;
    } else {
      results.errors.push({ agent_id: agent.id, error: emailResult.error });
    }
  }

  return results;
}
```

### 2. Add endpoint to `routes/admin/activation-outreach.js`

Append after the existing `send-activation-email` handler:

```js
// POST /api/admin/send-pilot-reactivation-batch
router.post('/api/admin/send-pilot-reactivation-batch', requireApiKey, async (req, res) => {
  const dryRun = req.body && req.body.dryRun !== false; // default safe=true
  const service = getService();
  try {
    const result = await service.sendBatchPilotReactivation({ dryRun });
    return res.json({ ok: true, dryRun, ...result });
  } catch (err) {
    log.error('Pilot reactivation batch error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 3. Test file: `tests/unit/pilot-reactivation-batch.test.js`

Test coverage required:
- Dry run returns `{total: N, sent: 0, skipped: 0}` without sending emails
- Live run sends emails and inserts pilot_email_log rows
- Dedup: second call within 24h skips already-sent agents
- Agents with phone_number present are excluded
- Agents with onboarding_completed=true are excluded

## What NOT to touch

- `server.js` — `activation-outreach.js` is already mounted at `/`
- No new service files (`PilotReactivationService.js` etc.)
- No database migrations — `pilot_email_log` table already exists
- No changes to `EmailService.js`

## Acceptance Criteria

1. `POST /api/admin/send-pilot-reactivation-batch` with `{dryRun:true}` returns `{total:21}` (or current count)
2. `POST /api/admin/send-pilot-reactivation-batch` with `{dryRun:false}` sends emails and creates pilot_email_log rows
3. Second call within 24h returns `{sent:0, skipped:21}` (dedup working)
4. Tests pass: `npm test` exits 0
5. Lint passes: `npm run lint` exits 0
6. Build passes: `npm run build` exits 0

## Verify (runnable)

```bash
# Count eligible agents
psql openclaw -c "SELECT COUNT(*) FROM real_estate_agents WHERE email_verified=true AND onboarding_completed=false AND plan_tier='pilot' AND phone_number IS NULL"

# After dev ships, test dry run
curl -X POST http://localhost:3001/api/admin/send-pilot-reactivation-batch \
  -H "Content-Type: application/json" \
  -H "x-api-key: $LEADFLOW_API_KEY" \
  -d '{"dryRun":true}'
# Expected: {"ok":true,"dryRun":true,"total":21,"sent":0,"skipped":0}
```
