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

    console.log('🔍 Visual Data: Extracting data from report visuals...')

    // First, get all pages in the report
    const pagesResponse = await axios.get(`https://api.powerbi.com/v1.0/myorg/reports/${reportId}/pages`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
    })

    const pages = pagesResponse.data.value || []
    const results = []

    // For each page, try to get the visuals
    for (const page of pages) {
      try {
        console.log(`Getting visuals for page: ${page.displayName}`)
        
        const visualsResponse = await axios.get(`https://api.powerbi.com/v1.0/myorg/reports/${reportId}/pages/${page.name}/visuals`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        })

        const visuals = visualsResponse.data.value || []
        const pageResult = {
          pageName: page.displayName,
          pageId: page.name,
          visualsCount: visuals.length,
          visuals: []
        }

        // For each visual, try to export its data
        for (const visual of visuals.slice(0, 3)) { // Limit to first 3 visuals per page
          try {
            console.log(`Exporting data for visual: ${visual.name}`)
            
            const exportRequest = {
              format: 'CSV',
              visualId: visual.name
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

            pageResult.visuals.push({
              visualId: visual.name,
              visualType: visual.type,
              title: visual.title,
              exportSuccess: true,
              exportId: exportResponse.data.id,
              status: exportResponse.data.status
            })

          } catch (visualError) {
            console.log(`Failed to export visual ${visual.name}:`, visualError)
            if (axios.isAxiosError(visualError)) {
              pageResult.visuals.push({
                visualId: visual.name,
                visualType: visual.type,
                title: visual.title,
                exportSuccess: false,
                error: visualError.response?.data,
                status: visualError.response?.status
              })
            }
          }
        }

        results.push(pageResult)

      } catch (pageError) {
        console.log(`Failed to get visuals for page ${page.displayName}:`, pageError)
        results.push({
          pageName: page.displayName,
          pageId: page.name,
          error: 'Failed to access page visuals',
          errorDetails: axios.isAxiosError(pageError) ? pageError.response?.data : pageError
        })
      }
    }

    return NextResponse.json({
      reportId,
      pagesProcessed: pages.length,
      results,
      note: 'This approach extracts data from individual report visuals rather than the underlying dataset'
    })

  } catch (error) {
    console.error('Visual data extraction error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Visual data extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}