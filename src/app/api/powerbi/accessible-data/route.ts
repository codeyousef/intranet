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

    console.log('🔍 Accessible Data: Testing all possible data access methods...')

    const results = []

    // Method 1: Simple report export with different formats
    const exportFormats = ['CSV', 'XLSX', 'PDF', 'PPTX']
    
    for (const format of exportFormats) {
      try {
        console.log(`Testing export format: ${format}`)
        
        const exportResponse = await axios.post(
          `https://api.powerbi.com/v1.0/myorg/reports/${reportId}/ExportTo`,
          { format },
          {
            headers: {
              Authorization: `Bearer ${userToken}`,
              'Content-Type': 'application/json',
            },
          }
        )

        results.push({
          method: `Export ${format}`,
          success: true,
          exportId: exportResponse.data.id,
          status: exportResponse.data.status,
          note: `${format} export initiated successfully`
        })

      } catch (error) {
        if (axios.isAxiosError(error)) {
          results.push({
            method: `Export ${format}`,
            success: false,
            status: error.response?.status,
            error: error.response?.data,
            note: `${format} export failed`
          })
        }
      }
    }

    // Method 2: Try to get report clone/copy
    try {
      console.log('Testing report clone access...')
      
      const cloneResponse = await axios.post(
        `https://api.powerbi.com/v1.0/myorg/reports/${reportId}/Clone`,
        {
          name: 'Temp Clone for Data Access',
          targetWorkspaceId: null // Clone to same workspace
        },
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      results.push({
        method: 'Report Clone',
        success: true,
        clonedReportId: cloneResponse.data.id,
        note: 'Successfully cloned report - could use this for data access'
      })

    } catch (error) {
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Report Clone',
          success: false,
          status: error.response?.status,
          error: error.response?.data,
          note: 'Report cloning failed'
        })
      }
    }

    // Method 3: Try different report access patterns
    try {
      console.log('Testing report metadata access...')
      
      const metadataResponse = await axios.get(
        `https://api.powerbi.com/v1.0/myorg/reports/${reportId}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      results.push({
        method: 'Report Metadata',
        success: true,
        data: {
          id: metadataResponse.data.id,
          name: metadataResponse.data.name,
          datasetId: metadataResponse.data.datasetId,
          isOwnedByMe: metadataResponse.data.isOwnedByMe,
          isReadOnly: metadataResponse.data.isReadOnly,
          embedUrl: metadataResponse.data.embedUrl
        },
        note: 'Report metadata accessible - contains embed URL'
      })

    } catch (error) {
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Report Metadata',
          success: false,
          status: error.response?.status,
          error: error.response?.data
        })
      }
    }

    // Method 4: Try to get report datasources
    try {
      console.log('Testing datasources access...')
      
      const datasourcesResponse = await axios.get(
        `https://api.powerbi.com/v1.0/myorg/reports/${reportId}/datasources`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      results.push({
        method: 'Report Datasources',
        success: true,
        datasources: datasourcesResponse.data.value,
        note: 'Datasources information available'
      })

    } catch (error) {
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Report Datasources',
          success: false,
          status: error.response?.status,
          error: error.response?.data
        })
      }
    }

    // Method 5: Check if we can create embed tokens for read-only access
    try {
      console.log('Testing embed token for read-only access...')
      
      const embedTokenResponse = await axios.post(
        `https://api.powerbi.com/v1.0/myorg/reports/${reportId}/GenerateToken`,
        {
          accessLevel: 'View',
          allowSaveAs: false
        },
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      results.push({
        method: 'Embed Token (View Only)',
        success: true,
        tokenAvailable: true,
        expiration: embedTokenResponse.data.expiration,
        note: 'Embed token generated - could embed report directly'
      })

    } catch (error) {
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Embed Token (View Only)',
          success: false,
          status: error.response?.status,
          error: error.response?.data,
          note: 'Embed token generation failed'
        })
      }
    }

    return NextResponse.json({
      reportId,
      summary: `Tested ${results.length} different access methods`,
      results,
      recommendations: {
        ifExportWorks: 'Use report export to get processed data',
        ifEmbedWorks: 'Embed the actual Power BI report in iframe',
        ifNothingWorks: 'Use demo version with mock data matching report structure'
      }
    })

  } catch (error) {
    console.error('Accessible data test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Accessible data test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}