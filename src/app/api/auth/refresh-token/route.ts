import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
          const refreshedTokens = await response.json()
          console.log('✅ Token refreshed successfully')
          
          return NextResponse.json({
            success: true,
            message: 'Token refreshed successfully',
            newToken: refreshedTokens.access_token,
            expiresIn: refreshedTokens.expires_in
          })
        } else {
          const errorData = await response.text()
          console.error('❌ Failed to refresh token:', response.status, errorData)
          
          return NextResponse.json({
            success: false,
            error: 'Token refresh failed',
            details: errorData,
            suggestion: 'Please sign out and sign back in to get fresh permissions'
          })
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