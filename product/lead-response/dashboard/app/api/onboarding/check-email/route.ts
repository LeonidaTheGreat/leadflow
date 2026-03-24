import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import { OnboardingValidator } from '@/lib/onboarding-validation';

/**
 * POST /api/onboarding/check-email
 * Check if email is available for registration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, checkDraft = true } = body;

    // Validate email format
    const validator = new OnboardingValidator();
    const isValidFormat = validator.validateEmail(email);

    if (!isValidFormat) {
      return NextResponse.json({
        success: true, // API call succeeded
        available: false,
        email: email?.toLowerCase()?.trim(),
        valid: false,
        error: validator.getErrors()[0]?.message || 'Invalid email format',
        errors: validator.getErrors(),
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email exists in agents table
    const { data: existingAgent, error: agentError } = await supabase
      .from('real_estate_agents')
      .select('id, email, status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (agentError && agentError.code !== 'PGRST116') {
      console.error('Agent check error:', agentError);
      return NextResponse.json(
        { success: false, error: 'Failed to check email availability' },
        { status: 500 }
      );
    }

    if (existingAgent) {
      return NextResponse.json({
        success: true,
        available: false,
        email: normalizedEmail,
        valid: true,
        exists: true,
        agentStatus: existingAgent.status,
        message: 'Email is already registered',
        suggestion: generateEmailSuggestion(normalizedEmail),
      });
    }

    // Check if there's an incomplete draft with this email
    let hasDraft = false;
    if (checkDraft) {
      const { data: existingDraft, error: draftError } = await supabase
        .from('onboarding_drafts')
        .select('id, current_step, completed_steps, last_updated_at')
        .eq('email', normalizedEmail)
        .eq('is_completed', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (!draftError && existingDraft) {
        hasDraft = true;
        return NextResponse.json({
          success: true,
          available: true,
          email: normalizedEmail,
          valid: true,
          hasDraft: true,
          draft: {
            draftId: existingDraft.id,
            currentStep: existingDraft.current_step,
            completedSteps: existingDraft.completed_steps,
            lastUpdatedAt: existingDraft.last_updated_at,
          },
          message: 'Email is available but has an existing draft',
        });
      }
    }

    return NextResponse.json({
      success: true,
      available: true,
      email: normalizedEmail,
      valid: true,
      hasDraft: false,
      message: 'Email is available',
    });

  } catch (error) {
    console.error('Email check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding/check-email?email=...
 * Alternative GET method for email checking
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Forward to POST logic
    const mockRequest = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 'Content-Type': 'application/json' },
    });

    // @ts-ignore - creating a mock NextRequest
    return POST(new NextRequest(mockRequest));

  } catch (error) {
    console.error('Email check GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate email suggestions if email is taken
 */
function generateEmailSuggestion(email: string): string | undefined {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return undefined;

  const suggestions = [
    `${localPart}1@${domain}`,
    `${localPart}2@${domain}`,
    `${localPart}.agent@${domain}`,
    `${localPart}.realty@${domain}`,
  ];

  return suggestions[Math.floor(Math.random() * suggestions.length)];
}