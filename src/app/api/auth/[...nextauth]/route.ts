import NextAuth from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

// Create the NextAuth handler
const nextAuthHandler = NextAuth(authOptions)

// Custom handler for GET requests that adds error handling
export async function GET(request: NextRequest) {
  try {
    // Check for required environment variables before calling NextAuth
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('[NextAuth] CRITICAL: Missing NEXTAUTH_SECRET environment variable', {
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
      console.error('[NextAuth] CRITICAL: Missing Azure AD environment variables', {
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
    return await nextAuthHandler(request)
  } catch (error) {
    console.error('[NextAuth] Error in GET handler:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    })

    // Return a more graceful error response
    return NextResponse.json(
      {
        error: 'auth_error',
        message: 'An error occurred during authentication',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 401 }
    )
  }
}

// Custom handler for POST requests that adds error handling
export async function POST(request: NextRequest) {
  try {
    // Check for required environment variables before calling NextAuth
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('[NextAuth] CRITICAL: Missing NEXTAUTH_SECRET environment variable', {
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
      console.error('[NextAuth] CRITICAL: Missing Azure AD environment variables', {
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
    return await nextAuthHandler(request)
  } catch (error) {
    console.error('[NextAuth] Error in POST handler:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    })

    // Return a more graceful error response
    return NextResponse.json(
      {
        error: 'auth_error',
        message: 'An error occurred during authentication',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 401 }
    )
  }
}
