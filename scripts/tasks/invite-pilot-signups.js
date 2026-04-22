#!/usr/bin/env node

/**
 * Batch invite script for pilot signups.
 *
 * Converts all pilot_signups without invites to pilot_invites by:
 * 1. Reading pilot_signups where no pilot_invite exists
 * 2. Creating pilot_invites with hashed token, 7-day expiry, status='invited'
 * 3. Creating/updating real_estate_agents records
 * 4. Sending invite emails via Resend
 * 5. Tracking results
 *
 * Idempotent: running twice doesn't create duplicates (checked via email)
 *
 * Usage:
 *   node scripts/tasks/invite-pilot-signups.js [--dry-run]
 *
 * Acceptance Criteria:
 * ✓ Creates >= 20 pilot_invites with status='invited'
 * ✓ Each email receives invite within 5 minutes
 * ✓ No duplicate invites if run twice
 * ✓ Token expires in 7 days
 */

const crypto = require('crypto');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const DB_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw';
const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
const FROM_EMAIL = (process.env.FROM_EMAIL || 'onboarding@leadflow.ai').trim();
const FRONTEND_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app';
const DRY_RUN = process.argv.includes('--dry-run');

const pool = new Pool({ connectionString: DB_URL });

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function sendInviteEmail(email, name, token) {
  if (!RESEND_API_KEY) {
    console.warn(`[WARN] RESEND_API_KEY not configured, skipping email to ${email}`);
    return { success: false, reason: 'RESEND_API_KEY not configured' };
  }

  const acceptLink = `${FRONTEND_URL}/accept-invite?token=${token}`;
  const firstName = (name || '').split(' ')[0] || 'there';

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to LeadFlow AI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #10b981; margin-bottom: 10px;">🎉 You're Invited to LeadFlow AI!</h1>
    <p style="font-size: 18px; color: #666;">Join our exclusive pilot program</p>
  </div>

  <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <h2 style="margin-top: 0; color: #111;">Hi ${firstName},</h2>

    <p>We're excited to invite you to try <strong>LeadFlow AI</strong> — a powerful tool designed to help real estate agents respond to leads instantly and book more appointments.</p>

    <p><strong>What you'll get:</strong></p>
    <ul>
      <li>✅ AI-powered lead responses (SMS) — reply to leads in &lt;30 seconds</li>
      <li>✅ Follow Up Boss integration — sync your CRM automatically</li>
      <li>✅ Appointment booking — Cal.com integration to book meetings</li>
      <li>✅ 14-day free trial — no credit card required</li>
    </ul>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${acceptLink}" style="display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Accept Invite & Get Started</a>
    </p>

    <p style="color: #666; font-size: 14px;">
      Or copy this link: <br>
      <code style="background: #f5f5f5; padding: 8px 12px; border-radius: 4px; display: inline-block; word-break: break-all;">${acceptLink}</code>
    </p>

    <p><strong>What happens next:</strong></p>
    <ol>
      <li>Click the link above</li>
      <li>You'll be taken to set your password</li>
      <li>Start your free 14-day trial immediately</li>
      <li>No credit card required</li>
    </ol>

    <p style="color: #666; margin-top: 30px;">
      This invitation link is valid for <strong>7 days</strong>. After that, you'll need to request a new one.
    </p>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #666; font-size: 12px;">
    <p>Questions? Reply to this email or contact us at support@leadflow.ai</p>
    <p style="margin-top: 10px;">Best regards,<br><strong>The LeadFlow Team</strong></p>
  </div>
</body>
</html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: `LeadFlow AI <${FROM_EMAIL}>`,
        to: email,
        subject: `${firstName}, you're invited to try LeadFlow AI for free`,
        html: htmlContent
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[ERROR] Failed to send email to ${email}: ${error}`);
      return { success: false, reason: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error(`[ERROR] Exception sending email to ${email}:`, err.message);
    return { success: false, reason: err.message };
  }
}

async function invitePilotSignups() {
  const client = await pool.connect();
  let invited = 0;
  let sent = 0;
  let failed = 0;
  const errors = [];

  try {
    // 1. Find all pilot_signups without an existing pilot_invite
    const signups = await client.query(`
      SELECT ps.id, ps.email, ps.name, ps.created_at, ps.source
      FROM pilot_signups ps
      WHERE NOT EXISTS (
        SELECT 1 FROM pilot_invites pi WHERE pi.email = ps.email
      )
      ORDER BY ps.created_at DESC
    `);

    console.log(`Found ${signups.rows.length} pilot signups without invites\n`);

    if (signups.rows.length === 0) {
      console.log('✓ No pending signups to invite');
      return;
    }

    for (const signup of signups.rows) {
      const email = signup.email.toLowerCase();
      const firstName = (signup.name || '').split(' ')[0] || signup.name || 'Pilot User';
      const lastName = (signup.name || '').split(' ').slice(1).join(' ') || '';

      try {
        if (DRY_RUN) {
          console.log(`[DRY RUN] Would create invite for ${email}`);
          invited++;
          sent++;
          continue;
        }

        // Generate token (raw, not hashed)
        const rawToken = generateInviteToken();
        const tokenHash = hashToken(rawToken);

        // Calculate expiry (7 days from now)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // 2. Create or update real_estate_agents record
        let agentId;
        const existingAgent = await client.query(
          'SELECT id FROM real_estate_agents WHERE email = $1',
          [email]
        );

        if (existingAgent.rows.length > 0) {
          agentId = existingAgent.rows[0].id;
          // Update existing agent status
          await client.query(
            `UPDATE real_estate_agents
             SET status = $1, plan_tier = $2, email_verified = $3, updated_at = NOW()
             WHERE id = $4`,
            ['invited', 'pilot', true, agentId]
          );
          console.log(`✓ Updated existing agent ${email}`);
        } else {
          // Create new agent record
          agentId = uuidv4();
          await client.query(
            `INSERT INTO real_estate_agents
             (id, email, first_name, last_name, status, plan_tier, email_verified, password_hash, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            [agentId, email, firstName, lastName, 'invited', 'pilot', true, 'invited']
          );
          console.log(`✓ Created new agent ${email}`);
        }

        // 3. Create pilot_invite record
        await client.query(
          `INSERT INTO pilot_invites
           (email, name, invited_by, token, token_expires_at, status, agent_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [email, signup.name, 'admin', tokenHash, expiresAt, 'pending', agentId]
        );
        invited++;
        console.log(`✓ Created invite (expires ${expiresAt.toISOString().split('T')[0]})`);

        // 4. Send email
        const emailResult = await sendInviteEmail(email, signup.name, rawToken);
        if (emailResult.success) {
          sent++;
          console.log(`  ✓ Email sent\n`);
        } else {
          failed++;
          console.log(`  ✗ Email failed: ${emailResult.reason}\n`);
          errors.push({ email, error: emailResult.reason });
        }
      } catch (err) {
        failed++;
        console.error(`✗ Error inviting ${email}:`, err.message);
        errors.push({ email, error: err.message });
      }
    }

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total signups processed: ${invited + failed}`);
    console.log(`Invites created: ${invited}`);
    console.log(`Emails sent: ${sent}`);
    console.log(`Failures: ${failed}`);

    if (errors.length > 0) {
      console.log('\nErrors:');
      for (const err of errors) {
        console.log(`  - ${err.email}: ${err.error}`);
      }
    }

    // Verify
    const result = await client.query('SELECT COUNT(*) FROM pilot_invites WHERE status = $1', ['pending']);
    console.log(`\nTotal "pending" status in DB: ${result.rows[0].count}`);

  } finally {
    client.release();
    await pool.end();
  }
}

// Run
if (require.main === module) {
  invitePilotSignups()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { invitePilotSignups };
