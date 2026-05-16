'use strict'

const PLAN_PRICE_CENTS = {
  starter: 4900,
  pro: 14900,
  professional: 14900,
  team: 39900,
  enterprise: 39900,
  brokerage: 99900,
}

const FUNNEL_ALERT_THRESHOLDS = {
  fubActivationRate: 0.2,
  ahaCompletionRate: 0.3,
}

function toRate(numerator, denominator) {
  if (!denominator || denominator <= 0) return 0
  return Number((numerator / denominator).toFixed(4))
}

function toPriceCents(tier) {
  if (!tier) return 0
  return PLAN_PRICE_CENTS[String(tier).toLowerCase()] || 0
}

function computeConversionRate(activeSubscribers, trialUsers) {
  return toRate(activeSubscribers, activeSubscribers + trialUsers)
}

function computeAlertBreaches(rates) {
  const breaches = []
  if (rates.fubActivationRate < FUNNEL_ALERT_THRESHOLDS.fubActivationRate) {
    breaches.push({ metric: 'fub_activation_rate', threshold: FUNNEL_ALERT_THRESHOLDS.fubActivationRate, actual: rates.fubActivationRate })
  }
  if (rates.ahaCompletionRate < FUNNEL_ALERT_THRESHOLDS.ahaCompletionRate) {
    breaches.push({ metric: 'aha_completion_rate', threshold: FUNNEL_ALERT_THRESHOLDS.ahaCompletionRate, actual: rates.ahaCompletionRate })
  }
  return breaches
}

module.exports = {
  PLAN_PRICE_CENTS,
  FUNNEL_ALERT_THRESHOLDS,
  toRate,
  toPriceCents,
  computeConversionRate,
  computeAlertBreaches,
}
