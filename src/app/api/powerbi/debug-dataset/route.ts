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

    console.log('🔍 Dataset Debug: Testing all possible dataset access methods...')

    const results = []

    // Method 1: Try to get dataset info at organization level
    try {
      console.log('Method 1: Organization dataset info...')
      const response = await axios.get(`https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      })
      results.push({
        method: 'Organization Dataset Info',
        success: true,
        data: response.data
      })
    } catch (error) {
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Organization Dataset Info', 
          success: false,
          status: error.response?.status,
          error: error.response?.data
        })
      }
    }

    // Method 2: Try to get dataset tables at organization level
    try {
      console.log('Method 2: Organization dataset tables...')
      const response = await axios.get(`https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}/tables`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      })
      results.push({
        method: 'Organization Dataset Tables',
        success: true,
        data: response.data
      })
    } catch (error) {
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Organization Dataset Tables',
          success: false,
          status: error.response?.status,
          error: error.response?.data
        })
      }
    }

    // Method 3: Check if dataset is in personal datasets
    try {
      console.log('Method 3: Personal datasets...')
      const response = await axios.get(`https://api.powerbi.com/v1.0/me/datasets`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      })
      
      const datasets = response.data.value || []
      const targetDataset = datasets.find((d: any) => d.id === datasetId)
      
      results.push({
        method: 'Personal Datasets Search',
        success: true,
        totalDatasets: datasets.length,
        targetFound: !!targetDataset,
        targetDataset: targetDataset || null,
        allDatasets: datasets.map((d: any) => ({ id: d.id, name: d.name }))
      })
    } catch (error) {
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Personal Datasets Search',
          success: false,
          status: error.response?.status,
          error: error.response?.data
        })
      }
    }

    // Method 4: Check workspaces for the dataset
    try {
      console.log('Method 4: Workspace datasets...')
      const workspacesResponse = await axios.get('https://api.powerbi.com/v1.0/myorg/groups', {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      })

      const workspaces = workspacesResponse.data.value || []
      const workspaceResults = []

      for (const workspace of workspaces) {
        try {
          const datasetsResponse = await axios.get(`https://api.powerbi.com/v1.0/myorg/groups/${workspace.id}/datasets`, {
            headers: {
              Authorization: `Bearer ${userToken}`,
              'Content-Type': 'application/json',
            },
          })

          const datasets = datasetsResponse.data.value || []
          const targetDataset = datasets.find((d: any) => d.id === datasetId)

          workspaceResults.push({
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            datasetsCount: datasets.length,
            targetFound: !!targetDataset,
            targetDataset: targetDataset || null
          })

          // If we found the dataset, try to get its tables
          if (targetDataset) {
            try {
              const tablesResponse = await axios.get(`https://api.powerbi.com/v1.0/myorg/groups/${workspace.id}/datasets/${datasetId}/tables`, {
                headers: {
                  Authorization: `Bearer ${userToken}`,
                  'Content-Type': 'application/json',
                },
              })
              
              workspaceResults[workspaceResults.length - 1].tablesAccess = {
                success: true,
                tables: tablesResponse.data.value
              }
            } catch (tablesError) {
              if (axios.isAxiosError(tablesError)) {
                workspaceResults[workspaceResults.length - 1].tablesAccess = {
                  success: false,
                  status: tablesError.response?.status,
                  error: tablesError.response?.data
                }
              }
            }
          }

        } catch (workspaceError) {
          workspaceResults.push({
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            error: 'Failed to access workspace datasets'
          })
        }
      }

      results.push({
        method: 'Workspace Dataset Search',
        success: true,
        workspaceResults
      })

    } catch (error) {
      if (axios.isAxiosError(error)) {
        results.push({
          method: 'Workspace Dataset Search',
          success: false,
          status: error.response?.status,
          error: error.response?.data
        })
      }
    }

    return NextResponse.json({
      datasetId,
      results,
      summary: 'Complete dataset access analysis'
    })

  } catch (error) {
    console.error('Dataset debug error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Dataset debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}