import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

/**
 * Enhanced health check endpoint
 * Used by components to verify API availability and diagnose issues
 */
export async function GET() {
  // Basic health information
  const healthInfo = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    diagnostics: {
      auth: {
        configPresent: {
          clientId: !!process.env.AZURE_AD_CLIENT_ID,
          clientSecret: !!process.env.AZURE_AD_CLIENT_SECRET,
          tenantId: !!process.env.AZURE_AD_TENANT_ID,
          nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
          nextAuthUrl: !!process.env.NEXTAUTH_URL,
        },
        configWarnings: {
          missingNextAuthUrlInProduction: process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL,
        },
        sessionAvailable: false,
        sessionCheckError: null
      },
      server: {
        memory: process.memoryUsage ? {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        } : 'Not available',
        uptime: Math.round(process.uptime()) + ' seconds',
        nodeVersion: process.version,
      }
    }
  };

  // Try to check auth session without throwing errors
  try {
    console.log('[Health Check] Checking auth session availability...');
    const session = await getAuthSession();

    // Check if session is an error object (returned by getAuthSession when there's an issue)
    if (session && 'error' in session) {
      console.warn('[Health Check] Auth session returned error object:', session.error);
      healthInfo.diagnostics.auth.sessionAvailable = false;
      healthInfo.diagnostics.auth.sessionCheckError = {
        error: session.error,
        description: session.errorDescription || 'No description provided',
        timestamp: session.errorTime || new Date().toISOString()
      };
    } else {
      healthInfo.diagnostics.auth.sessionAvailable = !!session;

      // Add more session details if available
      if (session) {
        healthInfo.diagnostics.auth.sessionDetails = {
          hasAccessToken: !!session.accessToken,
          hasRefreshToken: !!session.refreshToken,
          hasError: !!session.error,
          errorType: session.error || null,
          user: session.user?.email || 'unknown'
        };
      }

      console.log('[Health Check] Auth session check complete:', !!session ? 'Session available' : 'No session');
    }
  } catch (error) {
    console.error('[Health Check] Error checking auth session:', error);
    healthInfo.diagnostics.auth.sessionAvailable = false;
    healthInfo.diagnostics.auth.sessionCheckError = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    };
    // Don't fail the health check due to auth issues
  }

  return NextResponse.json(healthInfo, { status: 200 });
}

export async function HEAD() {
  // For HEAD requests, just return a 200 status with minimal headers
  return new Response(null, {
    status: 200,
    headers: {
      'x-health-check': 'ok',
      'x-timestamp': new Date().toISOString()
    }
  });
}
