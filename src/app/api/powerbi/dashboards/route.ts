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
    const dashboards = await powerBI.getDashboards()

    return NextResponse.json(dashboards)
  } catch (error) {
    console.error('Error fetching dashboards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboards' },
      { status: 500 }
    )
  }
}