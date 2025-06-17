import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import PowerBIService from '@/lib/powerbi'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const session = await getAuthSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reportId } = await params
    const body = await request.json()
    const { daxQuery } = body

    if (!daxQuery) {
      return NextResponse.json({ error: 'DAX query is required' }, { status: 400 })
    }

    const powerBI = new PowerBIService()
    
    // Get the report to find its dataset
    const report = await powerBI.getReport(reportId)
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Execute the DAX query
    const result = await powerBI.executeQuery(report.datasetId, daxQuery)
    
    return NextResponse.json({
      result,
      reportId,
      datasetId: report.datasetId,
      query: daxQuery
    })
  } catch (error) {
    console.error('Error executing Power BI query:', error)
    return NextResponse.json(
      { 
        error: 'Failed to execute Power BI query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}