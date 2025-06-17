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

    console.log('🔍 Testing alternative data access methods...')

    const results = []

    // Method 1: Try to export the report data
    try {
      console.log('Method 1: Attempting to export report data...')
      const exportResponse = await axios.post(
        `https://api.powerbi.com/v1.0/me/reports/${reportId}/Export`,
        {
          format: 'CSV'
        },
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      results.push({
        method: 'Export Report',
        success: true,
        data: exportResponse.data
      })
      
    } catch (error) {
      console.log('Export failed:', error)
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Export Report',
          success: false,
          error: error.response?.data || error.message,
          status: error.response?.status
        })
      }
    }

    // Method 2: Try to get report pages and visuals
    try {
      console.log('Method 2: Getting report pages...')
      const pagesResponse = await axios.get(
        `https://api.powerbi.com/v1.0/me/reports/${reportId}/pages`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      results.push({
        method: 'Report Pages',
        success: true,
        data: pagesResponse.data
      })
      
    } catch (error) {
      console.log('Pages failed:', error)
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Report Pages',
          success: false,
          error: error.response?.data || error.message,
          status: error.response?.status
        })
      }
    }

    // Method 3: Try to get available datasets that we DO have access to
    try {
      console.log('Method 3: Getting accessible datasets...')
      const datasetsResponse = await axios.get(
        `https://api.powerbi.com/v1.0/me/datasets`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      results.push({
        method: 'Accessible Datasets',
        success: true,
        data: datasetsResponse.data
      })
      
    } catch (error) {
      console.log('Datasets failed:', error)
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Accessible Datasets',
          success: false,
          error: error.response?.data || error.message,
          status: error.response?.status
        })
      }
    }

    // Method 4: Try workspace-based access
    try {
      console.log('Method 4: Getting workspaces...')
      const workspacesResponse = await axios.get(
        `https://api.powerbi.com/v1.0/me/groups`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      results.push({
        method: 'Workspaces',
        success: true,
        data: workspacesResponse.data
      })
      
    } catch (error) {
      console.log('Workspaces failed:', error)
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Workspaces',
          success: false,
          error: error.response?.data || error.message,
          status: error.response?.status
        })
      }
    }

    return NextResponse.json({
      reportId,
      issue: 'Dataset access denied - testing alternative methods',
      results,
      recommendation: 'May need to use embedded reports or request dataset permissions'
    })

  } catch (error) {
    console.error('Export test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Export test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}