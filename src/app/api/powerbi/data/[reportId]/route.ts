import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import PowerBIService from '@/lib/powerbi'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const session = await getAuthSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reportId } = await params
    const { searchParams } = new URL(request.url)
    const tableName = searchParams.get('table')
    const summary = searchParams.get('summary') === 'true'

    const powerBI = new PowerBIService()
    const userToken = session.accessToken
    
    if (summary) {
      // Get summary data about the report
      const summaryData = await powerBI.getReportSummaryData(reportId, userToken)
      return NextResponse.json(summaryData)
    } else {
      // Get actual data from the report
      const data = await powerBI.getReportData(reportId, tableName || undefined, userToken)
      return NextResponse.json({
        data,
        count: data.length,
        reportId,
        tableName: tableName || 'default'
      })
    }
  } catch (error) {
    console.error('Error fetching Power BI data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch Power BI data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}