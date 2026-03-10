import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import * as crypto from 'crypto';
import { onboardingValidator } from '@/lib/onboarding-validation';
import { OnboardingFormData, OnboardingSubmission } from '@/lib/types/onboarding';

// Password hashing (for demo - in production use bcrypt or argon2)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
}

/**
 * POST /api/onboarding/submit
 * Final onboarding submission
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      data, 
      draftId,
      tracking = {} 
    }: {
      data: OnboardingFormData;
      draftId?: string;
      tracking?: {
        completionTimeMs?: number;
        referrer?: string;
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
      };
    } = body;

    // Validate all required fields
    const isValid = onboardingValidator.validateFullSubmission(data);
    
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: onboardingValidator.getErrors(),
          errorsByField: onboardingValidator.getErrorsByField(),
        },
        { status: 400 }
      );
    }

    // Double-check email availability (in case it was taken since last check)
    const { data: existingAgent } = await supabase
      .from('real_estate_agents')
      .select('id')
      .eq('email', data.email.toLowerCase().trim())
      .single();

    if (existingAgent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email is already registered',
          code: 'EMAIL_EXISTS',
        },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = hashPassword(data.password);

    // Calculate pilot expiry (60 days from now)
    const now = new Date();
    const pilotExpiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Create agent account — free pilot, no credit card required
    const { data: agent, error: agentError } = await supabase
      .from('real_estate_agents')
      .insert({
        email: data.email.toLowerCase().trim(),
        password_hash: hashedPassword,
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        phone: data.phoneNumber.replace(/\D/g, ''),
        state: data.state,
        timezone: data.timezone || 'America/New_York',
        status: 'active',
        is_active: true,
        plan_tier: 'pilot',
        pilot_started_at: now.toISOString(),
        pilot_expires_at: pilotExpiresAt.toISOString(),
        market: 'us-national', // Default market
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        onboarding_completed_at: now.toISOString(),
        onboarding_metadata: {
          completion_time_ms: tracking.completionTimeMs,
          referrer: tracking.referrer,
          utm_source: tracking.utmSource,
          utm_medium: tracking.utmMedium,
          utm_campaign: tracking.utmCampaign,
        },
      })
      .select()
      .single();

    if (agentError) {
      console.error('Agent creation error:', agentError);
      return NextResponse.json(
        { success: false, error: 'Failed to create agent account' },
        { status: 500 }
      );
    }

    // Create integrations record if provided
    if (data.calcomLink || data.smsPhoneNumber) {
      const { error: intError } = await supabase
        .from('agent_integrations')
        .insert({
          agent_id: agent.id,
          cal_com_link: data.calcomLink || null,
          calcom_username: extractCalcomUsername(data.calcomLink),
          twilio_phone_number: data.smsPhoneNumber || null,
          created_at: new Date().toISOString(),
        });

      if (intError) {
        console.error('Integration creation error:', intError);
        // Don't fail the whole request if integrations fail
      }
    }

    // Create default settings
    const { error: settingsError } = await supabase
      .from('agent_settings')
      .insert({
        agent_id: agent.id,
        auto_response_enabled: true,
        sms_enabled: !!data.smsPhoneNumber,
        email_notifications: true,
        booking_enabled: !!data.calcomLink,
        created_at: new Date().toISOString(),
      });

    if (settingsError) {
      console.error('Settings creation error:', settingsError);
      // Don't fail the whole request if settings fail
    }

    // Mark draft as completed if draftId provided
    if (draftId) {
      await supabase
        .from('onboarding_drafts')
        .update({
          is_completed: true,
          agent_id: agent.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', draftId);
    } else {
      // Try to find and mark any draft for this email
      await supabase
        .from('onboarding_drafts')
        .update({
          is_completed: true,
          agent_id: agent.id,
          completed_at: new Date().toISOString(),
        })
        .eq('email', data.email.toLowerCase().trim())
        .eq('is_completed', false);
    }

    // Log onboarding completion event
    await supabase.from('events').insert({
      agent_id: agent.id,
      event_type: 'onboarding_completed',
      event_data: {
        completion_time_ms: tracking.completionTimeMs,
        steps_completed: data.completedSteps,
        has_calendar: !!data.calcomLink,
        has_sms: !!data.smsPhoneNumber,
      },
      source: 'onboarding_api',
      created_at: new Date().toISOString(),
    });

    // Return success (exclude password_hash)
    const { password_hash, ...agentSafe } = agent;

    return NextResponse.json(
      {
        success: true,
        data: {
          agentId: agent.id,
          email: agent.email,
          firstName: agent.first_name,
          lastName: agent.last_name,
          message: 'Onboarding completed successfully',
          redirectUrl: '/dashboard',
        },
        message: 'Welcome to LeadFlow AI!',
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Onboarding submission error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Extract Cal.com username from link
 */
function extractCalcomUsername(link?: string): string | null {
  if (!link) return null;
  const match = link.match(/cal\.com\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * GET /api/onboarding/submit
 * Get submission requirements and status
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      requiredFields: [
        'email',
        'password',
        'firstName',
        'lastName',
        'phoneNumber',
        'state',
      ],
      optionalFields: [
        'timezone',
        'calendarUrl',
        'calcomLink',
        'smsPhoneNumber',
      ],
      requirements: {
        password: {
          minLength: 8,
          description: 'At least 8 characters',
        },
        phoneNumber: {
          format: '10-digit US number',
          description: 'Digits only or formatted',
        },
      },
      tracking: {
        completionTimeMs: 'Time taken to complete onboarding (optional)',
        referrer: 'Referrer URL (optional)',
        utmSource: 'UTM source (optional)',
        utmMedium: 'UTM medium (optional)',
        utmCampaign: 'UTM campaign (optional)',
      },
    },
  });
}