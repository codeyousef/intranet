import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import axios from 'axios'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = process.env.POWERBI_CLIENT_ID!
    const clientSecret = process.env.POWERBI_CLIENT_SECRET!
    const tenantId = process.env.POWERBI_TENANT_ID!

    console.log('Debug info:', {
      clientId: clientId.substring(0, 8) + '...',
      tenantId: tenantId.substring(0, 8) + '...',
      hasSecret: !!clientSecret
    })

    // Test token acquisition step by step
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    
    const data = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://analysis.windows.net/powerbi/api/.default',
    })

    console.log('Requesting token from:', tokenUrl)

    try {
      const tokenResponse = await axios.post(tokenUrl, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      console.log('✅ Token acquired successfully')
      const token = tokenResponse.data.access_token

      // Test Power BI API access
      try {
        const reportsResponse = await axios.get('https://api.powerbi.com/v1.0/myorg/reports', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        console.log('✅ Reports API accessible')
        return NextResponse.json({
          success: true,
          tokenAcquired: true,
          reportsAccessible: true,
          reportsCount: reportsResponse.data.value?.length || 0,
          reports: reportsResponse.data.value?.map((r: any) => ({
            id: r.id,
            name: r.name,
            datasetId: r.datasetId
          })) || []
        })

      } catch (apiError) {
        console.error('❌ Power BI API Error:', apiError)
        if (axios.isAxiosError(apiError)) {
          console.error('API Response:', apiError.response?.data)
          console.error('API Status:', apiError.response?.status)
        }

        return NextResponse.json({
          success: false,
          tokenAcquired: true,
          reportsAccessible: false,
          error: 'Power BI API access denied',
          details: axios.isAxiosError(apiError) ? apiError.response?.data : 'Unknown API error',
          status: axios.isAxiosError(apiError) ? apiError.response?.status : 'unknown'
        })
      }

    } catch (tokenError) {
      console.error('❌ Token Error:', tokenError)
      if (axios.isAxiosError(tokenError)) {
        console.error('Token Response:', tokenError.response?.data)
        console.error('Token Status:', tokenError.response?.status)
      }

      return NextResponse.json({
        success: false,
        tokenAcquired: false,
        error: 'Failed to acquire token',
        details: axios.isAxiosError(tokenError) ? tokenError.response?.data : 'Unknown token error'
      })
    }

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}