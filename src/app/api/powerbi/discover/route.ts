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
    const targetReportId = 'e052d0dd-d79d-4fe2-bd0b-1991c8208c33'

    console.log('🔍 Discovery: Finding all accessible content...')

    const results = {
      personalReports: [],
      workspaces: [],
      allReports: [],
      targetReportFound: false,
      targetReportLocation: null
    }

    // 1. Check personal reports
    try {
      console.log('Checking personal reports...')
      const personalResponse = await axios.get('https://api.powerbi.com/v1.0/me/reports', {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      })
      
      results.personalReports = personalResponse.data.value?.map((r: any) => ({
        id: r.id,
        name: r.name,
        datasetId: r.datasetId,
        isOwnedByMe: r.isOwnedByMe
      })) || []

      // Check if target report is in personal reports
      const targetInPersonal = results.personalReports.find((r: any) => r.id === targetReportId)
      if (targetInPersonal) {
        results.targetReportFound = true
        results.targetReportLocation = { type: 'personal', report: targetInPersonal }
      }

    } catch (error) {
      console.log('Personal reports failed:', error)
      results.personalReports = []
    }

    // 2. Get all workspaces
    try {
      console.log('Getting workspaces...')
      const workspacesResponse = await axios.get('https://api.powerbi.com/v1.0/myorg/groups', {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      })

      const workspaces = workspacesResponse.data.value || []
      console.log(`Found ${workspaces.length} workspaces`)

      // 3. Check reports in each workspace
      for (const workspace of workspaces) {
        const workspaceInfo = {
          id: workspace.id,
          name: workspace.name,
          type: workspace.type,
          reports: []
        }

        try {
          console.log(`Checking reports in workspace: ${workspace.name}`)
          const reportsResponse = await axios.get(`https://api.powerbi.com/v1.0/myorg/groups/${workspace.id}/reports`, {
            headers: {
              Authorization: `Bearer ${userToken}`,
              'Content-Type': 'application/json',
            },
          })

          const reports = reportsResponse.data.value?.map((r: any) => ({
            id: r.id,
            name: r.name,
            datasetId: r.datasetId,
            isOwnedByMe: r.isOwnedByMe
          })) || []

          workspaceInfo.reports = reports
          results.allReports.push(...reports.map((r: any) => ({ ...r, workspaceId: workspace.id, workspaceName: workspace.name })))

          // Check if target report is in this workspace
          const targetInWorkspace = reports.find((r: any) => r.id === targetReportId)
          if (targetInWorkspace) {
            results.targetReportFound = true
            results.targetReportLocation = { 
              type: 'workspace', 
              workspaceId: workspace.id,
              workspaceName: workspace.name,
              report: targetInWorkspace 
            }
          }

        } catch (workspaceError) {
          console.log(`Failed to get reports from workspace ${workspace.name}:`, workspaceError)
          workspaceInfo.reports = []
        }

        results.workspaces.push(workspaceInfo)
      }

    } catch (error) {
      console.log('Workspaces failed:', error)
      results.workspaces = []
    }

    // 4. Try organization-level reports as fallback
    if (!results.targetReportFound) {
      try {
        console.log('Trying organization reports...')
        const orgReportsResponse = await axios.get('https://api.powerbi.com/v1.0/myorg/reports', {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        })

        const orgReports = orgReportsResponse.data.value?.map((r: any) => ({
          id: r.id,
          name: r.name,
          datasetId: r.datasetId,
          isOwnedByMe: r.isOwnedByMe
        })) || []

        const targetInOrg = orgReports.find((r: any) => r.id === targetReportId)
        if (targetInOrg) {
          results.targetReportFound = true
          results.targetReportLocation = { type: 'organization', report: targetInOrg }
        }

      } catch (error) {
        console.log('Organization reports failed:', error)
      }
    }

    return NextResponse.json({
      targetReportId,
      summary: {
        personalReportsCount: results.personalReports.length,
        workspacesCount: results.workspaces.length,
        totalReportsFound: results.allReports.length,
        targetReportFound: results.targetReportFound
      },
      targetReportLocation: results.targetReportLocation,
      personalReports: results.personalReports,
      workspaces: results.workspaces,
      allReports: results.allReports.slice(0, 20) // Limit for readability
    })

  } catch (error) {
    console.error('Discovery error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Discovery failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}