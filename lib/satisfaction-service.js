/**
 * Satisfaction Service (Node.js)
 * Shared satisfaction ping logic for both Express server and dashboard
 * 
 * This module handles:
 * - Sending satisfaction pings after AI conversations
 * - Checking cooldown periods
 * - Recording satisfaction feedback
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ===== CONSTANTS =====
const SATISFACTION_PING_MESSAGE = 
  'Was this conversation helpful? Reply YES or NO — it helps us improve. (Reply STOP anytime to unsubscribe)';

const SATISFACTION_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// ===== SATISFACTION PING =====

/**
 * Send a satisfaction ping after an AI conversation exchange
 * @param {Object} opts - Options
 * @param {string} opts.leadId - Lead ID
 * @param {string} opts.agentId - Agent ID (can be null)
 * @param {string} opts.conversationId - Conversation/lead ID for deduplication
 * @param {string} opts.phone - Lead phone number (E.164 format)
 * @param {string} opts.lastAiMessageAt - ISO timestamp of last AI message
 * @param {boolean} opts.agentSatisfactionPingEnabled - Whether pings are enabled for this agent (default: true)
 * @param {Function} opts.sendSmsFunction - Function to send SMS (should be sendSmsViatwilio)
 * @returns {Promise<boolean>} true if ping was sent, false if skipped
 */
async function sendSatisfactionPing(opts) {
  const {
    leadId,
    agentId,
    conversationId,
    phone,
    lastAiMessageAt,
    agentSatisfactionPingEnabled = true,
    sendSmsFunction,
  } = opts;

  try {
    // 1. Check agent setting
    if (!agentSatisfactionPingEnabled) {
      console.log('📊 Satisfaction ping disabled for agent — skipping');
      return false;
    }

    // 2. Check cooldown — last AI message must be ≥10 minutes ago
    if (lastAiMessageAt) {
      const lastAiMs = new Date(lastAiMessageAt).getTime();
      const ageMs = Date.now() - lastAiMs;
      
      if (ageMs < SATISFACTION_COOLDOWN_MS) {
        const remainingMin = Math.ceil((SATISFACTION_COOLDOWN_MS - ageMs) / 60000);
        console.log(`⏳ Satisfaction ping cooldown — ${remainingMin}m remaining, skipping`);
        return false;
      }
    }

    // 3. Check if a ping was already sent for this conversation
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const pingQuery = supabase
      .from('lead_satisfaction_events')
      .select('id')
      .eq('lead_id', leadId)
      .not('satisfaction_ping_sent_at', 'is', null);

    if (conversationId) {
      pingQuery.eq('conversation_id', conversationId);
    } else {
      // No conversation ID — check any pending or answered ping in last 24h
      pingQuery.gte('created_at', cutoff);
    }

    const { data: existingPings, error: pingError } = await pingQuery.limit(1);
    
    if (pingError) {
      console.error('❌ Error checking existing pings:', pingError);
      // Don't fail — continue to try sending
    }

    if (existingPings && existingPings.length > 0) {
      console.log('📊 Satisfaction ping already sent for this conversation — skipping');
      return false;
    }

    // 4. Send the ping SMS
    const smsResult = await sendSmsFunction(phone, SATISFACTION_PING_MESSAGE, {
      leadId,
      agentId,
      trigger: 'satisfaction_ping',
    });

    if (!smsResult.success) {
      console.error('❌ Failed to send satisfaction ping:', smsResult.error);
      return false;
    }

    // 5. Create the event record (rating = null, pending reply)
    const now = new Date().toISOString();
    const { error: insertError } = await supabase
      .from('lead_satisfaction_events')
      .insert({
        lead_id: leadId,
        agent_id: agentId,
        conversation_id: conversationId || null,
        satisfaction_ping_sent_at: now,
        rating: null,
        created_at: now,
      });

    if (insertError) {
      console.error('❌ Error logging satisfaction ping event:', insertError);
      // Don't fail — ping was still sent
    }

    console.log(`✅ Satisfaction ping sent to lead ${leadId} (SID: ${smsResult.sid})`);
    return true;

  } catch (error) {
    console.error('❌ Satisfaction ping error:', error.message);
    return false;
  }
}

/**
 * Schedule a satisfaction ping to be sent after cooldown
 * This is a non-blocking, fire-and-forget approach suitable for serverless
 * @param {Object} opts - Same options as sendSatisfactionPing
 * @returns {void}
 */
function scheduleSatisfactionPing(opts) {
  const delayMs = SATISFACTION_COOLDOWN_MS;
  
  console.log(`⏰ Scheduling satisfaction ping for lead ${opts.leadId} in ${delayMs / 60000} minutes`);
  
  // Fire async without awaiting
  setTimeout(async () => {
    try {
      await sendSatisfactionPing(opts);
    } catch (error) {
      console.error('❌ Scheduled satisfaction ping error:', error.message);
    }
  }, delayMs);
}

/**
 * Check if a lead has a pending (unanswered) satisfaction ping
 */
async function getPendingSatisfactionPing(leadId) {
  try {
    const { data, error } = await supabase
      .from('lead_satisfaction_events')
      .select('*')
      .eq('lead_id', leadId)
      .not('satisfaction_ping_sent_at', 'is', null)
      .is('rating', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Error checking pending satisfaction ping:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error in getPendingSatisfactionPing:', error.message);
    return null;
  }
}

/**
 * Classify a reply to a satisfaction ping
 */
function classifyReply(reply) {
  const POSITIVE_KEYWORDS = ['yes', 'helpful', 'good', 'great', 'thanks', 'thank', 'awesome', 'perfect', 'excellent', 'amazing'];
  const NEGATIVE_KEYWORDS = ['no', 'bad', 'annoying', 'quit', 'terrible', 'horrible', 'awful', 'hate', 'useless'];
  const NEUTRAL_KEYWORDS = ['neutral', 'ok', 'okay', 'fine', 'meh', 'alright', 'average'];

  const normalized = reply.trim().toLowerCase();

  if (POSITIVE_KEYWORDS.includes(normalized)) return 'positive';
  if (NEGATIVE_KEYWORDS.includes(normalized)) return 'negative';
  if (NEUTRAL_KEYWORDS.includes(normalized)) return 'neutral';

  // Check if any keyword is a prefix of the reply
  for (const kw of POSITIVE_KEYWORDS) {
    if (normalized.startsWith(kw + ' ') || normalized === kw) return 'positive';
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (normalized.startsWith(kw + ' ') || normalized === kw) return 'negative';
  }
  for (const kw of NEUTRAL_KEYWORDS) {
    if (normalized.startsWith(kw + ' ') || normalized === kw) return 'neutral';
  }

  return 'unclassified';
}

/**
 * Record a satisfaction reply
 */
async function recordSatisfactionReply(eventId, rawReply, rating) {
  try {
    const { error } = await supabase
      .from('lead_satisfaction_events')
      .update({
        raw_reply: rawReply,
        rating,
      })
      .eq('id', eventId);

    if (error) {
      console.error('❌ Error recording satisfaction reply:', error);
      return false;
    }

    console.log(`✅ Satisfaction reply recorded: ${rating} for event ${eventId}`);
    return true;
  } catch (error) {
    console.error('❌ Error in recordSatisfactionReply:', error.message);
    return false;
  }
}

// ===== EXPORTS =====
module.exports = {
  sendSatisfactionPing,
  scheduleSatisfactionPing,
  getPendingSatisfactionPing,
  classifyReply,
  recordSatisfactionReply,
  SATISFACTION_PING_MESSAGE,
  SATISFACTION_COOLDOWN_MS,
};
