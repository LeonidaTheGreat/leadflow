'use strict';

const { createClient } = require('../db');

const SATISFACTION_PING_MESSAGE =
  'Was this conversation helpful? Reply YES or NO — it helps us improve. (Reply STOP anytime to unsubscribe)';

const SATISFACTION_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

const POSITIVE_KEYWORDS = ['yes', 'helpful', 'good', 'great', 'thanks', 'thank', 'awesome', 'perfect', 'excellent', 'amazing'];
const NEGATIVE_KEYWORDS = ['no', 'bad', 'annoying', 'quit', 'terrible', 'horrible', 'awful', 'hate', 'useless'];
const NEUTRAL_KEYWORDS = ['neutral', 'ok', 'okay', 'fine', 'meh', 'alright', 'average'];

class SatisfactionService {
  constructor(options = {}) {
    this.db = options.db || createClient();
    this.logger = options.logger || console;
  }

  async sendSatisfactionPing(opts) {
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
      if (!agentSatisfactionPingEnabled) {
        this.logger.log('📊 Satisfaction ping disabled for agent — skipping');
        return false;
      }

      if (lastAiMessageAt) {
        const lastAiMs = new Date(lastAiMessageAt).getTime();
        const ageMs = Date.now() - lastAiMs;
        if (ageMs < SATISFACTION_COOLDOWN_MS) {
          const remainingMin = Math.ceil((SATISFACTION_COOLDOWN_MS - ageMs) / 60000);
          this.logger.log(`⏳ Satisfaction ping cooldown — ${remainingMin}m remaining, skipping`);
          return false;
        }
      }

      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const pingQuery = this.db
        .from('lead_satisfaction_events')
        .select('id')
        .eq('lead_id', leadId)
        .not('satisfaction_ping_sent_at', 'is', null);

      if (conversationId) {
        pingQuery.eq('conversation_id', conversationId);
      } else {
        pingQuery.gte('created_at', cutoff);
      }

      const { data: existingPings, error: pingError } = await pingQuery.limit(1);
      if (pingError) {
        this.logger.error('❌ Error checking existing pings:', pingError);
      }

      if (existingPings && existingPings.length > 0) {
        this.logger.log('📊 Satisfaction ping already sent for this conversation — skipping');
        return false;
      }

      const smsResult = await sendSmsFunction(phone, SATISFACTION_PING_MESSAGE, {
        leadId,
        agentId,
        trigger: 'satisfaction_ping',
      });

      if (!smsResult.success) {
        this.logger.error('❌ Failed to send satisfaction ping:', smsResult.error);
        return false;
      }

      const now = new Date().toISOString();
      const { error: insertError } = await this.db
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
        this.logger.error('❌ Error logging satisfaction ping event:', insertError);
      }

      this.logger.log(`✅ Satisfaction ping sent to lead ${leadId} (SID: ${smsResult.sid})`);
      return true;

    } catch (error) {
      this.logger.error('❌ Satisfaction ping error:', error.message);
      return false;
    }
  }

  scheduleSatisfactionPing(opts) {
    const delayMs = SATISFACTION_COOLDOWN_MS;
    this.logger.log(`⏰ Scheduling satisfaction ping for lead ${opts.leadId} in ${delayMs / 60000} minutes`);
    setTimeout(async () => {
      try {
        await this.sendSatisfactionPing(opts);
      } catch (error) {
        this.logger.error('❌ Scheduled satisfaction ping error:', error.message);
      }
    }, delayMs);
  }

  async getPendingSatisfactionPing(leadId) {
    try {
      const { data, error } = await this.db
        .from('lead_satisfaction_events')
        .select('*')
        .eq('lead_id', leadId)
        .not('satisfaction_ping_sent_at', 'is', null)
        .is('rating', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        this.logger.error('❌ Error checking pending satisfaction ping:', error);
        return null;
      }
      return data;
    } catch (error) {
      this.logger.error('❌ Error in getPendingSatisfactionPing:', error.message);
      return null;
    }
  }

  classifyReply(reply) {
    const normalized = reply.trim().toLowerCase();

    if (POSITIVE_KEYWORDS.includes(normalized)) return 'positive';
    if (NEGATIVE_KEYWORDS.includes(normalized)) return 'negative';
    if (NEUTRAL_KEYWORDS.includes(normalized)) return 'neutral';

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

  async recordSatisfactionReply(eventId, rawReply, rating) {
    try {
      const { error } = await this.db
        .from('lead_satisfaction_events')
        .update({ raw_reply: rawReply, rating })
        .eq('id', eventId);

      if (error) {
        this.logger.error('❌ Error recording satisfaction reply:', error);
        return false;
      }

      this.logger.log(`✅ Satisfaction reply recorded: ${rating} for event ${eventId}`);
      return true;
    } catch (error) {
      this.logger.error('❌ Error in recordSatisfactionReply:', error.message);
      return false;
    }
  }
}

module.exports = SatisfactionService;
