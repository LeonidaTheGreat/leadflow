/**
 * Client-side API client for Onboarding
 * Handles API calls with retries, error handling, and type safety
 */

import {
  OnboardingFormData,
  OnboardingStep,
  OnboardingApiResponse,
  EmailCheckResult,
  OnboardingResult,
  OnboardingDraft,
} from '@/lib/types/onboarding';

// API Configuration
const API_BASE = '/api/onboarding';
const DEFAULT_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 5000;

// Custom error class for onboarding API errors
export class OnboardingApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors?: Array<{ field: string; message: string; code: string }>,
    public code?: string
  ) {
    super(message);
    this.name = 'OnboardingApiError';
  }
}

// Retry configuration
interface RetryConfig {
  retries?: number;
  retryDelay?: number;
  retryCondition?: (error: any) => boolean;
}

// Default retry condition - retry on network errors or 5xx status
const defaultRetryCondition = (error: any): boolean => {
  if (!error.statusCode) return true; // Network error
  return error.statusCode >= 500 && error.statusCode < 600;
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Exponential backoff calculation
 */
const getRetryDelay = (attempt: number, baseDelay: number): number => {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), MAX_RETRY_DELAY_MS);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
};

/**
 * Generic fetch with retry logic
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retryConfig: RetryConfig = {}
): Promise<T> {
  const {
    retries = DEFAULT_RETRIES,
    retryDelay = RETRY_DELAY_MS,
    retryCondition = defaultRetryCondition,
  } = retryConfig;

  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data: OnboardingApiResponse<T> = await response.json();

      if (!response.ok || !data.success) {
        const error = new OnboardingApiError(
          data.error || `Request failed with status ${response.status}`,
          response.status,
          data.errors,
          // @ts-ignore - check for code in error
          data.code
        );
        throw error;
      }

      return data.data as T;
    } catch (error) {
      lastError = error;

      // Don't retry on validation errors (4xx except 429 rate limit)
      if (error instanceof OnboardingApiError) {
        if (error.statusCode === 429) {
          // Rate limited - retry with longer delay
        } else if (error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
      }

      // Check if we should retry
      if (attempt < retries && retryCondition(error)) {
        const delay = getRetryDelay(attempt, retryDelay);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Onboarding API Client
 */
export const onboardingApi = {
  /**
   * Check if email is available
   */
  async checkEmail(email: string, checkDraft = true): Promise<EmailCheckResult> {
    return fetchWithRetry<EmailCheckResult>(
      `${API_BASE}/check-email`,
      {
        method: 'POST',
        body: JSON.stringify({ email, checkDraft }),
      },
      { retries: 2 } // Fewer retries for email check
    );
  },

  /**
   * Validate a specific step or the entire form
   */
  async validate(
    data: Partial<OnboardingFormData>,
    step?: OnboardingStep,
    validateAll = false
  ): Promise<{ valid: boolean; errors: Array<{ field: string; message: string; code: string }> }> {
    const response = await fetch(`${API_BASE}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, step, validateAll }),
    });

    const result: OnboardingApiResponse<{
      valid: boolean;
      errors: Array<{ field: string; message: string; code: string }>;
    }> = await response.json();

    return {
      valid: result.data?.valid ?? false,
      errors: result.data?.errors ?? result.errors ?? [],
    };
  },

  /**
   * Save onboarding draft/progress
   */
  async saveDraft(params: {
    draftId?: string;
    email: string;
    formData: Partial<OnboardingFormData>;
    currentStep: OnboardingStep;
    completedSteps: OnboardingStep[];
  }): Promise<{ draftId: string; expiresAt: string }> {
    return fetchWithRetry<{ draftId: string; expiresAt: string }>(
      `${API_BASE}/draft`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      { retries: 3 } // More retries for draft saves
    );
  },

  /**
   * Get existing draft by email or draftId
   */
  async getDraft(emailOrDraftId: string, type: 'email' | 'draftId' = 'email'): Promise<OnboardingDraft | null> {
    const param = type === 'email' ? `email=${encodeURIComponent(emailOrDraftId)}` : `draftId=${encodeURIComponent(emailOrDraftId)}`;
    
    return fetchWithRetry<OnboardingDraft | null>(
      `${API_BASE}/draft?${param}`,
      { method: 'GET' },
      { retries: 2 }
    );
  },

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/draft?draftId=${encodeURIComponent(draftId)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new OnboardingApiError(
        data.error || 'Failed to delete draft',
        response.status
      );
    }
  },

  /**
   * Submit final onboarding
   */
  async submit(params: {
    data: OnboardingFormData;
    draftId?: string;
    tracking?: {
      completionTimeMs?: number;
      referrer?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    };
  }): Promise<OnboardingResult> {
    return fetchWithRetry<OnboardingResult>(
      `${API_BASE}/submit`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      { retries: 2 }
    );
  },

  /**
   * Get validation requirements
   */
  async getValidationRequirements(): Promise<{
    steps: Array<{ id: string; name: string; required: boolean }>;
    rules: Record<string, any>;
  }> {
    const response = await fetch(`${API_BASE}/validate`, {
      method: 'GET',
    });

    const result = await response.json();
    return result.data;
  },
};

/**
 * Auto-save hook helper
 * Returns a function that saves draft with debouncing
 */
export function createAutoSave(
  saveFn: (data: Parameters<typeof onboardingApi.saveDraft>[0]) => Promise<any>,
  delayMs: number = 2000
) {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastSavePromise: Promise<any> | null = null;

  return (params: Parameters<typeof onboardingApi.saveDraft>[0]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          // Wait for previous save to complete
          if (lastSavePromise) {
            await lastSavePromise.catch(() => {});
          }
          
          lastSavePromise = saveFn(params);
          const result = await lastSavePromise;
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delayMs);
    });
  };
}

/**
 * Resume onboarding from draft
 * Loads draft data and returns current step
 */
export async function resumeOnboarding(
  emailOrDraftId: string,
  type: 'email' | 'draftId' = 'email'
): Promise<{
  canResume: boolean;
  draft?: OnboardingDraft;
  message?: string;
}> {
  try {
    const draft = await onboardingApi.getDraft(emailOrDraftId, type);

    if (!draft) {
      return { canResume: false, message: 'No draft found' };
    }

    // Check if draft is expired
    if (new Date(draft.expires_at) < new Date()) {
      return { canResume: false, message: 'Draft has expired' };
    }

    return {
      canResume: true,
      draft,
      message: `Resume from ${draft.current_step}`,
    };
  } catch (error) {
    console.error('Resume onboarding error:', error);
    return { canResume: false, message: 'Failed to load draft' };
  }
}

export default onboardingApi;
