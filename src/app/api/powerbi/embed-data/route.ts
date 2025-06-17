import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import axios from 'axios'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userToken = session.accessToken
    const reportId = 'e052d0dd-d79d-4fe2-bd0b-1991c8208c33'
    const datasetId = '00a24779-bcb3-499e-8c34-25811edae686'

    console.log('🔍 Embed Data: Testing embed token approach...')

    const results = []

    // Method 1: Generate embed token for the report (this often works even with restricted datasets)
    try {
      console.log('Method 1: Generating embed token...')
      
      const embedTokenRequest = {
        datasets: [{ id: datasetId }],
        reports: [{ id: reportId }],
        accessLevel: 'View'
      }

      const embedResponse = await axios.post(
        'https://api.powerbi.com/v1.0/myorg/GenerateToken',
        embedTokenRequest,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      results.push({
        method: 'Embed Token Generation',
        success: true,
        embedToken: embedResponse.data.token,
        expiration: embedResponse.data.expiration,
        note: 'This token can be used for embedded Power BI access'
      })

    } catch (error) {
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Embed Token Generation',
          success: false,
          status: error.response?.status,
          error: error.response?.data
        })
      }
    }

    // Method 2: Try to export the report to get data
    try {
      console.log('Method 2: Export report attempt...')
      
      const exportRequest = {
        format: 'CSV'
      }

      const exportResponse = await axios.post(
        `https://api.powerbi.com/v1.0/myorg/reports/${reportId}/ExportTo`,
        exportRequest,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      results.push({
        method: 'Report Export',
        success: true,
        exportId: exportResponse.data.id,
        status: exportResponse.data.status,
        note: 'Export started - would need to poll for completion'
      })

    } catch (error) {
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Report Export',
          success: false,
          status: error.response?.status,
          error: error.response?.data
        })
      }
    }

    // Method 3: Try to get report pages (which might contain queryable visuals)
    try {
      console.log('Method 3: Getting report pages...')
      
      const pagesResponse = await axios.get(
        `https://api.powerbi.com/v1.0/myorg/reports/${reportId}/pages`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const pages = pagesResponse.data.value || []
      
      results.push({
        method: 'Report Pages',
        success: true,
        pagesCount: pages.length,
        pages: pages.map((p: any) => ({
          name: p.name,
          displayName: p.displayName,
          order: p.order
        })),
        note: 'Pages found - could potentially query visuals within pages'
      })

    } catch (error) {
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Report Pages',
          success: false,
          status: error.response?.status,
          error: error.response?.data
        })
      }
    }

    // Method 4: Alternative - Use service principal approach
    try {
      console.log('Method 4: Testing with service principal token...')
      
      // Get a service principal token
      const tokenUrl = `https://login.microsoftonline.com/${process.env.POWERBI_TENANT_ID}/oauth2/v2.0/token`
      
      const tokenData = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.POWERBI_CLIENT_ID!,
        client_secret: process.env.POWERBI_CLIENT_SECRET!,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
      })

      const tokenResponse = await axios.post(tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const serviceToken = tokenResponse.data.access_token

      // Try to access dataset with service principal
      const datasetResponse = await axios.get(`https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}/tables`, {
        headers: {
          Authorization: `Bearer ${serviceToken}`,
          'Content-Type': 'application/json',
        },
      })

      results.push({
        method: 'Service Principal Access',
        success: true,
        tables: datasetResponse.data.value,
        note: 'Service principal has different permissions than user'
      })

    } catch (error) {
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Service Principal Access',
          success: false,
          status: error.response?.status,
          error: error.response?.data
        })
      }
    }

    return NextResponse.json({
      reportId,
      datasetId,
      results,
      recommendation: 'If embed token works, we can create an embedded Power BI solution',
      alternativeApproach: 'Could also use mock data that matches your report structure'
    })

  } catch (error) {
    console.error('Embed data error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Embed data test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}