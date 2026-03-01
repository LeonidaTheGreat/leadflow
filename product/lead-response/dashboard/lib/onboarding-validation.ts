/**
 * Server-side validation for Onboarding API
 * Mirrors client-side validation for consistency
 */

import { OnboardingFormData, OnboardingValidationError, US_STATES } from '@/lib/types/onboarding';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const URL_REGEX = /^https?:\/\/.+/;

export class OnboardingValidator {
  private errors: OnboardingValidationError[] = [];

  validateEmail(email: string): boolean {
    if (!email || email.trim() === '') {
      this.errors.push({
        field: 'email',
        message: 'Email is required',
        code: 'EMAIL_REQUIRED'
      });
      return false;
    }

    if (!EMAIL_REGEX.test(email)) {
      this.errors.push({
        field: 'email',
        message: 'Please enter a valid email address',
        code: 'EMAIL_INVALID'
      });
      return false;
    }

    return true;
  }

  validatePassword(password: string, confirmPassword?: string): boolean {
    if (!password || password.length < 8) {
      this.errors.push({
        field: 'password',
        message: 'Password must be at least 8 characters',
        code: 'PASSWORD_TOO_SHORT'
      });
      return false;
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      this.errors.push({
        field: 'confirmPassword',
        message: 'Passwords do not match',
        code: 'PASSWORD_MISMATCH'
      });
      return false;
    }

    return true;
  }

  validateName(firstName: string, lastName: string): boolean {
    let valid = true;

    if (!firstName || firstName.trim().length < 1) {
      this.errors.push({
        field: 'firstName',
        message: 'First name is required',
        code: 'FIRST_NAME_REQUIRED'
      });
      valid = false;
    }

    if (!lastName || lastName.trim().length < 1) {
      this.errors.push({
        field: 'lastName',
        message: 'Last name is required',
        code: 'LAST_NAME_REQUIRED'
      });
      valid = false;
    }

    return valid;
  }

  validatePhoneNumber(phone: string, field: string = 'phoneNumber'): boolean {
    if (!phone) {
      this.errors.push({
        field,
        message: 'Phone number is required',
        code: 'PHONE_REQUIRED'
      });
      return false;
    }

    const cleaned = phone.replace(/\D/g, '');
    if (!PHONE_REGEX.test(cleaned)) {
      this.errors.push({
        field,
        message: 'Please enter a valid 10-digit phone number',
        code: 'PHONE_INVALID'
      });
      return false;
    }

    return true;
  }

  validateState(state: string): boolean {
    if (!state) {
      this.errors.push({
        field: 'state',
        message: 'State is required',
        code: 'STATE_REQUIRED'
      });
      return false;
    }

    if (!US_STATES.includes(state as any)) {
      this.errors.push({
        field: 'state',
        message: 'Please select a valid US state',
        code: 'STATE_INVALID'
      });
      return false;
    }

    return true;
  }

  validateCalendarUrl(url: string, required: boolean = false): boolean {
    if (!required && !url) return true;

    if (required && !url) {
      this.errors.push({
        field: 'calendarUrl',
        message: 'Calendar URL is required',
        code: 'CALENDAR_URL_REQUIRED'
      });
      return false;
    }

    if (url && !URL_REGEX.test(url)) {
      this.errors.push({
        field: 'calendarUrl',
        message: 'Please enter a valid URL',
        code: 'CALENDAR_URL_INVALID'
      });
      return false;
    }

    return true;
  }

  validateCalcomLink(link: string): boolean {
    if (!link) return true; // Optional

    // Cal.com links should be in format: https://cal.com/username or https://cal.com/username/event-type
    const calcomRegex = /^https:\/\/cal\.com\/[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)?$/;
    
    if (!calcomRegex.test(link)) {
      this.errors.push({
        field: 'calcomLink',
        message: 'Please enter a valid Cal.com link (e.g., https://cal.com/username)',
        code: 'CALCOM_LINK_INVALID'
      });
      return false;
    }

    return true;
  }

  validateStep(step: string, data: Partial<OnboardingFormData>): boolean {
    this.errors = []; // Reset errors

    switch (step) {
      case 'welcome':
        this.validateEmail(data.email || '');
        this.validatePassword(data.password || '', data.confirmPassword);
        break;

      case 'agent-info':
        this.validateName(data.firstName || '', data.lastName || '');
        this.validatePhoneNumber(data.phoneNumber || '');
        this.validateState(data.state || '');
        break;

      case 'calendar':
        this.validateCalcomLink(data.calcomLink || '');
        break;

      case 'sms':
        if (data.smsPhoneNumber) {
          this.validatePhoneNumber(data.smsPhoneNumber, 'smsPhoneNumber');
        }
        break;

      case 'confirmation':
        // Validate all required fields for final submission
        this.validateEmail(data.email || '');
        this.validatePassword(data.password || '');
        this.validateName(data.firstName || '', data.lastName || '');
        this.validatePhoneNumber(data.phoneNumber || '');
        this.validateState(data.state || '');
        break;

      default:
        this.errors.push({
          field: 'step',
          message: `Invalid step: ${step}`,
          code: 'INVALID_STEP'
        });
        return false;
    }

    return this.errors.length === 0;
  }

  validateFullSubmission(data: OnboardingFormData): boolean {
    this.errors = [];

    this.validateEmail(data.email);
    this.validatePassword(data.password);
    this.validateName(data.firstName, data.lastName);
    this.validatePhoneNumber(data.phoneNumber);
    this.validateState(data.state);
    
    // Optional fields validation
    this.validateCalcomLink(data.calcomLink || '');
    if (data.smsPhoneNumber) {
      this.validatePhoneNumber(data.smsPhoneNumber, 'smsPhoneNumber');
    }

    return this.errors.length === 0;
  }

  getErrors(): OnboardingValidationError[] {
    return this.errors;
  }

  getErrorsByField(): Record<string, string> {
    const errorsByField: Record<string, string> = {};
    this.errors.forEach(error => {
      errorsByField[error.field] = error.message;
    });
    return errorsByField;
  }
}

// Singleton instance for reuse
export const onboardingValidator = new OnboardingValidator();
