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

    console.log('🔍 Testing dataset access...')

    // Test datasets access
    try {
      const datasetsResponse = await axios.get('https://api.powerbi.com/v1.0/me/datasets', {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('✅ Personal datasets accessible')
      
      return NextResponse.json({
        success: true,
        personalDatasets: datasetsResponse.data.value?.map((d: any) => ({
          id: d.id,
          name: d.name,
          isRefreshable: d.isRefreshable,
          isOnPremGatewayRequired: d.isOnPremGatewayRequired
        })) || []
      })

    } catch (datasetError) {
      console.error('❌ Personal datasets failed, trying organization datasets')
      
      try {
        const orgDatasetsResponse = await axios.get('https://api.powerbi.com/v1.0/myorg/datasets', {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        })

        console.log('✅ Organization datasets accessible')
        
        return NextResponse.json({
          success: true,
          personalDatasets: [],
          organizationDatasets: orgDatasetsResponse.data.value?.map((d: any) => ({
            id: d.id,
            name: d.name,
            isRefreshable: d.isRefreshable,
            isOnPremGatewayRequired: d.isOnPremGatewayRequired
          })) || [],
          note: 'Personal datasets failed, using organization datasets'
        })

      } catch (orgError) {
        console.error('❌ Both personal and organization datasets failed')
        
        return NextResponse.json({
          success: false,
          error: 'Cannot access datasets',
          personalError: axios.isAxiosError(datasetError) ? datasetError.response?.data : 'Unknown error',
          organizationError: axios.isAxiosError(orgError) ? orgError.response?.data : 'Unknown error'
        })
      }
    }

  } catch (error) {
    console.error('Dataset test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Dataset test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}