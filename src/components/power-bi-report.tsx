'use client'

import { useState, useEffect } from 'react'
import { GlassmorphismContainer } from './glassmorphism-container'

interface PowerBIReportProps {
  reportId: string
  className?: string
}

interface ReportData {
  report: {
    id: string
    name: string
    embedUrl: string
    datasetId: string
  }
  embedToken: string
}

export function PowerBIReport({ reportId, className = '' }: PowerBIReportProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const response = await fetch(`/api/powerbi/report/${reportId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch report data')
        }

        const data = await response.json()
        setReportData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [reportId])

  if (loading) {
    return (
      <GlassmorphismContainer className={`p-8 ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flyadeal-yellow"></div>
          <span className="ml-4 text-white">Loading Power BI report...</span>
        </div>
      </GlassmorphismContainer>
    )
  }

  if (error) {
    return (
      <GlassmorphismContainer className={`p-8 ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-flyadeal-red text-lg font-semibold mb-2">
              Error Loading Report
            </div>
            <div className="text-white/70">
              {error}
            </div>
          </div>
        </div>
      </GlassmorphismContainer>
    )
  }

  if (!reportData) {
    return (
      <GlassmorphismContainer className={`p-8 ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-white/70">
            No report data available
          </div>
        </div>
      </GlassmorphismContainer>
    )
  }

  return (
    <GlassmorphismContainer className={className}>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-4 font-raleway">
          {reportData.report.name || 'Power BI Report'}
        </h3>
        <div className="w-full h-[600px] rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
          <div className="text-center text-white/70">
            <p className="mb-2">Power BI Report Integration</p>
            <p className="text-sm">Report ID: {reportId}</p>
            <p className="text-xs mt-4">
              Configure Power BI credentials in .env.local to view the embedded report
            </p>
          </div>
        </div>
      </div>
    </GlassmorphismContainer>
  )
}