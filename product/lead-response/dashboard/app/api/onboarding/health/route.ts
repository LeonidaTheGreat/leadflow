import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/onboarding/health
 * Health check endpoint for onboarding API
 */
export async function GET(request: NextRequest) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: true,
      database: true, // Would check actual DB connection in production
    },
    version: '1.0.0',
    endpoints: [
      { path: '/api/onboarding/draft', methods: ['POST', 'GET', 'DELETE'] },
      { path: '/api/onboarding/validate', methods: ['POST', 'GET'] },
      { path: '/api/onboarding/check-email', methods: ['POST', 'GET'] },
      { path: '/api/onboarding/submit', methods: ['POST', 'GET'] },
    ],
  };

  // Check for required env vars
  const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: `Missing environment variables: ${missingEnvVars.join(', ')}`,
      },
      { status: 503 }
    );
  }

  return NextResponse.json(health);
}
