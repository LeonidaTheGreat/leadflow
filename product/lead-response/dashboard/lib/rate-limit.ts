/**
 * RATE LIMITER - Prevent spam/abuse
 * 
 * Simple in-memory rate limiter for MVP
 * Tracks messages per lead per minute
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store: {leadId}:{type} -> RateLimitEntry
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const LIMITS = {
  SMS_PER_LEAD_PER_MINUTE: 5,
  AI_SUGGEST_PER_MINUTE: 10,
  WINDOW_MS: 60 * 1000, // 1 minute
};

/**
 * Check if rate limit exceeded for SMS sends
 */
export function checkSmsRateLimit(leadId: string): {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
} {
  const key = `sms:${leadId}`;
  const now = Date.now();
  const limit = LIMITS.SMS_PER_LEAD_PER_MINUTE;

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + LIMITS.WINDOW_MS };
    rateLimitStore.set(key, entry);
  }

  // Check limit
  const allowed = entry.count < limit;
  const remaining = Math.max(0, limit - entry.count - 1);
  const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);

  // Increment counter
  if (!allowed) {
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  entry.count++;
  return { allowed: true, remaining, resetInSeconds };
}

/**
 * Check if rate limit exceeded for AI suggestions
 */
export function checkAiRateLimit(leadId: string): {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
} {
  const key = `ai:${leadId}`;
  const now = Date.now();
  const limit = LIMITS.AI_SUGGEST_PER_MINUTE;

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + LIMITS.WINDOW_MS };
    rateLimitStore.set(key, entry);
  }

  // Check limit
  const allowed = entry.count < limit;
  const remaining = Math.max(0, limit - entry.count - 1);
  const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);

  // Increment counter
  if (!allowed) {
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  entry.count++;
  return { allowed: true, remaining, resetInSeconds };
}

/**
 * Reset rate limit for a lead (admin use)
 */
export function resetRateLimit(leadId: string, type: 'sms' | 'ai' | 'all') {
  if (type === 'sms' || type === 'all') {
    rateLimitStore.delete(`sms:${leadId}`);
  }
  if (type === 'ai' || type === 'all') {
    rateLimitStore.delete(`ai:${leadId}`);
  }
}

/**
 * Get rate limit status for a lead
 */
export function getRateLimitStatus(leadId: string) {
  const smsKey = `sms:${leadId}`;
  const aiKey = `ai:${leadId}`;
  const now = Date.now();

  const smsEntry = rateLimitStore.get(smsKey);
  const aiEntry = rateLimitStore.get(aiKey);

  return {
    sms: {
      count: smsEntry?.count ?? 0,
      limit: LIMITS.SMS_PER_LEAD_PER_MINUTE,
      resetAt: smsEntry?.resetAt ?? now,
      remaining: Math.max(0, (LIMITS.SMS_PER_LEAD_PER_MINUTE - (smsEntry?.count ?? 0))),
    },
    ai: {
      count: aiEntry?.count ?? 0,
      limit: LIMITS.AI_SUGGEST_PER_MINUTE,
      resetAt: aiEntry?.resetAt ?? now,
      remaining: Math.max(0, (LIMITS.AI_SUGGEST_PER_MINUTE - (aiEntry?.count ?? 0))),
    },
  };
}

/**
 * Cleanup old entries (call periodically)
 */
export function cleanupExpiredEntries() {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired rate limit entries`);
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}
