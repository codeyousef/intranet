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
    const datasetId = '00a24779-bcb3-499e-8c34-25811edae686'

    console.log('🔍 Debug: Testing dataset tables access...')
    console.log('Dataset ID:', datasetId)
    console.log('User token length:', userToken?.length)

    // Try different endpoints to access the dataset tables
    const endpoints = [
      `https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}/tables`,
      `https://api.powerbi.com/v1.0/me/datasets/${datasetId}/tables`,
      `https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}`,
      `https://api.powerbi.com/v1.0/me/datasets/${datasetId}`
    ]

    const results = []

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying: ${endpoint}`)
        const response = await axios.get(endpoint, {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        })

        results.push({
          endpoint,
          success: true,
          status: response.status,
          data: response.data
        })
        console.log(`✅ Success: ${endpoint}`)
        
      } catch (error) {
        console.log(`❌ Failed: ${endpoint}`)
        if (axios.isAxiosError(error)) {
          console.log('Response status:', error.response?.status)
          console.log('Response data:', error.response?.data)
          results.push({
            endpoint,
            success: false,
            status: error.response?.status,
            error: error.response?.data || error.message
          })
        } else {
          results.push({
            endpoint,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    return NextResponse.json({
      datasetId,
      results,
      summary: `Tested ${endpoints.length} endpoints`
    })

  } catch (error) {
    console.error('Debug tables error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Debug tables failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}