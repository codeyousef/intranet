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
    const reportId = 'e052d0dd-d79d-4fe2-bd0b-1991c8208c33'

    console.log('🔍 Debug: Starting detailed Power BI data access test...')

    // Step 1: Get the report
    console.log('📊 Step 1: Getting report details...')
    const report = await powerBI.getReport(reportId, userToken)
    
    if (!report) {
      return NextResponse.json({
        success: false,
        step: 1,
        error: 'Report not found',
        reportId
      })
    }

    console.log('✅ Report found:', report.name, 'Dataset ID:', report.datasetId)

    // Step 2: Try to get dataset tables
    console.log('📋 Step 2: Getting dataset tables...')
    try {
      const tables = await powerBI.getDatasetTables(report.datasetId, userToken)
      console.log('✅ Tables found:', tables.length, 'tables')
      
      // Step 3: Try a simple query on the first table
      if (tables.length > 0) {
        console.log('🎯 Step 3: Testing simple query on first table...')
        const firstTable = tables[0]
        console.log('First table:', firstTable.name)
        
        try {
          // Try a very simple query first
          const simpleQuery = `EVALUATE TOPN(1, ${firstTable.name})`
          console.log('Executing query:', simpleQuery)
          
          const result = await powerBI.executeQuery(report.datasetId, simpleQuery, userToken)
          console.log('✅ Query successful!')
          
          return NextResponse.json({
            success: true,
            report: {
              id: report.id,
              name: report.name,
              datasetId: report.datasetId
            },
            tables: tables.map(t => ({
              name: t.name,
              columns: t.columns?.length || 0
            })),
            queryTest: 'SUCCESS',
            sampleResult: result
          })
          
        } catch (queryError) {
          console.error('❌ Query failed:', queryError)
          return NextResponse.json({
            success: false,
            step: 3,
            error: 'Query execution failed',
            report: {
              id: report.id,
              name: report.name,
              datasetId: report.datasetId
            },
            tables: tables.map(t => ({
              name: t.name,
              columns: t.columns?.length || 0
            })),
            queryError: queryError instanceof Error ? queryError.message : 'Unknown query error'
          })
        }
      } else {
        return NextResponse.json({
          success: false,
          step: 2,
          error: 'No tables found in dataset',
          report: {
            id: report.id,
            name: report.name,
            datasetId: report.datasetId
          },
          tables: []
        })
      }
      
    } catch (tablesError) {
      console.error('❌ Failed to get tables:', tablesError)
      return NextResponse.json({
        success: false,
        step: 2,
        error: 'Failed to get dataset tables',
        report: {
          id: report.id,
          name: report.name,
          datasetId: report.datasetId
        },
        tablesError: tablesError instanceof Error ? tablesError.message : 'Unknown tables error'
      })
    }

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { 
        success: false,
        step: 0,
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}