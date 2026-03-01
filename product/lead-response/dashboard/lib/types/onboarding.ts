// ============================================
// AGENT ONBOARDING TYPES
// ============================================

export type OnboardingStep = 
  | 'welcome' 
  | 'agent-info' 
  | 'calendar' 
  | 'sms' 
  | 'confirmation';

export interface OnboardingFormData {
  // Step 1: Welcome (Account)
  email: string;
  password: string;
  confirmPassword?: string;
  
  // Step 2: Agent Info
  firstName: string;
  lastName: string;
  phoneNumber: string;
  state: string;
  timezone: string;
  
  // Step 3: Calendar
  calendarUrl: string;
  calcomLink: string;
  calcomUsername?: string;
  
  // Step 4: SMS
  smsPhoneNumber: string;
  twilioSid?: string;
  twilioAuthToken?: string;
  
  // Metadata
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  startedAt: string;
  lastUpdatedAt: string;
}

export interface OnboardingDraft {
  id?: string;
  agent_id?: string;
  email: string;
  form_data: Partial<OnboardingFormData>;
  current_step: OnboardingStep;
  completed_steps: OnboardingStep[];
  is_completed: boolean;
  started_at: string;
  last_updated_at: string;
  expires_at: string;
}

export interface OnboardingValidationError {
  field: string;
  message: string;
  code: string;
}

export interface OnboardingApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: OnboardingValidationError[];
  message?: string;
}

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  totalSteps: number;
  progressPercent: number;
  canProceed: boolean;
}

export interface EmailCheckResult {
  available: boolean;
  email: string;
  suggestion?: string;
}

export interface OnboardingSubmission {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  state: string;
  timezone: string;
  calendarUrl?: string;
  calcomLink?: string;
  smsPhoneNumber?: string;
}

export interface OnboardingResult {
  agentId: string;
  email: string;
  message: string;
  redirectUrl?: string;
}

// Validation schemas for each step
export const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'agent-info', 
  'calendar',
  'sms',
  'confirmation'
];

export const STEP_VALIDATION_FIELDS: Record<OnboardingStep, string[]> = {
  'welcome': ['email', 'password', 'confirmPassword'],
  'agent-info': ['firstName', 'lastName', 'phoneNumber', 'state'],
  'calendar': ['calcomLink'],
  'sms': ['smsPhoneNumber'],
  'confirmation': []
};

// Default values
export const DEFAULT_ONBOARDING_DATA: Partial<OnboardingFormData> = {
  timezone: 'America/New_York',
  currentStep: 'welcome',
  completedSteps: [],
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString()
};

// US States list for validation
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
] as const;

export type USState = typeof US_STATES[number];
