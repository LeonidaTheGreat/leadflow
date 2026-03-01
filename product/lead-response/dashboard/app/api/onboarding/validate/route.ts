import { NextRequest, NextResponse } from 'next/server';
import { onboardingValidator } from '@/lib/onboarding-validation';
import { OnboardingFormData, OnboardingStep } from '@/lib/types/onboarding';

/**
 * POST /api/onboarding/validate
 * Validate a specific onboarding step or full form
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      step, 
      data, 
      validateAll = false 
    }: {
      step?: OnboardingStep;
      data: Partial<OnboardingFormData>;
      validateAll?: boolean;
    } = body;

    // If validateAll is true, validate the entire form
    if (validateAll) {
      const isValid = onboardingValidator.validateFullSubmission(data as OnboardingFormData);
      
      return NextResponse.json({
        success: isValid,
        valid: isValid,
        errors: onboardingValidator.getErrors(),
        errorsByField: onboardingValidator.getErrorsByField(),
        message: isValid ? 'All fields are valid' : 'Validation failed',
      });
    }

    // Validate specific step
    if (!step) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Step is required when validateAll is false' 
        },
        { status: 400 }
      );
    }

    const isValid = onboardingValidator.validateStep(step, data);

    return NextResponse.json({
      success: isValid,
      valid: isValid,
      step,
      errors: onboardingValidator.getErrors(),
      errorsByField: onboardingValidator.getErrorsByField(),
      message: isValid ? `${step} is valid` : `Validation failed for ${step}`,
    });

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        valid: false 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding/validate
 * Get validation rules and requirements
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      steps: [
        { id: 'welcome', name: 'Account Setup', required: true },
        { id: 'agent-info', name: 'Agent Information', required: true },
        { id: 'calendar', name: 'Calendar Integration', required: false },
        { id: 'sms', name: 'SMS Configuration', required: false },
        { id: 'confirmation', name: 'Confirmation', required: true },
      ],
      rules: {
        email: {
          required: true,
          format: 'email',
          description: 'Valid email address'
        },
        password: {
          required: true,
          minLength: 8,
          description: 'At least 8 characters'
        },
        firstName: {
          required: true,
          minLength: 1,
          description: 'First name is required'
        },
        lastName: {
          required: true,
          minLength: 1,
          description: 'Last name is required'
        },
        phoneNumber: {
          required: true,
          format: '10-digit',
          description: '10-digit US phone number'
        },
        state: {
          required: true,
          options: 'US_STATES',
          description: 'US state selection'
        },
        calcomLink: {
          required: false,
          format: 'url',
          pattern: 'https://cal.com/username',
          description: 'Cal.com scheduling link'
        },
        smsPhoneNumber: {
          required: false,
          format: '10-digit',
          description: 'Optional SMS phone number'
        }
      }
    }
  });
}