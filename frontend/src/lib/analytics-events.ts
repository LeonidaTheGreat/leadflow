/**
 * PostHog Event Tracking Constants
 * Standardized event names and properties for analytics
 */

// Page View Events
export const PageEvents = {
  LANDING_PAGE_VIEW: 'landing_page_viewed',
  ONBOARDING_PAGE_VIEW: 'onboarding_page_viewed',
  DASHBOARD_PAGE_VIEW: 'dashboard_page_viewed',
  SETTINGS_PAGE_VIEW: 'settings_page_viewed',
  EXPERIMENTS_PAGE_VIEW: 'experiments_page_viewed',
  PAGE_LEAVE: 'page_leave',
} as const

// User Action Events
export const UserEvents = {
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_SIGNUP: 'user_signup',
  USER_ONBOARDING_STARTED: 'user_onboarding_started',
  USER_ONBOARDING_COMPLETED: 'user_onboarding_completed',
  USER_ONBOARDING_STEP_COMPLETED: 'user_onboarding_step_completed',
  USER_SETTINGS_UPDATED: 'user_settings_updated',
  USER_PROFILE_UPDATED: 'user_profile_updated',
} as const

// Lead Events
export const LeadEvents = {
  LEAD_VIEWED: 'lead_viewed',
  LEAD_CREATED: 'lead_created',
  LEAD_UPDATED: 'lead_updated',
  LEAD_DELETED: 'lead_deleted',
  LEAD_QUALIFIED: 'lead_qualified',
  LEAD_CAPTURED: 'lead_captured',
} as const

// Funnel Events
export const FunnelEvents = {
  FUNNEL_SIGNUP_STARTED: 'funnel_signup_started',
  FUNNEL_SIGNUP_COMPLETED: 'funnel_signup_completed',
  FUNNEL_ONBOARDING_STEP_1: 'funnel_onboarding_step_1',
  FUNNEL_ONBOARDING_STEP_2: 'funnel_onboarding_step_2',
  FUNNEL_ONBOARDING_STEP_3: 'funnel_onboarding_step_3',
  FUNNEL_FIRST_LEAD_CREATED: 'funnel_first_lead_created',
  FUNNEL_FIRST_LEAD_QUALIFIED: 'funnel_first_lead_qualified',
  FUNNEL_FIRST_BOOKING: 'funnel_first_booking',
} as const

// Conversion Events
export const ConversionEvents = {
  CONVERSION: 'conversion',
  LEAD_CAPTURE: 'lead_capture',
  EMAIL_CAPTURED: 'email_captured',
  FORM_SUBMITTED: 'form_submitted',
  CTA_CLICKED: 'cta_clicked',
} as const

// Feature Events
export const FeatureEvents = {
  FEATURE_USED: 'feature_used',
  FEATURE_CLICKED: 'feature_clicked',
  FEATURE_FLAG_ENABLED: 'feature_flag_enabled',
  EXPERIMENT_VIEWED: '$feature_view',
} as const

// Integration Events
export const IntegrationEvents = {
  INTEGRATION_CONNECTED: 'integration_connected',
  INTEGRATION_DISCONNECTED: 'integration_disconnected',
  INTEGRATION_ERROR: 'integration_error',
  CALCOM_BOOKING_CREATED: 'calcom_booking_created',
  CALCOM_BOOKING_CANCELLED: 'calcom_booking_cancelled',
  FUB_SYNC_COMPLETED: 'fub_sync_completed',
  STRIPE_PAYMENT_SUCCESS: 'stripe_payment_success',
  STRIPE_PAYMENT_FAILED: 'stripe_payment_failed',
} as const

// Error Events
export const ErrorEvents = {
  ERROR_OCCURRED: 'error_occurred',
  ERROR_BOUNDARY_CAUGHT: 'error_boundary_caught',
  API_ERROR: 'api_error',
  VALIDATION_ERROR: 'validation_error',
} as const

// Performance Events
export const PerformanceEvents = {
  PAGE_LOAD_TIME: 'page_load_time',
  COMPONENT_RENDER_TIME: 'component_render_time',
  API_RESPONSE_TIME: 'api_response_time',
  LCP_MEASURED: 'lcp_measured',
  FID_MEASURED: 'fid_measured',
  CLS_MEASURED: 'cls_measured',
} as const

// Navigation Events
export const NavigationEvents = {
  NAV_LOGIN_CLICKED: 'nav_login_clicked',
  NAV_GET_STARTED_CLICKED: 'nav_get_started_clicked',
  NAV_LINK_CLICKED: 'nav_link_clicked',
  FOOTER_PRIVACY_CLICKED: 'footer_privacy_clicked',
  FOOTER_TERMS_CLICKED: 'footer_terms_clicked',
  FOOTER_SUPPORT_CLICKED: 'footer_support_clicked',
} as const

// Combine all events
export const PostHogEvents = {
  ...PageEvents,
  ...UserEvents,
  ...LeadEvents,
  ...FunnelEvents,
  ...ConversionEvents,
  ...FeatureEvents,
  ...IntegrationEvents,
  ...ErrorEvents,
  ...PerformanceEvents,
  ...NavigationEvents,
} as const

// Type for all event names
export type PostHogEventName = typeof PostHogEvents[keyof typeof PostHogEvents]

// Standard property types
export interface EventProperties {
  [key: string]: any
}

export interface ConversionProperties extends EventProperties {
  conversion_type: string
  conversion_value?: number
  currency?: string
}

export interface LeadProperties extends EventProperties {
  lead_id?: string
  email?: string
  email_domain?: string
  source?: string
  variant?: string
}

export interface PageViewProperties extends EventProperties {
  url?: string
  referrer?: string
  path?: string
  title?: string
  variant?: string
}

export interface FeatureProperties extends EventProperties {
  feature_name: string
  feature_category?: string
}

export interface ErrorProperties extends EventProperties {
  error_message?: string
  error_code?: string
  error_stack?: string
  context?: string
}

export interface PerformanceProperties extends EventProperties {
  duration_ms?: number
  load_time_ms?: number
  lcp_ms?: number
  fid_ms?: number
  cls?: number
}
