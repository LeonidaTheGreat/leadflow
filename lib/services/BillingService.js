/*
TASK SPEC (321f2a83-a530-4a16-a2e1-60e4f9a1b9b9)
What:
- Update `lib/services/BillingService.js` in `BillingService.createCustomer` to set Stripe `statement_descriptor` to `LANDYOURLEADS`.
- Update footer/legal copy in:
  - `product/lead-response/dashboard/app/page.tsx`
  - `product/lead-response/dashboard/app/demo/page.tsx`
  - `product/lead-response/dashboard/app/pricing/page.tsx`
  - `product/lead-response/dashboard/app/dashboard/layout.tsx`
  so product-facing brand remains LeadFlow AI while legal footer text references Imagine Squared.
- Add unit test `tests/unit/billing-service-statement-descriptor.test.js` asserting `createCustomer` sends `statement_descriptor: 'LANDYOURLEADS'`.

Verify:
- `rg -n "Imagine Squared" product/lead-response/dashboard/app | rg -v "app/(privacy|terms|page\\.tsx|demo/page\\.tsx|pricing/page\\.tsx|dashboard/layout\\.tsx)"`
- `rg -n "statement_descriptor\\s*:\\s*'LANDYOURLEADS'" lib/services/BillingService.js tests/unit/billing-service-statement-descriptor.test.js`
- `node tests/unit/billing-service-statement-descriptor.test.js`
- `npm test`
- `npm run build`

Boundaries:
- Do not modify privacy/terms substantive legal sections beyond required brand consistency.
- Do not change billing flows beyond adding the statement descriptor field in customer creation.
- Do not change database schema, migrations, or unrelated product copy/components.
*/

const Stripe = require('stripe');
const { createClient } = require('../db');
const { logger } = require('../logger');
const { breakers } = require('../utils/circuit-breaker');
const { TRIAL_PERIOD_DAYS, stripe: stripeConfig, app: appConfig } = require('../config');
const log = logger.child('BillingService');

const PORTAL_CONFIG = {
  branding: {
    primary_color: process.env.STRIPE_PORTAL_PRIMARY_COLOR || '#0066FF',
    secondary_color: process.env.STRIPE_PORTAL_SECONDARY_COLOR || '#00D4AA',
    accent_color: process.env.STRIPE_PORTAL_ACCENT_COLOR || '#FF6B35',
    logo_url: process.env.STRIPE_PORTAL_LOGO_URL || 'https://landyourleads.com/logo.png',
    icon_url: process.env.STRIPE_PORTAL_ICON_URL || 'https://landyourleads.com/icon.png',
    favicon_url: process.env.STRIPE_PORTAL_FAVICON_URL || 'https://landyourleads.com/favicon.ico'
  },
  business: {
    name: process.env.STRIPE_PORTAL_BUSINESS_NAME || 'LeadFlow AI',
    privacy_policy_url: process.env.STRIPE_PORTAL_PRIVACY_URL || 'https://landyourleads.com/privacy',
    terms_of_service_url: process.env.STRIPE_PORTAL_TERMS_URL || 'https://landyourleads.com/terms'
  },
  features: { subscription_management: true, payment_method_management: true, invoice_history: true, cancellation_reasons: true, coupon_management: true }
};

const TIER_PRICES = stripeConfig.prices;

const EVENT_HANDLERS = {
  'customer.subscription.created': 'handleSubscriptionCreated',
  'customer.subscription.updated': 'handleSubscriptionUpdated',
  'customer.subscription.deleted': 'handleSubscriptionDeleted',
  'customer.subscription.paused': 'handleSubscriptionPaused',
  'customer.subscription.resumed': 'handleSubscriptionResumed',
  'customer.subscription.pending_update_applied': 'handlePendingUpdateApplied',
  'customer.subscription.pending_update_expired': 'handlePendingUpdateExpired',
  'customer.subscription.trial_will_end': 'handleTrialWillEnd',
  'invoice.created': 'handleInvoiceCreated',
  'invoice.finalized': 'handleInvoiceFinalized',
  'invoice.payment_succeeded': 'handlePaymentSucceeded',
  'invoice.payment_failed': 'handlePaymentFailed',
  'invoice.paid': 'handleInvoicePaid',
  'invoice.payment_action_required': 'handlePaymentActionRequired',
  'invoice.upcoming': 'handleInvoiceUpcoming',
  'invoice.marked_uncollectible': 'handleInvoiceUncollectible',
  'invoice.voided': 'handleInvoiceVoided',
  'payment_intent.succeeded': 'handlePaymentIntentSucceeded',
  'payment_intent.payment_failed': 'handlePaymentIntentFailed',
  'payment_intent.requires_action': 'handlePaymentIntentRequiresAction',
  'customer.created': 'handleCustomerCreated',
  'customer.updated': 'handleCustomerUpdated',
  'customer.deleted': 'handleCustomerDeleted',
  'payment_method.attached': 'handlePaymentMethodAttached',
  'payment_method.detached': 'handlePaymentMethodDetached',
  'checkout.session.completed': 'handleCheckoutCompleted',
  'checkout.session.expired': 'handleCheckoutExpired',
  'charge.dispute.created': 'handleDisputeCreated',
  'charge.dispute.closed': 'handleDisputeClosed'
};

class BillingService {
  constructor(options = {}) {
    this.stripe = options.stripe || (stripeConfig.secretKey ? new Stripe(stripeConfig.secretKey) : null);
    this.db = options.db || (process.env.NEXT_PUBLIC_API_URL ? createClient(process.env.NEXT_PUBLIC_API_URL, appConfig.apiKey) : null);
  }

  async initializeBilling() {
    const status = { stripe: !!this.stripe, supabase: !!this.db, portal: false, webhooks: false, errors: [] };
    try {
      if (this.stripe) { await this.configurePortal(); status.portal = true; }
      if (stripeConfig.webhookSecret) { status.webhooks = true; } else { status.errors.push('STRIPE_WEBHOOK_SECRET not set'); }
      for (const [tier, key] of [['starter','STRIPE_PRICE_STARTER_MONTHLY'],['professional','STRIPE_PRICE_PROFESSIONAL_MONTHLY'],['enterprise','STRIPE_PRICE_ENTERPRISE_MONTHLY']]) { if (!TIER_PRICES[tier]?.month) status.errors.push(key+' not set'); }
      return status;
    } catch (error) { log.error('Billing initialization error', { error: error.message }); status.errors.push('Billing initialization failed'); return status; }
  }

  async createCompleteSubscription(params) {
    const { userId, tier, interval, paymentMethodId, trial = false } = params;
    const subscription = await this.createManagedSubscription({ userId, tier, interval, paymentMethodId, trial });
    if (!subscription.success) throw new Error('Failed to create subscription');
    if (trial && !paymentMethodId) return { success: true, subscription, requiresPayment: false, message: 'Trial subscription created' };
    return { success: true, subscription, requiresPayment: !!subscription.clientSecret, clientSecret: subscription.clientSecret, message: subscription.clientSecret ? 'Subscription created, payment required' : 'Subscription created successfully' };
  }

  async createManagedSubscription(params) {
    const { userId, tier, interval = 'month', paymentMethodId, trial = false } = params;
    if (!this.stripe) return this._createMockSubscription(userId, tier, interval);
    try {
      const customer = await this.getOrCreateCustomer(userId);
      const priceId = TIER_PRICES[tier]?.[interval];
      if (!priceId) throw new Error('Invalid tier '+tier+' or interval '+interval);
      if (paymentMethodId) await this.attachPaymentMethod(customer.id, paymentMethodId);
      const sp = { customer: customer.id, items: [{ price: priceId }], payment_behavior: 'default_incomplete', payment_settings: { save_default_payment_method: 'on_subscription', payment_method_types: ['card'] }, expand: ['latest_invoice.payment_intent'], metadata: { user_id: userId, tier, interval, source: 'leadflow_managed_subscription' } };
      if (trial) sp.trial_period_days = TRIAL_PERIOD_DAYS;
      const ss = await breakers.stripe.execute(() => this.stripe.subscriptions.create(sp));
      const sub = await this._persistSubscription({ userId, stripeCustomerId: customer.id, stripeSubscriptionId: ss.id, status: ss.status, tier, priceId, interval, currentPeriodStart: new Date(ss.current_period_start*1000), currentPeriodEnd: new Date(ss.current_period_end*1000), trialStart: ss.trial_start ? new Date(ss.trial_start*1000) : null, trialEnd: ss.trial_end ? new Date(ss.trial_end*1000) : null, metadata: ss.metadata });
      await this._updateAgentSubscription(userId, { subscriptionStatus: ss.status, subscriptionTier: tier, stripeCustomerId: customer.id, currentPeriodEnd: new Date(ss.current_period_end*1000), trialEndsAt: ss.trial_end ? new Date(ss.trial_end*1000) : null });
      return { success: true, subscriptionId: sub.id, stripeSubscriptionId: ss.id, status: ss.status, tier, interval, clientSecret: ss.latest_invoice?.payment_intent?.client_secret, trialEnd: ss.trial_end, currentPeriodEnd: ss.current_period_end };
    } catch (error) { log.error('Failed to create managed subscription', error); throw error; }
  }

  async getOrCreateCustomer(userId) {
    if (!this.db) throw new Error('Database not configured');
    const { data: agent, error } = await this.db.from('real_estate_agents').select('stripe_customer_id, email, name').eq('id', userId).single();
    if (error) { log.error('Failed to fetch agent', { error: error.message }); throw new Error('Failed to fetch agent'); }
    if (agent?.stripe_customer_id) { try { return await breakers.stripe.execute(() => this.stripe.customers.retrieve(agent.stripe_customer_id)); } catch(e) { log.warn('Existing customer not found, creating new one'); } }
    const customer = await breakers.stripe.execute(() => this.stripe.customers.create({ email: agent.email, name: agent.name || agent.email, metadata: { user_id: userId, source: 'leadflow' } }));
    await this.db.from('real_estate_agents').update({ stripe_customer_id: customer.id }).eq('id', userId);
    return customer;
  }

  async changePlan(params) {
    const { subscriptionId, newTier, newInterval, effectiveImmediately = true, prorationBehavior = 'create_prorations' } = params;
    const prorationPreview = await this.calculateProration({ subscriptionId, newPriceId: this.getPriceId(newTier, newInterval) });
    if (effectiveImmediately) { const result = await this.changeSubscriptionPlan({ subscriptionId, newTier, newInterval, prorationBehavior }); return { success: true, change: result, proration: prorationPreview, effective: 'immediately' }; }
    const result = await this.scheduleSubscriptionChange({ subscriptionId, newTier, newInterval });
    return { success: true, change: result, proration: null, effective: 'next_cycle', effectiveDate: result.effectiveDate };
  }

  async changeSubscriptionPlan(params) {
    const { subscriptionId, newTier, newInterval, prorationBehavior = 'create_prorations' } = params;
    if (!this.stripe) return { success: true, mock: true, newTier };
    try {
      const cs = await breakers.stripe.execute(() => this.stripe.subscriptions.retrieve(subscriptionId));
      const ci = cs.items.data[0]; const ti = newInterval || ci.price.recurring.interval;
      const np = TIER_PRICES[newTier]?.[ti]; if (!np) throw new Error('Invalid tier '+newTier);
      const us = await breakers.stripe.execute(() => this.stripe.subscriptions.update(subscriptionId, { items: [{ id: ci.id, price: np }], proration_behavior: prorationBehavior, metadata: { ...cs.metadata, plan_changed_at: Date.now().toString(), previous_tier: cs.metadata.tier, new_tier: newTier } }));
      await this._updateSubscriptionInDatabase(subscriptionId, { tier: newTier, priceId: np, interval: ti, status: us.status });
      await this._updateAgentSubscription(cs.metadata.user_id, { subscriptionTier: newTier, subscriptionStatus: us.status });
      return { success: true, subscriptionId: us.id, status: us.status, newTier, newInterval: ti, prorationAmount: cs.items.data[0].price.unit_amount === us.items.data[0].price.unit_amount ? 0 : us.items.data[0].price.unit_amount - cs.items.data[0].price.unit_amount, currentPeriodEnd: us.current_period_end, hasPendingInvoice: !!us.pending_update };
    } catch (error) { log.error('Failed to change subscription plan', error); throw error; }
  }

  async scheduleSubscriptionChange(params) {
    const { subscriptionId, newTier, newInterval } = params;
    if (!this.stripe) return { success: true, mock: true, scheduled: true };
    try {
      const np = TIER_PRICES[newTier]?.[newInterval]; if (!np) throw new Error('Invalid tier '+newTier);
      const s = await breakers.stripe.execute(() => this.stripe.subscriptions.update(subscriptionId, { pending_update: { items: [{ price: np }] } }));
      if (this.db) await this.db.from('subscriptions').update({ pending_tier: newTier, pending_interval: newInterval, pending_change_at: new Date(s.current_period_end*1000) }).eq('stripe_subscription_id', subscriptionId);
      return { success: true, scheduled: true, effectiveDate: s.current_period_end, newTier, newInterval };
    } catch (error) { log.error('Failed to schedule subscription change', error); throw error; }
  }

  async cancelManagedSubscription(params) {
    const { subscriptionId, immediate = false, reason, feedback, downgradeFeatures = true } = params;
    let result;
    if (!this.stripe) { result = { success: true, mock: true, status: 'cancelled', currentPeriodEnd: null }; }
    else {
      try {
        result = immediate ? await breakers.stripe.execute(() => this.stripe.subscriptions.cancel(subscriptionId, { cancellation_details: { comment: feedback, feedback: reason } })) : await breakers.stripe.execute(() => this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true, cancellation_details: { comment: feedback, feedback: reason } }));
        await this._updateSubscriptionInDatabase(subscriptionId, { status: result.status, cancelAtPeriodEnd: result.cancel_at_period_end, canceledAt: result.canceled_at ? new Date(result.canceled_at*1000) : null, cancellationReason: reason });
        const uid = result.metadata?.user_id; if (uid) await this._updateAgentSubscription(uid, { subscriptionStatus: immediate ? 'cancelled' : 'active', subscriptionTier: immediate ? null : result.metadata?.tier });
      } catch (error) { log.error('Failed to cancel subscription', error); throw error; }
    }
    if (immediate && downgradeFeatures) { const s = this.stripe ? await breakers.stripe.execute(() => this.stripe.subscriptions.retrieve(subscriptionId)) : null; if (s?.metadata?.user_id) await this._downgradeUserFeatures(s.metadata.user_id); }
    return { success: true, cancelled: true, immediate, effectiveDate: immediate ? new Date() : (result.current_period_end ? new Date(result.current_period_end*1000) : result.currentPeriodEnd), refundEligible: immediate ? await this._checkRefundEligibility(subscriptionId) : false };
  }

  async reactivateSubscription(subscriptionId) {
    if (!this.stripe) return { success: true, mock: true };
    try {
      const s = await breakers.stripe.execute(() => this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false }));
      await this._updateSubscriptionInDatabase(subscriptionId, { cancelAtPeriodEnd: false, status: s.status });
      return { success: true, reactivated: true, status: s.status, currentPeriodEnd: s.current_period_end };
    } catch (error) { log.error('Failed to reactivate subscription', error); throw error; }
  }

  async getSubscriptionDetails(subscriptionId) {
    if (!this.db) return this._getMockSubscriptionDetails(subscriptionId);
    const { data: sub, error } = await this.db.from('subscriptions').select('*').or('id.eq.'+subscriptionId+',stripe_subscription_id.eq.'+subscriptionId).single();
    if (error || !sub) throw new Error('Subscription not found: '+subscriptionId);
    const { data: events } = await this.db.from('subscription_events').select('*').eq('subscription_id', sub.id).order('created_at', { ascending: false }).limit(10);
    const { data: payments } = await this.db.from('payments').select('*').eq('subscription_id', sub.id).order('created_at', { ascending: false }).limit(12);
    let stripeStatus = null;
    if (this.stripe && sub.stripe_subscription_id) { try { const ss = await breakers.stripe.execute(() => this.stripe.subscriptions.retrieve(sub.stripe_subscription_id)); stripeStatus = { status: ss.status, currentPeriodEnd: ss.current_period_end, cancelAtPeriodEnd: ss.cancel_at_period_end }; } catch(e) { log.warn('Could not fetch Stripe status', { message: e.message }); } }
    return { ...sub, events: events || [], payments: payments || [], stripeStatus };
  }

  async listUserSubscriptions(userId, options = {}) {
    if (!this.db) return { subscriptions: [] };
    let q = this.db.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (options.status) q = q.eq('status', options.status);
    if (options.limit) q = q.limit(options.limit);
    const { data, error } = await q;
    if (error) { log.error('Failed to list subscriptions', { error: error.message }); throw new Error('Failed to list subscriptions'); }
    return { subscriptions: data || [] };
  }

  async previewPlanChange(params) {
    const { subscriptionId, newTier, newInterval } = params;
    const [proration, cyclePreview] = await Promise.all([this.calculateProration({ subscriptionId, newPriceId: this.getPriceId(newTier, newInterval) }), this.previewBillingCycleChange({ subscriptionId, newTier, newInterval })]);
    return { success: true, proration, billing: cyclePreview, immediateCharge: proration.totalDue, newRegularAmount: cyclePreview.preview.amount };
  }

  async getUserSubscriptionStatus(userId) {
    const { subscriptions } = await this.listUserSubscriptions(userId, { status: 'active', limit: 1 });
    const sub = subscriptions[0];
    if (!sub) return { hasSubscription: false, status: 'inactive', message: 'No active subscription found' };
    const cycleInfo = await this.getBillingCycleInfo(sub.stripe_subscription_id);
    const { data: payments } = await this.db?.from('payments').select('*').eq('subscription_id', sub.id).order('created_at', { ascending: false }).limit(6) || { data: [] };
    const portalSession = await this.createPortalSession(sub.stripe_customer_id, { returnUrl: (process.env.APP_URL||'')+'/dashboard/billing' });
    return { hasSubscription: true, subscription: { id: sub.id, stripeId: sub.stripe_subscription_id, tier: sub.tier, interval: sub.interval, status: sub.status, currentPeriodStart: sub.current_period_start, currentPeriodEnd: sub.current_period_end, cancelAtPeriodEnd: sub.cancel_at_period_end, trialEnd: sub.trial_end }, billing: cycleInfo, payments: payments || [], portalUrl: portalSession.url, canManage: true };
  }

  async getSubscriptionAnalytics(userId) {
    const { subscriptions } = await this.listUserSubscriptions(userId);
    const activeSub = subscriptions.find(s => s.status === 'active');
    return { totalSubscriptions: subscriptions.length, activeSubscriptions: subscriptions.filter(s => s.status === 'active').length, totalSpent: subscriptions.reduce((sum,s) => sum + (s.metadata?.totalSpent||0), 0), currentMRR: activeSub ? this._calculateMRR(activeSub) : 0, subscriptionHistory: subscriptions };
  }

  // ==================== BILLING CYCLE ====================
  async getBillingCycleInfo(subscriptionId) {
    if (!this.stripe) return this._getMockBillingCycleInfo(subscriptionId);
    try {
      const s = await breakers.stripe.execute(() => this.stripe.subscriptions.retrieve(subscriptionId));
      const now = Math.floor(Date.now()/1000), ps = s.current_period_start, pe = s.current_period_end, tp = pe-ps, el = now-ps, rem = pe-now;
      let ui = null; try { ui = await breakers.stripe.execute(() => this.stripe.invoices.retrieveUpcoming({ subscription: subscriptionId })); } catch(e) {}
      return { success: true, subscriptionId, status: s.status, currentPeriod: { start: new Date(ps*1000), end: new Date(pe*1000), length: tp, elapsed: el, remaining: rem }, cycleProgress: Math.round(Math.min(100, Math.max(0, (el/tp)*100))*100)/100, daysRemaining: Math.floor(rem/86400), nextBillingDate: new Date(pe*1000), cancelAtPeriodEnd: s.cancel_at_period_end, upcomingInvoice: ui ? { amountDue: ui.amount_due/100, subtotal: ui.subtotal/100, tax: ui.tax/100, currency: ui.currency, periodStart: new Date(ui.period_start*1000), periodEnd: new Date(ui.period_end*1000) } : null };
    } catch (error) { log.error('Failed to get billing cycle info', error); throw error; }
  }

  async calculateProration(params) {
    const { subscriptionId, newPriceId, prorationDate } = params;
    if (!this.stripe) return this._getMockProrationCalculation(newPriceId);
    try {
      const sub = await breakers.stripe.execute(() => this.stripe.subscriptions.retrieve(subscriptionId));
      const ui = await breakers.stripe.execute(() => this.stripe.invoices.retrieveUpcoming({ subscription: subscriptionId, subscription_items: [{ id: sub.items.data[0].id, price: newPriceId }], subscription_proration_date: prorationDate || Math.floor(Date.now()/1000) }));
      const pi = ui.lines.data.filter(l => l.proration || l.amount < 0);
      const pc = pi.filter(i => i.amount > 0).reduce((s,i) => s+i.amount, 0);
      const pcr = pi.filter(i => i.amount < 0).reduce((s,i) => s+Math.abs(i.amount), 0);
      const np = pc - pcr;
      return { success: true, subscriptionId, newPriceId, prorationDate: prorationDate ? new Date(prorationDate*1000) : new Date(), currency: ui.currency, currentPeriod: { start: new Date(ui.period_start*1000), end: new Date(ui.period_end*1000) }, charges: { prorationCharge: pc/100, prorationCredit: pcr/100, netProration: np/100 }, newPlanAmount: (ui.subtotal-np)/100, totalDue: ui.amount_due/100, breakdown: pi.map(i => ({ description: i.description, amount: i.amount/100, period: i.period ? { start: new Date(i.period.start*1000), end: new Date(i.period.end*1000) } : null })) };
    } catch (error) { log.error('Failed to calculate proration', error); throw error; }
  }

  async previewBillingCycleChange(params) {
    const { subscriptionId, newTier, newInterval } = params;
    if (!this.stripe) return this._getMockBillingCyclePreview(newTier, newInterval);
    try {
      const s = await breakers.stripe.execute(() => this.stripe.subscriptions.retrieve(subscriptionId));
      const ci = s.items.data[0]; const ti = newInterval || ci.price.recurring.interval;
      const np = TIER_PRICES[newTier]?.[ti]; if (!np) throw new Error('Invalid tier '+newTier);
      const ui = await breakers.stripe.execute(() => this.stripe.invoices.retrieveUpcoming({ subscription: subscriptionId, subscription_items: [{ id: ci.id, price: np }] }));
      const newPrice = await breakers.stripe.execute(() => this.stripe.prices.retrieve(np, { expand: ['product'] }));
      return { success: true, current: { tier: s.metadata.tier, interval: ci.price.recurring.interval, amount: ci.price.unit_amount/100, currentPeriodEnd: new Date(s.current_period_end*1000) }, preview: { tier: newTier, interval: ti, amount: newPrice.unit_amount/100, nextBillingDate: new Date(s.current_period_end*1000), immediateCharge: ui.amount_due/100, currency: ui.currency }, change: { effectiveDate: 'immediately', nextRegularBilling: new Date(s.current_period_end*1000) } };
    } catch (error) { log.error('Failed to preview billing cycle', error); throw error; }
  }

  async updateBillingCycle(params) {
    if (!this.stripe) return { success: true, mock: true };
    try { const s = await breakers.stripe.execute(() => this.stripe.subscriptions.update(params.subscriptionId, { billing_cycle_anchor: params.billingCycleAnchor||'now', proration_behavior: 'create_prorations' })); return { success: true, subscriptionId: s.id, newPeriodStart: new Date(s.current_period_start*1000), newPeriodEnd: new Date(s.current_period_end*1000), prorationApplied: true }; }
    catch (error) { log.error('Failed to update billing cycle', error); throw error; }
  }

  async getRenewalHistory(subscriptionId) {
    if (!this.db) return { renewals: [] };
    try {
      const { data: payments, error } = await this.db.from('payments').select('*').eq('subscription_id', subscriptionId).eq('status', 'succeeded').order('created_at', { ascending: false });
      if (error) throw error;
      const renewals = (payments||[]).map(p => ({ date: p.created_at, amount: p.amount, currency: p.currency, periodStart: p.period_start, periodEnd: p.period_end, invoiceId: p.stripe_invoice_id, status: p.status }));
      return { success: true, subscriptionId, renewals, totalRenewals: renewals.length, lifetimeValue: renewals.reduce((s,r) => s+r.amount, 0) };
    } catch (error) { log.error('Failed to get renewal history', error); throw error; }
  }

  async getUpcomingRenewals(options = {}) {
    const { userId, days = 30 } = await options;
    if (!this.db) return { renewals: [] };
    try {
      const now = new Date(), future = new Date(now.getTime()+days*86400000);
      let q = this.db.from('subscriptions').select('*, agents:user_id (email, name)').eq('status', 'active').lte('current_period_end', future.toISOString()).gte('current_period_end', now.toISOString()).order('current_period_end', { ascending: true });
      if (userId) q = q.eq('user_id', userId);
      const { data, error } = await q; if (error) throw error;
      return { success: true, renewals: (data||[]).map(s => ({ subscriptionId: s.id, stripeSubscriptionId: s.stripe_subscription_id, userId: s.user_id, userEmail: s.agents?.email, tier: s.tier, amount: s.metadata?.amount||null, renewalDate: s.current_period_end, daysUntil: Math.ceil((new Date(s.current_period_end)-now)/86400000) })), total: data?.length||0 };
    } catch (error) { log.error('Failed to get upcoming renewals', error); throw error; }
  }

  async syncAllSubscriptions() { return this.syncBillingCycles(); }

  async syncBillingCycles(subscriptionId = null) {
    if (!this.stripe || !this.db) return { synced: 0 };
    try {
      const subs = subscriptionId ? [await breakers.stripe.execute(() => this.stripe.subscriptions.retrieve(subscriptionId))] : (await breakers.stripe.execute(() => this.stripe.subscriptions.list({ status: 'all', limit: 100 }))).data;
      let synced = 0;
      for (const sub of subs) {
        const uid = sub.metadata?.user_id; if (!uid) continue;
        const { error } = await this.db.from('subscriptions').update({ status: sub.status, current_period_start: new Date(sub.current_period_start*1000), current_period_end: new Date(sub.current_period_end*1000), cancel_at_period_end: sub.cancel_at_period_end, canceled_at: sub.canceled_at ? new Date(sub.canceled_at*1000) : null, ended_at: sub.ended_at ? new Date(sub.ended_at*1000) : null }).eq('stripe_subscription_id', sub.id);
        if (!error) synced++;
        await this.db.from('real_estate_agents').update({ subscription_status: sub.status, current_period_end: new Date(sub.current_period_end*1000) }).eq('id', uid);
      }
      return { success: true, synced, totalProcessed: subs.length };
    } catch (error) { log.error('Failed to sync billing cycles', error); throw error; }
  }

  // ==================== PORTAL ====================
  async configurePortal() {
    if (!this.stripe) return { mock: true, config: PORTAL_CONFIG };
    try {
      const cfgs = await breakers.stripe.execute(() => this.stripe.billingPortal.configurations.list({ limit: 1 }));
      const cd = { business_profile: { headline: PORTAL_CONFIG.business.name, privacy_policy_url: PORTAL_CONFIG.business.privacy_policy_url, terms_of_service_url: PORTAL_CONFIG.business.terms_of_service_url }, features: { subscription_management: { enabled: PORTAL_CONFIG.features.subscription_management, default_allowed_updates: ['price','quantity','promotion_code'], proration_behavior: 'create_prorations', cancellation_mode: 'at_period_end', cancellation_reason: { enabled: PORTAL_CONFIG.features.cancellation_reasons, options: ['too_expensive','missing_features','switched_service','unused','customer_service','too_complex','low_quality','other'] } }, payment_method_management: { enabled: PORTAL_CONFIG.features.payment_method_management }, invoice_history: { enabled: PORTAL_CONFIG.features.invoice_history }, coupon_management: { enabled: PORTAL_CONFIG.features.coupon_management } } };
      const cfg = cfgs.data.length > 0 ? await breakers.stripe.execute(() => this.stripe.billingPortal.configurations.update(cfgs.data[0].id, cd)) : await breakers.stripe.execute(() => this.stripe.billingPortal.configurations.create(cd));
      return { success: true, configurationId: cfg.id, config: PORTAL_CONFIG };
    } catch (error) { log.error('Failed to configure Stripe Customer Portal', error); throw error; }
  }

  async createPortalSession(customerId, options = {}) {
    if (!customerId) throw new Error('Customer ID is required to create portal session');
    if (!this.stripe) return { mock: true, url: options.returnUrl || 'https://landyourleads.com/dashboard', customerId };
    try {
      const sc = { customer: customerId, return_url: options.returnUrl || stripeConfig.portalReturnUrl };
      if (options.locale) sc.locale = options.locale;
      if (options.configurationId) sc.configuration = options.configurationId;
      const session = await breakers.stripe.execute(() => this.stripe.billingPortal.sessions.create(sc));
      return { success: true, url: session.url, sessionId: session.id, customerId: session.customer };
    } catch (error) { log.error('Failed to create portal session', error); throw error; }
  }

  getPortalConfig() { return { ...PORTAL_CONFIG, returnUrl: stripeConfig.portalReturnUrl }; }
  getSubscriptionManagementConfig() { return { enabled: PORTAL_CONFIG.features.subscription_management, allowPlanChanges: true, allowQuantityUpdates: true, allowPause: false, cancellationMode: 'at_period_end', cancellationReasons: [{ value: 'too_expensive', label: 'Too expensive' },{ value: 'missing_features', label: 'Missing features I need' },{ value: 'switched_service', label: 'Switched to a different service' },{ value: 'unused', label: "I don't use it enough" },{ value: 'customer_service', label: 'Customer service issues' },{ value: 'too_complex', label: 'Too complicated to use' },{ value: 'low_quality', label: "Quality didn't meet expectations" },{ value: 'other', label: 'Other reason' }], prorationBehavior: 'create_prorations' }; }
  getPaymentMethodConfig() { return { enabled: PORTAL_CONFIG.features.payment_method_management, allowedTypes: ['card','bank_transfer'], allowMultipleMethods: false, requireDefault: true, allowRemoval: true }; }
  getInvoiceHistoryConfig() { return { enabled: PORTAL_CONFIG.features.invoice_history, allowDownload: true, allowEmailResend: true, maxHistoryMonths: 24 }; }
  updatePortalBranding(b) { if (b.primary_color) PORTAL_CONFIG.branding.primary_color = b.primary_color; if (b.secondary_color) PORTAL_CONFIG.branding.secondary_color = b.secondary_color; if (b.logo_url) PORTAL_CONFIG.branding.logo_url = b.logo_url; if (b.icon_url) PORTAL_CONFIG.branding.icon_url = b.icon_url; return PORTAL_CONFIG.branding; }

  async getCustomerSubscriptions(customerId) {
    if (!this.stripe || customerId.startsWith('mock_')) return { mock: true, subscriptions: [{ id: 'mock_sub_123', status: 'active', plan: 'Professional', amount: 997, currency: 'usd', interval: 'month', currentPeriodStart: Date.now()/1000-86400*15, currentPeriodEnd: Date.now()/1000+86400*15, cancelAtPeriodEnd: false }] };
    try { const subs = await breakers.stripe.execute(() => this.stripe.subscriptions.list({ customer: customerId, status: 'all', expand: ['data.items.price.product'] })); return { success: true, subscriptions: subs.data.map(s => ({ id: s.id, status: s.status, plan: s.items.data[0]?.price?.product?.name||'Unknown Plan', amount: s.items.data[0]?.price?.unit_amount/100, currency: s.currency, interval: s.items.data[0]?.price?.recurring?.interval, currentPeriodStart: s.current_period_start, currentPeriodEnd: s.current_period_end, cancelAtPeriodEnd: s.cancel_at_period_end, canceledAt: s.canceled_at, endedAt: s.ended_at })) }; }
    catch (error) { log.error('Failed to get customer subscriptions', error); throw error; }
  }

  async getCustomerInvoices(customerId, options = {}) {
    if (!this.stripe || customerId.startsWith('mock_')) return { mock: true, invoices: [{ id: 'mock_inv_123', number: 'INV-001', amountDue: 997, amountPaid: 997, currency: 'usd', status: 'paid', created: Date.now()/1000-86400*15, periodStart: Date.now()/1000-86400*30, periodEnd: Date.now()/1000-86400, pdfUrl: 'https://landyourleads.com/mock-invoice.pdf' }] };
    try { const invs = await breakers.stripe.execute(() => this.stripe.invoices.list({ customer: customerId, limit: options.limit||24, starting_after: options.startingAfter })); return { success: true, invoices: invs.data.map(i => ({ id: i.id, number: i.number, amountDue: i.amount_due/100, amountPaid: i.amount_paid/100, currency: i.currency, status: i.status, created: i.created, periodStart: i.period_start, periodEnd: i.period_end, pdfUrl: i.invoice_pdf, hostedInvoiceUrl: i.hosted_invoice_url })), hasMore: invs.has_more }; }
    catch (error) { log.error('Failed to get customer invoices', error); throw error; }
  }

  async getCustomerPaymentMethods(customerId) {
    if (!this.stripe || customerId.startsWith('mock_')) return { mock: true, paymentMethods: [{ id: 'mock_pm_123', type: 'card', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2027, isDefault: true }] };
    try { const c = await breakers.stripe.execute(() => this.stripe.customers.retrieve(customerId)); const dpm = c.invoice_settings?.default_payment_method; const pms = await breakers.stripe.execute(() => this.stripe.paymentMethods.list({ customer: customerId, type: 'card' })); return { success: true, defaultPaymentMethod: dpm, paymentMethods: pms.data.map(pm => ({ id: pm.id, type: pm.type, brand: pm.card?.brand, last4: pm.card?.last4, expMonth: pm.card?.exp_month, expYear: pm.card?.exp_year, isDefault: pm.id === dpm })) }; }
    catch (error) { log.error('Failed to get customer payment methods', error); throw error; }
  }

  // ==================== WEBHOOK PROCESSING ====================
  async handleWebhook(event) { return this.processWebhookEvent(event); }

  async processWebhookEvent(event) {
    const hn = EVENT_HANDLERS[event.type];
    log.info('Processing webhook', { type: event.type, id: event.id });
    try {
      await this._logWebhookEvent(event);
      if (hn && typeof this[hn] === 'function') { const result = await this[hn](event.data.object); await this._markEventProcessed(event.id); return { success: true, type: event.type, processed: true, result }; }
      return { success: true, type: event.type, processed: false, reason: 'No handler registered' };
    } catch (error) { log.error('Error processing webhook', error, { type: event.type }); await this._logWebhookError(event, error); throw error; }
  }

  verifyWebhookSignature(payload, signature) {
    if (!this.stripe || !stripeConfig.webhookSecret) throw new Error('Webhook verification not configured');
    return this.stripe.webhooks.constructEvent(payload, signature, stripeConfig.webhookSecret);
  }

  async handleSubscriptionCreated(subscription) {
    const uid = subscription.metadata?.user_id; if (!uid) return { acknowledged: true, userUpdated: false };
    await this._upsertSubscription(subscription);
    await this._updateAgentStatus(uid, { subscriptionStatus: subscription.status, stripeCustomerId: subscription.customer, currentPeriodEnd: new Date(subscription.current_period_end*1000) });
    return { acknowledged: true, userUpdated: true };
  }

  async handleSubscriptionUpdated(subscription) {
    const uid = subscription.metadata?.user_id;
    await this._upsertSubscription(subscription);
    if (uid) await this._updateAgentStatus(uid, { subscriptionStatus: subscription.status, subscriptionTier: subscription.metadata?.tier, currentPeriodEnd: new Date(subscription.current_period_end*1000), cancelAtPeriodEnd: subscription.cancel_at_period_end });
    if (subscription.status === 'past_due') { const u = subscription.metadata?.user_id; if (u) log.info('Handling past due subscription', { subscriptionId: subscription.id }); }
    return { acknowledged: true, status: subscription.status };
  }

  async handleSubscriptionDeleted(subscription) {
    const uid = subscription.metadata?.user_id;
    await this._updateWebhookSubscriptionStatus(subscription.id, { status: 'canceled', endedAt: new Date(subscription.ended_at*1000), cancelAtPeriodEnd: false });
    if (uid) { await this._updateAgentStatus(uid, { subscriptionStatus: 'cancelled', subscriptionTier: null, currentPeriodEnd: null }); log.info('Handling account downgrade for user', { userId: uid }); }
    return { acknowledged: true, subscriptionEnded: true };
  }

  async handleSubscriptionPaused(subscription) { await this._updateWebhookSubscriptionStatus(subscription.id, { status: 'paused' }); const uid = subscription.metadata?.user_id; if (uid) await this._updateAgentStatus(uid, { subscriptionStatus: 'paused' }); return { acknowledged: true, status: 'paused' }; }
  async handleSubscriptionResumed(subscription) { await this._updateWebhookSubscriptionStatus(subscription.id, { status: subscription.status }); const uid = subscription.metadata?.user_id; if (uid) await this._updateAgentStatus(uid, { subscriptionStatus: subscription.status }); return { acknowledged: true, status: subscription.status }; }
  async handlePendingUpdateApplied(subscription) { if (this.db) await this.db.from('subscriptions').update({ pending_tier: null, pending_interval: null, pending_change_at: null }).eq('stripe_subscription_id', subscription.id); return { acknowledged: true }; }
  async handlePendingUpdateExpired(subscription) { if (this.db) await this.db.from('subscriptions').update({ pending_tier: null, pending_interval: null, pending_change_at: null }).eq('stripe_subscription_id', subscription.id); return { acknowledged: true }; }
  async handleTrialWillEnd(subscription) { const uid = subscription.metadata?.user_id; if (uid) log.info('Sending trial ending notification to user', { userId: uid }); return { acknowledged: true, notificationSent: !!uid }; }

  async handlePaymentSucceeded(invoice) {
    await this._recordPayment(invoice, 'succeeded');
    if (invoice.subscription && this.db) { const { data: sub } = await this.db.from('subscriptions').select('user_id').eq('stripe_subscription_id', invoice.subscription).single(); if (sub?.user_id) await this._updateAgentMRR(sub.user_id, invoice); }
    return { acknowledged: true, recorded: true };
  }

  async handlePaymentFailed(invoice) {
    await this._recordPayment(invoice, 'failed');
    if (invoice.subscription && this.db) { const { data: sub } = await this.db.from('subscriptions').select('user_id').eq('stripe_subscription_id', invoice.subscription).single(); if (sub?.user_id) log.info('Sending payment failed notification to user', { userId: sub.user_id }); }
    return { acknowledged: true, recorded: true };
  }

  async handleInvoicePaid() { return { acknowledged: true }; }
  async handlePaymentActionRequired(invoice) { if (invoice.subscription && this.db) { const { data: sub } = await this.db.from('subscriptions').select('user_id').eq('stripe_subscription_id', invoice.subscription).single(); if (sub?.user_id) log.info('Sending payment action required notification', { userId: sub.user_id }); } return { acknowledged: true }; }
  async handleInvoiceCreated() { return { acknowledged: true }; }
  async handleInvoiceFinalized() { return { acknowledged: true }; }
  async handleInvoiceUpcoming(invoice) { if (invoice.subscription && this.db) { const { data: sub } = await this.db.from('subscriptions').select('user_id').eq('stripe_subscription_id', invoice.subscription).single(); if (sub?.user_id) log.info('Sending upcoming invoice notification', { userId: sub.user_id }); } return { acknowledged: true }; }
  async handleInvoiceUncollectible(invoice) { await this._recordPayment(invoice, 'failed'); return { acknowledged: true }; }
  async handleInvoiceVoided() { return { acknowledged: true }; }
  async handlePaymentIntentSucceeded() { return { acknowledged: true }; }
  async handlePaymentIntentFailed() { return { acknowledged: true }; }
  async handlePaymentIntentRequiresAction() { return { acknowledged: true }; }
  async handleCustomerCreated() { return { acknowledged: true }; }
  async handleCustomerUpdated() { return { acknowledged: true }; }
  async handleCustomerDeleted() { return { acknowledged: true }; }
  async handlePaymentMethodAttached() { return { acknowledged: true }; }
  async handlePaymentMethodDetached() { return { acknowledged: true }; }

  async handleCheckoutCompleted(session) {
    const userId = session.client_reference_id || (session.metadata && session.metadata.agent_id) || null;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    if (this.db && userId) await this.db.from('checkout_sessions').update({ status: 'completed', completed_at: new Date(), stripe_session_id: session.id }).eq('user_id', userId);
    if (this.db && this.stripe && userId && subscriptionId) {
      try {
        const s = await breakers.stripe.execute(() => this.stripe.subscriptions.retrieve(subscriptionId));
        const li = s.items.data[0], pi = li?.price?.id||'unknown', iv = li?.price?.recurring?.interval||'month';
        const tier = (session.metadata && session.metadata.tier) || s.metadata?.tier || 'professional';
        const scid = typeof session.customer === 'string' ? session.customer : session.customer?.id || s.customer;
        const { error } = await this.db.from('subscriptions').upsert({ user_id: userId, stripe_customer_id: scid, stripe_subscription_id: s.id, status: s.status, tier, price_id: pi, interval: iv, current_period_start: new Date(s.current_period_start*1000), current_period_end: new Date(s.current_period_end*1000), trial_start: s.trial_start ? new Date(s.trial_start*1000) : null, trial_end: s.trial_end ? new Date(s.trial_end*1000) : null, cancel_at_period_end: s.cancel_at_period_end, metadata: s.metadata||{} }, { onConflict: 'stripe_subscription_id' });
        if (error) log.error('Failed to upsert subscription from checkout', error);
        await this.db.from('real_estate_agents').update({ stripe_customer_id: scid, subscription_status: 'active', plan_tier: tier, updated_at: new Date() }).eq('id', userId);
        if (session.metadata && session.metadata.source === 'admin_payment_link') {
          log.info({ agentId: userId, tier, sessionId: session.id }, 'Admin payment link converted');
        }
      } catch (err) { log.error('Error persisting subscription from checkout', err); }
    }
    return { acknowledged: true, subscriptionPersisted: !!(userId && subscriptionId) };
  }

  async handleCheckoutExpired(session) { if (this.db && session.client_reference_id) await this.db.from('checkout_sessions').update({ status: 'expired' }).eq('id', session.client_reference_id); return { acknowledged: true }; }
  async handleDisputeCreated() { return { acknowledged: true, requiresReview: true }; }
  async handleDisputeClosed() { return { acknowledged: true }; }

  // ==================== SIMPLE STRIPE ====================
  async createCustomer(agent) { if (!this.stripe) return { id: 'mock_customer_'+agent.id, mock: true }; return breakers.stripe.execute(() => this.stripe.customers.create({ email: agent.email, name: agent.name||agent.email, statement_descriptor: 'LANDYOURLEADS', metadata: { agent_id: agent.id, source: 'leadflow_onboarding' } })); }
  async createSubscription(customerId, priceId) { if (!this.stripe) return { id: 'mock_sub_'+Date.now(), mock: true, status: 'active' }; const dp = process.env.STRIPE_PRICE_BASIC||priceId; if (!dp) throw new Error('No price ID provided and STRIPE_PRICE_BASIC not set'); return breakers.stripe.execute(() => this.stripe.subscriptions.create({ customer: customerId, items: [{ price: dp }], payment_behavior: 'default_incomplete', payment_settings: { save_default_payment_method: 'on_subscription' }, expand: ['latest_invoice.payment_intent'], metadata: { source: 'leadflow_agent_signup' } })); }
  async attachPaymentMethod(customerId, paymentMethodId) { if (!this.stripe) return { success: true, mock: true }; await breakers.stripe.execute(() => this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })); await breakers.stripe.execute(() => this.stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } })); return { success: true }; }
  async createSetupIntent(customerId) { if (!this.stripe) return { client_secret: 'mock_secret_'+Date.now(), mock: true }; const si = await breakers.stripe.execute(() => this.stripe.setupIntents.create({ customer: customerId, usage: 'off_session', automatic_payment_methods: { enabled: true } })); return { client_secret: si.client_secret }; }
  async getSubscriptionStatus(subscriptionId) { if (!this.stripe || subscriptionId.startsWith('mock_')) return { status: 'active', mock: true }; const s = await breakers.stripe.execute(() => this.stripe.subscriptions.retrieve(subscriptionId)); return { status: s.status, current_period_end: s.current_period_end, cancel_at_period_end: s.cancel_at_period_end }; }
  async cancelSubscription(subscriptionId, immediate = false) { if (!this.stripe || subscriptionId.startsWith('mock_')) return { status: 'cancelled', mock: true }; return immediate ? breakers.stripe.execute(() => this.stripe.subscriptions.cancel(subscriptionId)) : breakers.stripe.execute(() => this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })); }
  async createCustomerPortal(customerId, options = {}) { return this.createPortalSession(customerId, options); }
  getPriceId(tier, interval) { return TIER_PRICES[tier]?.[interval]; }

  // ==================== PRIVATE HELPERS ====================
  _calculateMRR(sub) { const a = sub.metadata?.amount||0; return sub.interval === 'year' ? a/12 : a; }
  async _downgradeUserFeatures(userId) { log.info('Downgrading features for user', { userId }); }
  async _checkRefundEligibility() { return false; }

  async _persistSubscription(p) {
    if (!this.db) return { id: 'mock_sub_'+Date.now() };
    const { data, error } = await this.db.from('subscriptions').insert({ user_id: p.userId, stripe_customer_id: p.stripeCustomerId, stripe_subscription_id: p.stripeSubscriptionId, status: p.status, tier: p.tier, price_id: p.priceId, interval: p.interval, current_period_start: p.currentPeriodStart, current_period_end: p.currentPeriodEnd, trial_start: p.trialStart, trial_end: p.trialEnd, metadata: p.metadata }).select().single();
    if (error) { log.error('Failed to persist subscription', { error: error.message }); throw new Error('Failed to persist subscription'); }
    return data;
  }

  async _updateAgentSubscription(userId, u) { if (!this.db) return; await this.db.from('real_estate_agents').update({ subscription_status: u.subscriptionStatus, subscription_tier: u.subscriptionTier, stripe_customer_id: u.stripeCustomerId, current_period_end: u.currentPeriodEnd, trial_ends_at: u.trialEndsAt }).eq('id', userId); }

  async _updateSubscriptionInDatabase(sid, u) {
    if (!this.db) return;
    const d = {}; if (u.tier) d.tier = u.tier; if (u.priceId) d.price_id = u.priceId; if (u.interval) d.interval = u.interval; if (u.status) d.status = u.status; if (u.cancelAtPeriodEnd !== undefined) d.cancel_at_period_end = u.cancelAtPeriodEnd; if (u.canceledAt) d.canceled_at = u.canceledAt; if (u.cancellationReason) d.cancellation_reason = u.cancellationReason;
    await this.db.from('subscriptions').update(d).eq('stripe_subscription_id', sid);
  }

  async _logWebhookEvent(event) { if (!this.db) return; try { await this.db.from('subscription_events').insert({ stripe_event_id: event.id, event_type: event.type, stripe_event_data: event, processed_at: new Date() }); } catch(e) { log.error('Failed to log webhook event', e); } }
  async _markEventProcessed(eventId) { if (!this.db) return; try { await this.db.from('subscription_events').update({ processed_at: new Date() }).eq('stripe_event_id', eventId); } catch(e) { log.error('Failed to mark event processed', e); } }
  async _logWebhookError(event, error) { if (!this.db) return; try { await this.db.from('subscription_events').update({ processing_error: error.message, error_at: new Date() }).eq('stripe_event_id', event.id); } catch(e) { log.error('Failed to log webhook error', e); } }

  async _upsertSubscription(ss) {
    if (!this.db) return;
    const d = { user_id: ss.metadata?.user_id, stripe_customer_id: ss.customer, stripe_subscription_id: ss.id, status: ss.status, tier: ss.metadata?.tier||'unknown', price_id: ss.items.data[0]?.price?.id, interval: ss.items.data[0]?.price?.recurring?.interval, current_period_start: new Date(ss.current_period_start*1000), current_period_end: new Date(ss.current_period_end*1000), trial_start: ss.trial_start ? new Date(ss.trial_start*1000) : null, trial_end: ss.trial_end ? new Date(ss.trial_end*1000) : null, cancel_at_period_end: ss.cancel_at_period_end, canceled_at: ss.canceled_at ? new Date(ss.canceled_at*1000) : null, ended_at: ss.ended_at ? new Date(ss.ended_at*1000) : null, metadata: ss.metadata };
    const { data: existing } = await this.db.from('subscriptions').select('id').eq('stripe_subscription_id', ss.id).single();
    if (existing) await this.db.from('subscriptions').update(d).eq('id', existing.id);
    else await this.db.from('subscriptions').insert(d);
  }

  async _updateWebhookSubscriptionStatus(sid, u) { if (!this.db) return; const d = {}; if (u.status) d.status = u.status; if (u.endedAt) d.ended_at = u.endedAt; if (u.cancelAtPeriodEnd !== undefined) d.cancel_at_period_end = u.cancelAtPeriodEnd; await this.db.from('subscriptions').update(d).eq('stripe_subscription_id', sid); }

  async _updateAgentStatus(userId, s) {
    if (!this.db) return;
    const u = {}; if (s.subscriptionStatus) u.subscription_status = s.subscriptionStatus; if (s.subscriptionTier) u.subscription_tier = s.subscriptionTier; if (s.stripeCustomerId) u.stripe_customer_id = s.stripeCustomerId; if (s.currentPeriodEnd) u.current_period_end = s.currentPeriodEnd; if (s.cancelAtPeriodEnd !== undefined) u.cancel_at_period_end = s.cancelAtPeriodEnd;
    await this.db.from('real_estate_agents').update(u).eq('id', userId);
  }

  async _recordPayment(invoice, status) {
    if (!this.db) return;
    const { data: sub } = await this.db.from('subscriptions').select('id, user_id').eq('stripe_subscription_id', invoice.subscription).single();
    await this.db.from('payments').upsert({ subscription_id: sub?.id, user_id: sub?.user_id, stripe_invoice_id: invoice.id, stripe_payment_intent_id: invoice.payment_intent, amount: invoice.amount_paid/100, currency: invoice.currency, status, period_start: invoice.period_start ? new Date(invoice.period_start*1000) : null, period_end: invoice.period_end ? new Date(invoice.period_end*1000) : null, receipt_url: invoice.hosted_invoice_url, failure_message: status === 'failed' ? invoice.last_finalization_error?.message : null }, { onConflict: 'stripe_invoice_id' });
  }

  async _updateAgentMRR(userId, invoice) { if (!this.db) return; let mrr = invoice.subtotal; if (invoice.lines?.data[0]?.price?.recurring?.interval === 'year') mrr = mrr/12; await this.db.from('real_estate_agents').update({ mrr: mrr/100 }).eq('id', userId); }

  _createMockSubscription(userId, tier, interval) { const now = Date.now(); return { success: true, subscriptionId: 'mock_sub_'+now, stripeSubscriptionId: 'mock_stripe_sub_'+now, status: 'active', tier, interval, clientSecret: 'mock_secret_'+now, mock: true, currentPeriodEnd: Math.floor((now+(interval==='year'?365:30)*86400000)/1000) }; }
  _getMockSubscriptionDetails(id) { return { id, stripe_subscription_id: 'mock_stripe_'+id, status: 'active', tier: 'professional', interval: 'month', events: [], payments: [], mock: true }; }
  _getMockBillingCycleInfo(id) { const n = Date.now(); return { success: true, subscriptionId: id, status: 'active', currentPeriod: { start: new Date(n-15*86400000), end: new Date(n+15*86400000), length: 30*86400, elapsed: 15*86400, remaining: 15*86400 }, cycleProgress: 50, daysRemaining: 15, nextBillingDate: new Date(n+15*86400000), cancelAtPeriodEnd: false, upcomingInvoice: { amountDue: 997, subtotal: 997, tax: 0, currency: 'usd', periodStart: new Date(n+15*86400000), periodEnd: new Date(n+45*86400000) } }; }
  _getMockProrationCalculation(pid) { return { success: true, newPriceId: pid, prorationDate: new Date(), currency: 'usd', currentPeriod: { start: new Date(), end: new Date(Date.now()+30*86400000) }, charges: { prorationCharge: 500, prorationCredit: 250, netProration: 250 }, newPlanAmount: 997, totalDue: 1247, breakdown: [{ description: 'Remaining time on current plan', amount: -250 },{ description: 'New plan proration', amount: 500 }] }; }
  _getMockBillingCyclePreview(tier, interval) { return { success: true, current: { tier: 'starter', interval: 'month', amount: 297, currentPeriodEnd: new Date(Date.now()+15*86400000) }, preview: { tier, interval, amount: tier==='professional'?997:1997, nextBillingDate: new Date(Date.now()+15*86400000), immediateCharge: 450, currency: 'usd' }, change: { effectiveDate: 'immediately', nextRegularBilling: new Date(Date.now()+15*86400000) } }; }
}

const billingService = new BillingService();
module.exports = billingService;
module.exports.BillingService = BillingService;
module.exports.PORTAL_CONFIG = PORTAL_CONFIG;
module.exports.TIER_PRICES = TIER_PRICES;
module.exports.EVENT_HANDLERS = EVENT_HANDLERS;
