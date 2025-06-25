import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test environment variables
    const envCheck = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      AZURE_AD_CLIENT_ID: !!process.env.AZURE_AD_CLIENT_ID,
      AZURE_AD_CLIENT_SECRET: !!process.env.AZURE_AD_CLIENT_SECRET,
      AZURE_AD_TENANT_ID: !!process.env.AZURE_AD_TENANT_ID,
      NODE_ENV: process.env.NODE_ENV,
      NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED
    }

    // Test if we can import auth options without errors
    let authOptionsStatus = 'unknown'
    let authOptionsError = null
    
    try {
      const { authOptions } = await import('@/lib/auth')
      authOptionsStatus = 'loaded'
      
      // Check basic structure
      if (authOptions) {
        authOptionsStatus = 'valid'
        if (authOptions.providers && authOptions.providers.length > 0) {
          authOptionsStatus = 'configured'
        }
      }
    } catch (error) {
      authOptionsStatus = 'error'
      authOptionsError = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json({
      success: true,
      env: envCheck,
      authOptions: {
        status: authOptionsStatus,
        error: authOptionsError
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}