import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Simple in-memory rate limiting (per-IP)
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5; // Max 5 requests per IP per window
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validate request body
interface PilotSignupRequest {
  name: string;
  email: string;
  phone?: string;
  brokerage_name?: string;
  team_name?: string;
  monthly_leads?: string;
  current_crm?: string;
  source?: string;
  utm_campaign?: string;
}

function validateBody(body: Record<string, unknown>): { valid: boolean; error?: string } {
  // Check required fields
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
    return { valid: false, error: 'Name is required and must be at least 2 characters' };
  }

  if (!body.email || typeof body.email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  if (!EMAIL_REGEX.test(body.email)) {
    return { valid: false, error: 'Please provide a valid email address' };
  }

  // Validate optional fields
  if (body.monthly_leads && !['1-10', '11-50', '51-100', '100+'].includes(body.monthly_leads as string)) {
    return { valid: false, error: 'Invalid monthly leads value' };
  }

  if (body.current_crm && !['follow_up_boss', 'liondesk', 'kvcore', 'other', 'none'].includes(body.current_crm as string)) {
    return { valid: false, error: 'Invalid CRM value' };
  }

  return { valid: true };
}

function getRateLimitStatus(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry) {
    // First request from this IP
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (now > entry.resetTime) {
    // Window has reset
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    // Rate limit exceeded
    return { allowed: false, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }

  // Increment count
  entry.count++;
  return { allowed: true };
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const rateLimitStatus = getRateLimitStatus(ip);
  if (!rateLimitStatus.allowed) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: rateLimitStatus.retryAfter 
      },
      { 
        status: 429, 
        headers: {
          ...corsHeaders,
          'Retry-After': String(rateLimitStatus.retryAfter) 
        } 
      }
    );
  }

  try {
    // Parse request body
    const body = await request.json() as Record<string, unknown>;

    // Validate input
    const validation = validateBody(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare data for insertion
    const signupData: PilotSignupRequest = {
      name: body.name as string,
      email: (body.email as string).toLowerCase().trim(),
      phone: body.phone as string | undefined,
      brokerage_name: body.brokerage_name as string | undefined,
      team_name: body.team_name as string | undefined,
      monthly_leads: body.monthly_leads as string | undefined,
      current_crm: body.current_crm as string | undefined,
      source: (body.source as string) || 'landing_page',
      utm_campaign: body.utm_campaign as string | undefined,
    };

    // Insert into database
    const { data, error } = await supabase
      .from('pilot_signups')
      .insert(signupData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      
      // Handle duplicate email
      if (error.code === '23505') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'This email has already been registered for the pilot program.' 
          },
          { status: 409, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Failed to save signup. Please try again.' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Success response
    return NextResponse.json(
      { 
        success: true, 
        message: 'Thank you for signing up! We\'ll be in touch within 24 hours.',
        data: { id: data.id }
      },
      { status: 201, headers: corsHeaders }
    );

  } catch (err) {
    console.error('API error:', err);
    
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { 
        status: 500, 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        } 
      }
    );
  }
}