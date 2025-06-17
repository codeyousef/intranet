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
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'PPTX'
    const pageName = searchParams.get('page')

    console.log(`🔍 Report Export: Exporting report in ${format} format...`)

    try {
      // Export the entire report or specific page
      const exportRequest: any = {
        format: format, // PPTX, PDF, PNG, CSV, XLSX, XML, MHTML
        powerBIReportConfiguration: {
          settings: {
            includeHiddenPages: false,
            locale: 'en-US'
          }
        }
      }

      // If specific page requested, add it to the request
      if (pageName) {
        exportRequest.powerBIReportConfiguration.pages = [
          {
            pageName: pageName
          }
        ]
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

      const exportId = exportResponse.data.id
      let exportStatus = exportResponse.data.status

      // Poll for export completion (simplified version)
      let attempts = 0
      const maxAttempts = 10
      
      while (exportStatus !== 'Succeeded' && exportStatus !== 'Failed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
        
        const statusResponse = await axios.get(
          `https://api.powerbi.com/v1.0/myorg/reports/${reportId}/exports/${exportId}`,
          {
            headers: {
              Authorization: `Bearer ${userToken}`,
              'Content-Type': 'application/json',
            },
          }
        )

        exportStatus = statusResponse.data.status
        attempts++
        
        console.log(`Export attempt ${attempts}: Status = ${exportStatus}`)
      }

      if (exportStatus === 'Succeeded') {
        // Get the export file
        const fileResponse = await axios.get(
          `https://api.powerbi.com/v1.0/myorg/reports/${reportId}/exports/${exportId}/file`,
          {
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
            responseType: 'blob'
          }
        )

        // Convert blob to base64 for JSON response (in real app, you'd return the file directly)
        const buffer = Buffer.from(await fileResponse.data.arrayBuffer())
        const base64Data = buffer.toString('base64')

        return NextResponse.json({
          success: true,
          exportId,
          format,
          status: exportStatus,
          fileSize: buffer.length,
          note: 'Export completed successfully',
          downloadUrl: `/api/powerbi/download/${exportId}`, // Would need to implement this endpoint
          // For demo purposes, include first 1000 chars of base64 data
          previewData: base64Data.substring(0, 1000) + '...'
        })

      } else {
        return NextResponse.json({
          success: false,
          exportId,
          format,
          status: exportStatus,
          attempts,
          error: 'Export did not complete within timeout period'
        })
      }

    } catch (error) {
      console.error('Export error:', error)
      if (axios.isAxiosError(error)) {
        return NextResponse.json({
          success: false,
          error: 'Export failed',
          status: error.response?.status,
          details: error.response?.data
        })
      }
      throw error
    }

  } catch (error) {
    console.error('Report export error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Report export failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}