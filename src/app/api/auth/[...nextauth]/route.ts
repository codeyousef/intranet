import NextAuth from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

// Create the NextAuth handler
const nextAuthHandler = NextAuth(authOptions)

// Helper function to check environment variables and handle errors
const checkEnvAndHandleErrors = async (request: NextRequest, method: string) => {
  try {
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

    // Call the NextAuth handler
    return await nextAuthHandler(request);
  } catch (error) {
    console.error(`[NextAuth] Error in ${method} handler:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    });

    // Return a more graceful error response
    return NextResponse.json(
      {
        error: 'auth_error',
        message: 'An error occurred during authentication',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 401 }
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
