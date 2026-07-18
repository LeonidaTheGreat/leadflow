'use strict';

const crypto = require('crypto');
const { getPool } = require('../db');
const {
  ADMIN_MAGIC_LINK_TTL_HOURS,
  TRIAL_PERIOD_DAYS,
  app,
} = require('../config');

const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const TOKEN_PURPOSE = 'trial-activation';
const TOKEN_ALGORITHM = 'HS256';
const TOKEN_TYPE = 'JWT';
const TOKEN_ISSUER = 'leadflow-admin-magic-link';
const SOURCE = 'admin_magic_link';
const DEFAULT_PASSWORD_HASH = 'admin_magic_link_pending_password';
const DEFAULT_STATUS = 'onboarding';
const DEFAULT_PLAN_TIER = 'trial';

const FIND_AGENT_SQL = `
  SELECT id, email, first_name, last_name, status, email_verified
  FROM real_estate_agents
  WHERE lower(email) = $1
  LIMIT 1
`;

const UPDATE_AGENT_SQL = `
  UPDATE real_estate_agents
  SET
    first_name = COALESCE(NULLIF($2, ''), first_name),
    last_name = COALESCE(NULLIF($3, ''), last_name),
    email_verified = true,
    status = $4,
    plan_tier = COALESCE(plan_tier, $5),
    trial_start_date = COALESCE(trial_start_date, $6),
    trial_ends_at = COALESCE(trial_ends_at, $7),
    onboarding_completed = COALESCE(onboarding_completed, false),
    onboarding_step = COALESCE(onboarding_step, 0),
    updated_at = $6
  WHERE id = $1
  RETURNING id, email, first_name, last_name, status, email_verified
`;

const CREATE_AGENT_SQL = `
  INSERT INTO real_estate_agents (
    email,
    first_name,
    last_name,
    password_hash,
    email_verified,
    status,
    plan_tier,
    trial_start_date,
    trial_ends_at,
    mrr,
    source,
    onboarding_completed,
    onboarding_step,
    created_at,
    updated_at
  ) VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8, 0, $9, false, 0, $7, $7)
  RETURNING id, email, first_name, last_name, status, email_verified
`;

class AdminMagicLinkService {
  constructor(options = {}) {
    this.pool = options.pool || getPool();
    this.jwtSecret = options.jwtSecret || process.env.JWT_SECRET || null;
    this.appUrl = (options.appUrl || app.appUrl).replace(/\/$/, '');
    this.now = options.now || (() => new Date());
  }

  async createMagicLink(input) {
    const payload = this.validateInput(input);
    const agent = await this.findOrCreateAgent(payload);
    const token = this.signTrialActivationToken(agent);

    return {
      agent,
      loginUrl: `${this.appUrl}/accept-invite?token=${encodeURIComponent(token)}`,
      expiresAt: new Date(this.now().getTime() + this.tokenTtlMs()).toISOString(),
    };
  }

  validateInput(input) {
    if (!input || typeof input !== 'object') {
      throw Object.assign(new Error('Request body must be a JSON object'), { statusCode: 400 });
    }

    const email = String(input.email || '').trim().toLowerCase();
    const firstName = String(input.firstName || '').trim();
    const lastName = String(input.lastName || '').trim();

    if (!this.isValidEmail(email)) {
      throw Object.assign(new Error('email must be a valid email address'), { statusCode: 400 });
    }

    if (!firstName) {
      throw Object.assign(new Error('firstName is required'), { statusCode: 400 });
    }

    if (!lastName) {
      throw Object.assign(new Error('lastName is required'), { statusCode: 400 });
    }

    return { email, firstName, lastName };
  }

  async findOrCreateAgent({ email, firstName, lastName }) {
    const now = this.now();
    const nowIso = now.toISOString();
    const trialEndsAt = new Date(
      now.getTime() + TRIAL_PERIOD_DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND
    ).toISOString();

    const existing = await this.pool.query(FIND_AGENT_SQL, [email]);

    if (existing.rows[0]) {
      const updated = await this.pool.query(UPDATE_AGENT_SQL, [
        existing.rows[0].id,
        firstName,
        lastName,
        DEFAULT_STATUS,
        DEFAULT_PLAN_TIER,
        nowIso,
        trialEndsAt,
      ]);
      return updated.rows[0];
    }

    const created = await this.pool.query(CREATE_AGENT_SQL, [
      email,
      firstName,
      lastName,
      DEFAULT_PASSWORD_HASH,
      DEFAULT_STATUS,
      DEFAULT_PLAN_TIER,
      nowIso,
      trialEndsAt,
      SOURCE,
    ]);
    return created.rows[0];
  }

  signTrialActivationToken(agent) {
    if (!this.jwtSecret) {
      throw Object.assign(new Error('JWT_SECRET is not configured'), { statusCode: 503 });
    }

    const nowSeconds = Math.floor(this.now().getTime() / MS_PER_SECOND);
    const expiresSeconds = nowSeconds + ADMIN_MAGIC_LINK_TTL_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

    return this.signJwt({
      agentId: agent.id,
      email: agent.email,
      purpose: TOKEN_PURPOSE,
      iat: nowSeconds,
      exp: expiresSeconds,
      iss: TOKEN_ISSUER,
    });
  }

  signJwt(payload) {
    const header = { alg: TOKEN_ALGORITHM, typ: TOKEN_TYPE };
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  base64UrlEncode(value) {
    return Buffer.from(value).toString('base64url');
  }

  tokenTtlMs() {
    return ADMIN_MAGIC_LINK_TTL_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

AdminMagicLinkService.TOKEN_PURPOSE = TOKEN_PURPOSE;
AdminMagicLinkService.TOKEN_ISSUER = TOKEN_ISSUER;

module.exports = AdminMagicLinkService;
