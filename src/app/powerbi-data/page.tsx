'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Navigation } from '@/components/navigation'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import { DataTable } from '@/components/data-table'
import { DataCharts } from '@/components/data-charts'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Database, BarChart3, Table, Loader2, AlertCircle, ExternalLink, Eye } from 'lucide-react'
import Link from 'next/link'

interface PowerBIData {
  data: any[][]
  columns: string[]
  count: number
  reportId: string
  tableName: string
}

interface PowerBISummary {
  totalRows: number
  tables: string[]
  sampleData: any[]
  columns: string[]
}

export default function PowerBIDataPage() {
  const { data: session, status } = useSession()
  const [data, setData] = useState<PowerBIData | null>(null)
  const [summary, setSummary] = useState<PowerBISummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'charts' | 'table'>('charts')
  const [selectedTable, setSelectedTable] = useState<string>('')

  const REPORT_ID = 'e052d0dd-d79d-4fe2-bd0b-1991c8208c33'

  useEffect(() => {
    if (session) {
      fetchSummary()
    }
  }, [session])

  const fetchSummary = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/powerbi/data/${REPORT_ID}?summary=true`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Failed to fetch Power BI summary')
      }
      
      const summaryData = await response.json()
      setSummary(summaryData)
      
      // If there are tables, automatically load the first one
      if (summaryData.tables && summaryData.tables.length > 0) {
        setSelectedTable(summaryData.tables[0])
        fetchData(summaryData.tables[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async (tableName?: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const url = tableName 
        ? `/api/powerbi/data/${REPORT_ID}?table=${encodeURIComponent(tableName)}`
        : `/api/powerbi/data/${REPORT_ID}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Failed to fetch Power BI data')
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flyadeal-yellow"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassmorphismContainer className="max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-white/70 mb-6">
            You need to be signed in to view Power BI data.
          </p>
          <Link href="/">
            <Button className="w-full">
              Go to Login
            </Button>
          </Link>
        </GlassmorphismContainer>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-24 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Link href="/reports">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white font-raleway flex items-center">
                  <Database className="mr-3" size={28} />
                  Power BI Data Visualization
                </h1>
                <p className="text-white/70">
                  Custom analysis of your Power BI report data
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <Link href="/powerbi-live">
                <Button className="bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90">
                  <Eye className="w-4 h-4 mr-2" />
                  View Live Report
                </Button>
              </Link>
              
              {/* View Toggle */}
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg p-1">
                <Button
                  variant={view === 'charts' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('charts')}
                  className={view === 'charts' ? 'bg-flyadeal-yellow text-flyadeal-purple' : 'text-white hover:bg-white/10'}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Charts
                </Button>
                <Button
                  variant={view === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('table')}
                  className={view === 'table' ? 'bg-flyadeal-yellow text-flyadeal-purple' : 'text-white hover:bg-white/10'}
                >
                  <Table className="w-4 h-4 mr-2" />
                  Table
                </Button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <GlassmorphismContainer className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-flyadeal-yellow mx-auto mb-4" />
              <p className="text-white/70">Loading Power BI data...</p>
            </GlassmorphismContainer>
          )}

          {/* Error State */}
          {error && (
            <GlassmorphismContainer className="p-6 border-flyadeal-red/40">
              <div className="flex items-center space-x-3 text-flyadeal-red">
                <AlertCircle className="w-6 h-6" />
                <div>
                  <h3 className="font-semibold">Error Loading Data</h3>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={fetchSummary} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </GlassmorphismContainer>
          )}

          {/* Summary Cards */}
          {summary && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <GlassmorphismContainer className="p-4 text-center">
                <div className="text-2xl font-bold text-flyadeal-yellow">
                  {summary.totalRows.toLocaleString()}
                </div>
                <div className="text-white/70 text-sm">Total Rows</div>
              </GlassmorphismContainer>
              
              <GlassmorphismContainer className="p-4 text-center">
                <div className="text-2xl font-bold text-flyadeal-light-blue">
                  {summary.tables.length}
                </div>
                <div className="text-white/70 text-sm">Tables</div>
              </GlassmorphismContainer>
              
              <GlassmorphismContainer className="p-4 text-center">
                <div className="text-2xl font-bold text-flyadeal-green">
                  {summary.columns.length}
                </div>
                <div className="text-white/70 text-sm">Columns</div>
              </GlassmorphismContainer>
              
              <GlassmorphismContainer className="p-4 text-center">
                <div className="text-2xl font-bold text-flyadeal-pink">
                  {data?.count || 0}
                </div>
                <div className="text-white/70 text-sm">Loaded Rows</div>
              </GlassmorphismContainer>
            </div>
          )}

          {/* Table Selector */}
          {summary && summary.tables.length > 1 && (
            <GlassmorphismContainer className="p-4 mb-6">
              <h3 className="text-white font-medium mb-3">Select Table:</h3>
              <div className="flex flex-wrap gap-2">
                {summary.tables.map((tableName) => (
                  <Button
                    key={tableName}
                    variant={selectedTable === tableName ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedTable(tableName)
                      fetchData(tableName)
                    }}
                    className={selectedTable === tableName ? 'bg-flyadeal-yellow text-flyadeal-purple' : ''}
                  >
                    {tableName}
                  </Button>
                ))}
              </div>
            </GlassmorphismContainer>
          )}

          {/* Data Visualization */}
          {data && !loading && (
            <>
              {view === 'charts' ? (
                <DataCharts
                  data={data.data}
                  columns={summary?.columns || []}
                  title="Data Analysis"
                />
              ) : (
                <DataTable
                  data={data.data}
                  columns={summary?.columns || []}
                  title={`${selectedTable || 'Data'} Table`}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}