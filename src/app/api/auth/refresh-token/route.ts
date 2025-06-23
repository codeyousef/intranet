import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()

    // Check for session errors
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized', message: 'No session found' }, { status: 401 })
    }

    // Handle error object returned by getAuthSession
    if ('error' in session) {
      console.error('[Refresh Token] Session error:', session);
      return NextResponse.json({ 
        error: 'auth_error', 
        message: 'Authentication error',
        details: session.errorDescription || 'Unknown error',
        code: session.error
      }, { status: 401 })
    }

    // Check for error in session object
    if (session.error) {
      console.warn('[Refresh Token] Session contains error:', session.error);
      // Continue anyway, as we're trying to refresh the token
    }

    console.log('🔄 Attempting to refresh SharePoint token...')

    // Try to refresh the token using the refresh token
    if (session.refreshToken) {
      try {
        const response = await fetch(`https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.AZURE_AD_CLIENT_ID!,
            client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: session.refreshToken,
            scope: 'openid profile email offline_access https://analysis.windows.net/powerbi/api/Dataset.Read.All https://analysis.windows.net/powerbi/api/Report.Read.All https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.Read.All',
          }),
        })

        if (response.ok) {
          try {
            const refreshedTokens = await response.json()
            console.log('✅ Token refreshed successfully')

            return NextResponse.json({
              success: true,
              message: 'Token refreshed successfully',
              newToken: refreshedTokens.access_token,
              expiresIn: refreshedTokens.expires_in
            })
          } catch (jsonError) {
            console.error('❌ Error parsing token response JSON:', jsonError)
            return NextResponse.json({
              success: false,
              error: 'Failed to parse token response',
              details: jsonError instanceof Error ? jsonError.message : 'Unknown JSON parsing error',
              suggestion: 'Please try again or sign out and sign back in'
            }, { status: 500 })
          }
        } else {
          try {
            const errorData = await response.text()
            console.error('❌ Failed to refresh token:', response.status, errorData)

            return NextResponse.json({
              success: false,
              error: 'Token refresh failed',
              details: errorData,
              suggestion: 'Please sign out and sign back in to get fresh permissions'
            })
          } catch (textError) {
            console.error('❌ Failed to get error details:', textError)
            return NextResponse.json({
              success: false,
              error: 'Token refresh failed',
              details: `Status: ${response.status}`,
              suggestion: 'Please sign out and sign back in to get fresh permissions'
            })
          }
        }
      } catch (error) {
        console.error('❌ Error refreshing token:', error)
        return NextResponse.json({
          success: false,
          error: 'Token refresh error',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'No refresh token available',
        suggestion: 'Please sign out and sign back in to get fresh permissions'
      })
    }

  } catch (error) {
    console.error('Refresh token endpoint error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Refresh token endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
