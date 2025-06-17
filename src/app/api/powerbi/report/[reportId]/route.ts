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
    const powerBI = new PowerBIService()
    
    // Get the specific report details
    const report = await powerBI.getReport(reportId)
    
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Get embed token for this specific report
    const embedToken = await powerBI.getEmbedToken(reportId, report.datasetId)

    return NextResponse.json({
      report,
      embedToken,
      embedUrl: report.embedUrl
    })
  } catch (error) {
    console.error('Error fetching report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    )
  }
}