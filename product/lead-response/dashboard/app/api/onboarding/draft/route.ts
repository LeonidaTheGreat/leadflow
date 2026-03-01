import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { onboardingValidator } from '@/lib/onboarding-validation';
import { OnboardingFormData, OnboardingStep } from '@/lib/types/onboarding';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const DRAFT_EXPIRY_HOURS = 48; // Drafts expire after 48 hours

/**
 * POST /api/onboarding/draft
 * Save onboarding progress as draft
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      draftId, 
      email, 
      formData, 
      currentStep, 
      completedSteps 
    }: {
      draftId?: string;
      email: string;
      formData: Partial<OnboardingFormData>;
      currentStep: OnboardingStep;
      completedSteps: OnboardingStep[];
    } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + DRAFT_EXPIRY_HOURS);

    const draftData = {
      email: email.toLowerCase().trim(),
      form_data: formData,
      current_step: currentStep,
      completed_steps: completedSteps || [],
      is_completed: false,
      last_updated_at: now,
      expires_at: expiresAt.toISOString(),
    };

    let result;

    if (draftId) {
      // Update existing draft
      const { data, error } = await supabase
        .from('onboarding_drafts')
        .update(draftData)
        .eq('id', draftId)
        .select()
        .single();

      if (error) {
        console.error('Draft update error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to update draft' },
          { status: 500 }
        );
      }
      result = data;
    } else {
      // Check if draft already exists for this email
      const { data: existingDraft } = await supabase
        .from('onboarding_drafts')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .eq('is_completed', false)
        .single();

      if (existingDraft) {
        // Update existing draft
        const { data, error } = await supabase
          .from('onboarding_drafts')
          .update(draftData)
          .eq('id', existingDraft.id)
          .select()
          .single();

        if (error) {
          console.error('Draft update error:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to update draft' },
            { status: 500 }
          );
        }
        result = data;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('onboarding_drafts')
          .insert({
            ...draftData,
            started_at: now,
          })
          .select()
          .single();

        if (error) {
          console.error('Draft creation error:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to create draft' },
            { status: 500 }
          );
        }
        result = data;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        draftId: result.id,
        email: result.email,
        currentStep: result.current_step,
        completedSteps: result.completed_steps,
        expiresAt: result.expires_at,
      },
      message: 'Draft saved successfully',
    });

  } catch (error) {
    console.error('Save draft error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding/draft?email=...
 * Get existing draft by email
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const draftId = searchParams.get('draftId');

    if (!email && !draftId) {
      return NextResponse.json(
        { success: false, error: 'Email or draftId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('onboarding_drafts')
      .select('*')
      .eq('is_completed', false);

    if (email) {
      query = query.eq('email', email.toLowerCase().trim());
    } else if (draftId) {
      query = query.eq('id', draftId);
    }

    const { data: draft, error } = await query
      .order('last_updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return NextResponse.json({
          success: true,
          data: null,
          message: 'No draft found',
        });
      }
      console.error('Draft fetch error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch draft' },
        { status: 500 }
      );
    }

    // Check if draft has expired
    if (new Date(draft.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('onboarding_drafts')
        .update({ is_expired: true })
        .eq('id', draft.id);

      return NextResponse.json({
        success: true,
        data: null,
        message: 'Draft has expired',
        expired: true,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        draftId: draft.id,
        email: draft.email,
        formData: draft.form_data,
        currentStep: draft.current_step,
        completedSteps: draft.completed_steps,
        startedAt: draft.started_at,
        lastUpdatedAt: draft.last_updated_at,
        expiresAt: draft.expires_at,
      },
    });

  } catch (error) {
    console.error('Get draft error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/onboarding/draft
 * Delete a draft
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('draftId');

    if (!draftId) {
      return NextResponse.json(
        { success: false, error: 'DraftId is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('onboarding_drafts')
      .delete()
      .eq('id', draftId);

    if (error) {
      console.error('Draft delete error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete draft' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully',
    });

  } catch (error) {
    console.error('Delete draft error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}