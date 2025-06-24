import NextAuth from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

// Create the NextAuth handler
const nextAuthHandler = NextAuth(authOptions)

// Helper function to check environment variables and handle errors
const checkEnvAndHandleErrors = async (request: NextRequest, method: string) => {
  try {
    // Log the request details for debugging
    console.log(`[NextAuth] Processing ${method} request to ${request.nextUrl.pathname}`, {
      url: request.nextUrl.toString(),
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: new Date().toISOString()
    });

    // Check for required environment variables before calling NextAuth
    if (!process.env.NEXTAUTH_SECRET) {
      console.error(`[NextAuth] CRITICAL: Missing NEXTAUTH_SECRET environment variable (${method})`, {
        timestamp: new Date().toISOString()
      });

      return NextResponse.json(
        {
          error: 'missing_nextauth_secret',
          message: 'Authentication configuration error: Missing NEXTAUTH_SECRET',
          details: 'The NEXTAUTH_SECRET environment variable is required for session encryption',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Check for Azure AD environment variables
    if (!process.env.AZURE_AD_CLIENT_ID || !process.env.AZURE_AD_CLIENT_SECRET || !process.env.AZURE_AD_TENANT_ID) {
      console.error(`[NextAuth] CRITICAL: Missing Azure AD environment variables (${method})`, {
        clientIdExists: !!process.env.AZURE_AD_CLIENT_ID,
        clientSecretExists: !!process.env.AZURE_AD_CLIENT_SECRET,
        tenantIdExists: !!process.env.AZURE_AD_TENANT_ID,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json(
        {
          error: 'missing_azure_ad_config',
          message: 'Authentication configuration error: Missing Azure AD configuration',
          details: 'One or more required Azure AD environment variables are missing',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Check for NEXTAUTH_URL environment variable
    if (!process.env.NEXTAUTH_URL) {
      console.error(`[NextAuth] CRITICAL: Missing NEXTAUTH_URL environment variable (${method})`, {
        timestamp: new Date().toISOString()
      });

      return NextResponse.json(
        {
          error: 'missing_nextauth_url',
          message: 'Authentication configuration error: Missing NEXTAUTH_URL',
          details: 'The NEXTAUTH_URL environment variable is required for proper callback handling',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Log that we're about to call the NextAuth handler
    console.log(`[NextAuth] Calling NextAuth handler for ${method} request to ${request.nextUrl.pathname}`, {
      timestamp: new Date().toISOString()
    });

    // Special handling for signout endpoint
    if (method === 'POST' && request.nextUrl.pathname.includes('/signout')) {
      console.log(`[NextAuth] Special handling for signout endpoint`, {
        url: request.nextUrl.toString(),
        timestamp: new Date().toISOString()
      });

      try {
        // Call the NextAuth handler
        const response = await nextAuthHandler(request);
        
        // Check if the response is ok
        if (response.ok) {
          return response;
        }
        
        // If not ok, create a redirect response
        const url = new URL('/', request.nextUrl.origin);
        return NextResponse.redirect(url);
      } catch (signoutError) {
        console.error(`[NextAuth] Error in signout handler:`, {
          error: signoutError instanceof Error ? signoutError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });

        // For signout errors, redirect to home page
        const url = new URL('/', request.nextUrl.origin);
        return NextResponse.redirect(url);
      }
    }

    // Call the NextAuth handler for other endpoints
    try {
      return await nextAuthHandler(request);
    } catch (nextAuthError) {
      console.error(`[NextAuth] Error in NextAuth handler for ${method} request:`, {
        error: nextAuthError instanceof Error ? nextAuthError.message : 'Unknown error',
        stack: nextAuthError instanceof Error ? nextAuthError.stack : 'No stack trace',
        timestamp: new Date().toISOString()
      });

      // Check if this is a CSRF error
      const errorMessage = nextAuthError instanceof Error ? nextAuthError.message : 'Unknown error';
      if (errorMessage.toLowerCase().includes('csrf') || request.nextUrl.pathname.includes('/csrf')) {
        console.error(`[NextAuth] CSRF token error detected:`, {
          error: errorMessage,
          timestamp: new Date().toISOString()
        });

        return NextResponse.json(
          {
            error: 'csrf_error',
            message: 'CSRF token validation failed',
            details: errorMessage,
            timestamp: new Date().toISOString()
          },
          { status: 403 }
        );
      }

      // Re-throw the error to be caught by the outer try-catch
      throw nextAuthError;
    }
  } catch (error) {
    console.error(`[NextAuth] Error in ${method} handler:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    });

    // Determine appropriate status code based on error type
    let statusCode = 500; // Default to 500 for server errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('unauthenticated')) {
      statusCode = 401;
    } else if (errorMessage.toLowerCase().includes('forbidden') || errorMessage.toLowerCase().includes('csrf')) {
      statusCode = 403;
    }

    // Return a more graceful error response
    return NextResponse.json(
      {
        error: 'auth_error',
        message: 'An error occurred during authentication',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
};

// Custom handler for GET requests that adds error handling
export async function GET(request: NextRequest) {
  return checkEnvAndHandleErrors(request, 'GET');
}

// Custom handler for POST requests that adds error handling
export async function POST(request: NextRequest) {
  return checkEnvAndHandleErrors(request, 'POST');
}

// Add handlers for other HTTP methods to ensure all NextAuth endpoints work correctly
export async function PUT(request: NextRequest) {
  return checkEnvAndHandleErrors(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
  return checkEnvAndHandleErrors(request, 'DELETE');
}

export async function PATCH(request: NextRequest) {
  return checkEnvAndHandleErrors(request, 'PATCH');
}

export async function HEAD(request: NextRequest) {
  return checkEnvAndHandleErrors(request, 'HEAD');
}

export async function OPTIONS(request: NextRequest) {
  return checkEnvAndHandleErrors(request, 'OPTIONS');
}
