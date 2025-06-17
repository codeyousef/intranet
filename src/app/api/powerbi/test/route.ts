import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import PowerBIService from '@/lib/powerbi'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const powerBI = new PowerBIService()
    const userToken = session.accessToken
    
    // Test authentication
    console.log('Testing Power BI authentication with user token...')
    const token = await powerBI.getAccessToken(userToken)
    console.log('✅ Authentication successful')
    
    // Test getting reports
    console.log('Testing personal reports access...')
    const reports = await powerBI.getReports(userToken)
    console.log(`✅ Found ${reports.length} reports`)
    
    // Look for your specific report
    const yourReport = reports.find(r => r.id === 'e052d0dd-d79d-4fe2-bd0b-1991c8208c33')
    
    return NextResponse.json({
      success: true,
      authenticated: true,
      reportsCount: reports.length,
      yourReportFound: !!yourReport,
      yourReport: yourReport || null,
      allReports: reports.map(r => ({
        id: r.id,
        name: r.name,
        datasetId: r.datasetId
      }))
    })
    
  } catch (error) {
    console.error('Power BI test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Power BI connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}