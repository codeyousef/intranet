import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import axios from 'axios'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Debug: Analyzing token and permissions...')

    // Decode the JWT token to see what scopes we have
    const token = session.accessToken
    if (!token) {
      return NextResponse.json({ error: 'No access token' })
    }

    // Basic token info
    const tokenParts = token.split('.')
    let decodedToken = null
    
    try {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      decodedToken = {
        aud: payload.aud, // audience
        scp: payload.scp, // scopes
        roles: payload.roles, // roles
        iss: payload.iss, // issuer
        exp: payload.exp, // expiration
        appid: payload.appid, // app id
        tid: payload.tid // tenant id
      }
    } catch (e) {
      console.error('Failed to decode token:', e)
    }

    // Test basic Microsoft Graph access
    let graphTest = null
    try {
      const graphResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      graphTest = { success: true, user: graphResponse.data.displayName }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        graphTest = { 
          success: false, 
          error: error.response?.data || error.message,
          status: error.response?.status
        }
      }
    }

    // Test Power BI service availability
    let powerBITest = null
    try {
      const powerBIResponse = await axios.get('https://api.powerbi.com/v1.0/myorg/availableFeatures', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      powerBITest = { success: true, features: powerBIResponse.data }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        powerBITest = { 
          success: false, 
          error: error.response?.data || error.message,
          status: error.response?.status
        }
      }
    }

    // Check environment variables
    const envCheck = {
      hasClientId: !!process.env.POWERBI_CLIENT_ID,
      hasClientSecret: !!process.env.POWERBI_CLIENT_SECRET,
      hasTenantId: !!process.env.POWERBI_TENANT_ID,
      clientIdMatches: process.env.POWERBI_CLIENT_ID === process.env.AZURE_AD_CLIENT_ID
    }

    return NextResponse.json({
      tokenInfo: decodedToken,
      graphAccess: graphTest,
      powerBIAccess: powerBITest,
      environment: envCheck,
      tokenLength: token.length,
      sessionInfo: {
        hasToken: !!session.accessToken,
        hasRefreshToken: !!session.refreshToken,
        expires: session.expires
      }
    })

  } catch (error) {
    console.error('Token debug error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Token debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}