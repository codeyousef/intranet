'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Navigation } from '@/components/navigation'
import { GlassmorphismContainer } from '@/components/glassmorphism-container'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3, RefreshCw, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function PowerBILivePage() {
  const { data: session, status } = useSession()
  const [selectedPage, setSelectedPage] = useState('ReportSection') // "Today" page
  const [isLoading, setIsLoading] = useState(false)

  const reportId = 'e052d0dd-d79d-4fe2-bd0b-1991c8208c33'
  const reportPages = [
    { name: 'ReportSection', displayName: 'Today', order: 0 },
    { name: 'ReportSection7d7173903aa9b78987d8', displayName: 'Delay', order: 1 },
    { name: 'ReportSectiona9d64125015aaa9de540', displayName: 'Retime', order: 2 },
    { name: 'ReportSectionb1259889bada9b6865e5', displayName: 'Turnaround Details', order: 3 },
    { name: '5b634d5d395ecff9fe01', displayName: 'Page 1', order: 4 }
  ]

  // Sort pages by order
  const sortedPages = reportPages.sort((a, b) => a.order - b.order)

  const refreshReport = () => {
    setIsLoading(true)
    // Simulate refresh
    setTimeout(() => setIsLoading(false), 1000)
  }

  const openInPowerBI = () => {
    window.open(`https://app.powerbi.com/reports/${reportId}`, '_blank')
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
            You need to be signed in to view the live Power BI report.
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
              <Link href="/powerbi-data">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white font-raleway flex items-center">
                  <BarChart3 className="mr-3" size={28} />
                  F3 Live Operations Report
                </h1>
                <p className="text-white/70">
                  Live Power BI report with real-time flight operations data
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={refreshReport}
                variant="outline"
                disabled={isLoading}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={openInPowerBI}
                className="bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Power BI
              </Button>
            </div>
          </div>

          {/* Page Navigation */}
          <GlassmorphismContainer className="p-4 mb-6">
            <div className="flex items-center space-x-2 overflow-x-auto">
              <span className="text-white/70 text-sm font-medium mr-3 whitespace-nowrap">Report Pages:</span>
              {sortedPages.map((page) => (
                <Button
                  key={page.name}
                  onClick={() => setSelectedPage(page.name)}
                  variant={selectedPage === page.name ? "default" : "ghost"}
                  size="sm"
                  className={`whitespace-nowrap ${
                    selectedPage === page.name
                      ? 'bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {page.displayName}
                </Button>
              ))}
            </div>
          </GlassmorphismContainer>

          {/* Power BI Report Embed */}
          <GlassmorphismContainer className="p-6">
            <div className="relative">
              {/* Notice about data access */}
              <div className="mb-4 p-4 bg-flyadeal-yellow/20 border border-flyadeal-yellow/40 rounded-lg">
                <div className="flex items-start space-x-3">
                  <BarChart3 className="w-5 h-5 text-flyadeal-yellow mt-0.5" />
                  <div>
                    <h3 className="text-flyadeal-yellow font-semibold text-sm mb-1">Live Report Access</h3>
                    <p className="text-white/90 text-sm">
                      This is your actual <strong>F3 Live Operations</strong> Power BI report. 
                      While we can access the report structure, direct data extraction requires additional dataset permissions.
                    </p>
                    <p className="text-white/70 text-xs mt-2">
                      Current page: <strong>{sortedPages.find(p => p.name === selectedPage)?.displayName}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Report Embed Container */}
              <div className="bg-white rounded-lg p-4" style={{ height: '600px' }}>
                <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Power BI Report: {sortedPages.find(p => p.name === selectedPage)?.displayName}
                    </h3>
                    <p className="text-gray-600 mb-4 max-w-md">
                      To display the live Power BI report here, we need to configure embed tokens with proper dataset permissions.
                    </p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <p><strong>Report ID:</strong> {reportId}</p>
                      <p><strong>Current Page:</strong> {selectedPage}</p>
                      <p><strong>Total Pages:</strong> {sortedPages.length}</p>
                    </div>
                    <div className="mt-6">
                      <Button
                        onClick={openInPowerBI}
                        className="bg-flyadeal-purple text-white hover:bg-flyadeal-purple/90"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View in Power BI
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alternative: Show demo with similar structure */}
              <div className="mt-4 text-center">
                <Link href="/powerbi-demo">
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    View Demo with Sample Data
                  </Button>
                </Link>
              </div>
            </div>
          </GlassmorphismContainer>

          {/* Report Information */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassmorphismContainer className="p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Report Structure
              </h3>
              <div className="space-y-2">
                {sortedPages.map((page, index) => (
                  <div
                    key={page.name}
                    className={`p-3 rounded-lg border ${
                      selectedPage === page.name
                        ? 'bg-flyadeal-yellow/20 border-flyadeal-yellow/40 text-flyadeal-yellow'
                        : 'bg-white/5 border-white/10 text-white/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{page.displayName}</span>
                      <span className="text-xs opacity-70">Page {index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassmorphismContainer>

            <GlassmorphismContainer className="p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <ExternalLink className="w-5 h-5 mr-2" />
                Access Options
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                  <h4 className="text-white font-medium mb-1">Direct Power BI Access</h4>
                  <p className="text-white/70 text-sm mb-3">
                    Open the report directly in Power BI with full interactivity.
                  </p>
                  <Button
                    onClick={openInPowerBI}
                    size="sm"
                    className="bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/90"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Report
                  </Button>
                </div>
                
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                  <h4 className="text-white font-medium mb-1">Demo Version</h4>
                  <p className="text-white/70 text-sm mb-3">
                    View a styled demo with sample flight operations data.
                  </p>
                  <Link href="/powerbi-demo">
                    <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Demo
                    </Button>
                  </Link>
                </div>
              </div>
            </GlassmorphismContainer>
          </div>
        </div>
      </main>
    </div>
  )
}