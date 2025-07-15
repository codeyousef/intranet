import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Try to access authOptions to see if it's configured correctly
    const hasProviders = authOptions.providers && authOptions.providers.length > 0
    const provider = hasProviders ? authOptions.providers[0] : null
    
    return NextResponse.json({
      success: true,
      hasProviders,
      providerType: provider ? provider.type : 'none',
      providerId: provider ? provider.id : 'none',
      hasSecret: !!authOptions.secret,
      secretLength: authOptions.secret ? authOptions.secret.length : 0
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}