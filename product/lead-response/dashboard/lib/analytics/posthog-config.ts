/**
 * PostHog Configuration
 * 
 * This file contains the PostHog analytics configuration for LeadFlow.
 * API keys should be set in environment variables.
 */

export const posthogConfig = {
  // Public API key (safe to expose in client-side code)
  apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
  
  // PostHog host (use EU host for EU data residency)
  apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  
  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
  
  // Capture page views automatically (disabled - we track manually)
  capture_pageview: false,

  // Capture page leaves (time spent on page)
  capture_pageleave: true,

  // Autocapture configuration
  // Set to true to enable, false to disable, or provide a config object
  autocapture: true,

  // Session recording options (applied in provider)
  sessionRecordingOptions: process.env.NODE_ENV === 'production' ? {
    maskAllInputs: true,
  } : undefined,
  
  // Properties to include with every event
  superProperties: {
    app: 'leadflow',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
  },
};

// Check if PostHog is properly configured
export const isPostHogConfigured = (): boolean => {
  return !!posthogConfig.apiKey && posthogConfig.apiKey.length > 0;
};

// Event names for consistent tracking
export const PostHogEvents = {
  // Page views
  PAGE_VIEW: '$pageview',
  PAGE_LEAVE: '$pageleave',
  
  // User actions
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_SIGNUP: 'user_signup',
  USER_ONBOARDING_STARTED: 'user_onboarding_started',
  USER_ONBOARDING_COMPLETED: 'user_onboarding_completed',
  USER_SETTINGS_UPDATED: 'user_settings_updated',
  
  // Lead actions
  LEAD_VIEWED: 'lead_viewed',
  LEAD_CREATED: 'lead_created',
  LEAD_UPDATED: 'lead_updated',
  LEAD_DELETED: 'lead_deleted',
  LEAD_QUALIFIED: 'lead_qualified',
  
  // Funnel events
  FUNNEL_SIGNUP_STARTED: 'funnel_signup_started',
  FUNNEL_SIGNUP_COMPLETED: 'funnel_signup_completed',
  FUNNEL_ONBOARDING_STEP_1: 'funnel_onboarding_step_1',
  FUNNEL_ONBOARDING_STEP_2: 'funnel_onboarding_step_2',
  FUNNEL_ONBOARDING_STEP_3: 'funnel_onboarding_step_3',
  FUNNEL_FIRST_LEAD_CREATED: 'funnel_first_lead_created',
  FUNNEL_FIRST_LEAD_QUALIFIED: 'funnel_first_lead_qualified',
  
  // Dashboard actions
  DASHBOARD_ACCESSED: 'dashboard_accessed',
  DASHBOARD_METRICS_VIEWED: 'dashboard_metrics_viewed',
  DASHBOARD_REPORTS_VIEWED: 'dashboard_reports_viewed',
  
  // Settings actions
  SETTINGS_PAGE_VIEWED: 'settings_page_viewed',
  SETTINGS_INTEGRATION_CONNECTED: 'settings_integration_connected',
  SETTINGS_INTEGRATION_DISCONNECTED: 'settings_integration_disconnected',
  SETTINGS_NOTIFICATIONS_UPDATED: 'settings_notifications_updated',
  SETTINGS_UPDATED: 'settings_updated',
  
  // Billing actions
  BILLING_PORTAL_OPENED: 'billing_portal_opened',
  BILLING_PORTAL_SESSION_CREATED: 'billing_portal_session_created',
  BILLING_SUBSCRIPTION_VIEWED: 'billing_subscription_viewed',
  BILLING_PAYMENT_METHOD_UPDATED: 'billing_payment_method_updated',
  BILLING_PLAN_CHANGED: 'billing_plan_changed',
  BILLING_SUBSCRIPTION_CANCELLED: 'billing_subscription_cancelled',
  BILLING_INVOICE_VIEWED: 'billing_invoice_viewed',
  
  // Feature usage
  FEATURE_USED: 'feature_used',
  FEATURE_FLAG_ENABLED: 'feature_flag_enabled',
  
  // Errors
  ERROR_OCCURRED: 'error_occurred',
  ERROR_BOUNDARY_CAUGHT: 'error_boundary_caught',
} as const;

// Event properties for consistent tracking
export const PostHogProperties = {
  // User properties
  USER_ID: 'user_id',
  USER_EMAIL: 'user_email',
  USER_ROLE: 'user_role',
  USER_PLAN: 'user_plan',
  
  // Page properties
  PAGE_PATH: '$current_url',
  PAGE_TITLE: '$page_title',
  PAGE_REFERRER: '$referrer',
  
  // Lead properties
  LEAD_ID: 'lead_id',
  LEAD_SOURCE: 'lead_source',
  LEAD_STATUS: 'lead_status',
  LEAD_SCORE: 'lead_score',
  
  // Funnel properties
  FUNNEL_STEP: 'funnel_step',
  FUNNEL_TOTAL_STEPS: 'funnel_total_steps',
  FUNNEL_COMPLETION_TIME: 'funnel_completion_time',
  
  // Feature properties
  FEATURE_NAME: 'feature_name',
  FEATURE_CATEGORY: 'feature_category',
  
  // Error properties
  ERROR_MESSAGE: 'error_message',
  ERROR_STACK: 'error_stack',
  ERROR_COMPONENT: 'error_component',
} as const;

// Type definitions for events
export type PostHogEventName = typeof PostHogEvents[keyof typeof PostHogEvents];
export type PostHogPropertyName = typeof PostHogProperties[keyof typeof PostHogProperties];

// User properties for identification
export interface PostHogUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  plan?: string;
  company?: string;
  createdAt?: string;
}
